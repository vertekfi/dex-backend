import { Contract } from '@ethersproject/contracts';
import { commify, formatEther } from '@ethersproject/units';
import { Inject, Injectable } from '@nestjs/common';
import { RewardPool } from 'src/graphql';
import { CacheService } from '../common/cache.service';
import { TokenPriceService } from '../common/token/token-price.service';
import { AccountWeb3 } from '../common/types';
import { ContractService } from '../common/web3/contract.service';
import { Multicaller } from '../common/web3/multicaller';
import { RPC } from '../common/web3/rpc.provider';
import { getProtocolConfigDataForChain } from '../protocol/utils';
import { BLOCKS_PER_DAY } from '../utils/blocks';
import * as poolAbi from './abis/RewardPool.json';
import * as erc20Abi from '../common/web3/abi/ERC20.json';
import { BigNumber } from 'ethers';
import { convertToFormatEthNumber } from '../common/web3/utils';

const REWARD_POOL_KEY = 'REWARD_POOL_KEY';

interface RewardPoolMulicalResult {
  rewardPerBlock: BigNumber;
  startBlock: BigNumber;
  bonusEndBlock: BigNumber;
}

@Injectable()
export class RewardPoolService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private pricing: TokenPriceService,
    private cache: CacheService,
    private contracts: ContractService,
  ) {}

  async getPools(): Promise<RewardPool[]> {
    const cached = await this.cache.get<RewardPool[]>(REWARD_POOL_KEY);
    if (cached) {
      return cached;
    }

    const { rewardPools } = await getProtocolConfigDataForChain(this.rpc.chainId);
    const pools = await this.getPoolInfo(rewardPools);
    await this.cache.set(REWARD_POOL_KEY, pools, 30);
    return pools;
  }

  private async getPoolInfo(pools: RewardPool[]): Promise<RewardPool[]> {
    // get block and price once
    const [blockNumber, tokenPrice] = await Promise.all([
      this.rpc.provider.getBlockNumber(),
      this.pricing.getProtocolTokenPrice(),
    ]);
    const protocolToken = this.contracts.getProtocolToken();
    const protocolTokenPrice = Number(tokenPrice);

    const poolDataMulticall = new Multicaller(this.rpc, poolAbi);
    const balancesMulticall = new Multicaller(this.rpc, erc20Abi);

    for (const pool of pools) {
      poolDataMulticall.call(`${pool.address}.rewardPerBlock`, pool.address, 'rewardPerBlock');
      poolDataMulticall.call(`${pool.address}.startBlock`, pool.address, 'startBlock');
      poolDataMulticall.call(`${pool.address}.bonusEndBlock`, pool.address, 'bonusEndBlock');
      balancesMulticall.call(`${pool.address}.balanceOf`, protocolToken.address, 'balanceOf', [
        pool.address,
      ]);
    }

    let poolsOnChainData = {} as Record<string, RewardPoolMulicalResult>;
    // keep as an object instead of array then for quick lookup below then
    let balancesOnChainData = {} as Record<string, { balanceOf: BigNumber }>;
    try {
      [poolsOnChainData, balancesOnChainData] = await Promise.all([
        poolDataMulticall.execute(),
        balancesMulticall.execute(),
      ]);
    } catch (err: any) {
      console.error(err);
      throw `Issue with multicall execution. ${err}`;
    }

    const poolsOnChainDataArray = Object.entries(poolsOnChainData);
    const dataPools: RewardPool[] = [];

    let i = 0;
    for (const results of poolsOnChainDataArray) {
      const [address, data] = poolsOnChainDataArray[i];
      const pool = pools.find((p) => p.address === address);

      // set balances
      const poolTokenBalance = balancesOnChainData[pool.address];
      const totalDeposits = formatEther(poolTokenBalance.balanceOf);
      const totalDepositsNum = Number(totalDeposits);
      pool.amountStaked = totalDepositsNum.toFixed(2);
      pool.amountStakedValue = Number(totalDepositsNum * protocolTokenPrice).toFixed(4);

      // remaining time
      pool.startBlock = data.startBlock.toNumber();
      pool.endBlock = data.bonusEndBlock.toNumber();
      const blocksRemaining = pool.endBlock - blockNumber;
      pool.blocksRemaining = blocksRemaining > 0 ? commify(blocksRemaining) : '0';

      // reward info
      const rewardPerBlock = convertToFormatEthNumber(data.rewardPerBlock);
      const rewardTokenPrice = await this.pricing.tryCachePriceForToken(pool.rewardToken.address);
      pool.aprs = this.getRewardRates(rewardTokenPrice, rewardPerBlock, Number(pool.amountStaked));

      pool.isPartnerPool = pool.isPartnerPool || false;

      dataPools.push({
        ...pool,
      });

      i++;
    }

    return dataPools;
  }

  private getRewardRates(price: number, rewardPerBlock: number, totalDeposits: number) {
    totalDeposits = totalDeposits > 0 ? totalDeposits : 1;

    const amountPerDay = rewardPerBlock * BLOCKS_PER_DAY[this.rpc.chainId];
    const amountPerYear = amountPerDay * 365;
    const valuePerDay = price * amountPerYear;
    const valuePerYear = valuePerDay * 365;
    const apr = valuePerYear / totalDeposits;
    const daily = apr / 365;

    return {
      daily: commify(daily.toFixed(2)),
      apr: commify(apr.toFixed(2)),
    };
  }
}
