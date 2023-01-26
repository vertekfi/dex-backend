import { commify, formatEther } from '@ethersproject/units';
import { Inject, Injectable } from '@nestjs/common';
import { RewardPool, RewardPoolUserInfo } from 'src/graphql';
import { TokenPriceService } from '../common/token/pricing/token-price.service';
import { AccountWeb3 } from '../common/types';
import { ContractService } from '../common/web3/contract.service';
import { Multicaller } from '../common/web3/multicaller';
import { RPC } from '../common/web3/rpc.provider';
import { BLOCKS_PER_DAY } from '../utils/blocks';
import * as poolAbi from '../abis/RewardPool.json';
import * as erc20Abi from '../abis/ERC20.json';
import { BigNumber } from 'ethers';
import { convertToFormatEthNumber } from '../common/web3/utils';
import { BlockService } from '../common/web3/block.service';
import { ProtocolService } from '../protocol/protocol.service';
import { CacheDecorator } from '../common/decorators/cache.decorator';
import { ONE_MINUTE_SECONDS } from '../utils/time';

const REWARD_POOL_KEY = 'REWARD_POOL_KEY';

interface RewardPoolMulicalResult {
  rewardPerBlock: BigNumber;
  startBlock: BigNumber;
  bonusEndBlock: BigNumber;
}

interface UserInfoMulticallResult {
  userInfo: {
    amount: BigNumber;
  };
  pendingReward: BigNumber;
}

@Injectable()
export class RewardPoolService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly pricing: TokenPriceService,
    private readonly contracts: ContractService,
    private readonly blockService: BlockService,
    private readonly protocolService: ProtocolService,
  ) {}

  async getPoolsWithUserData(user?: string) {
    // get block and price once to start
    const [blockNumber, tokenPrice] = await Promise.all([
      this.rpc.provider.getBlockNumber(),
      this.pricing.getProtocolTokenPrice(),
    ]);

    const protocolTokenPrice = Number(tokenPrice);
    const { rewardPools } = await this.protocolService.getProtocolConfigDataForChain();
    const pools = await this.getPoolInfo(rewardPools, protocolTokenPrice, blockNumber);

    if (!user) {
      pools.forEach((pool) => {
        pool.userInfo = this._getDefaultUserValues(pool.address);
      });
    } else {
      await this.attachUserPoolsInfo(pools, user, protocolTokenPrice);
    }

    return pools;
  }

  @CacheDecorator(REWARD_POOL_KEY, ONE_MINUTE_SECONDS)
  private async getPoolInfo(
    pools: RewardPool[],
    protocolTokenPrice: number,
    blockNumber: number,
  ): Promise<RewardPool[]> {
    const protocolToken = this.contracts.getProtocolToken();
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

      const daysRemaining =
        blocksRemaining > 0
          ? (blocksRemaining / this.blockService.getBlocksPerDay()).toFixed(0)
          : '0';
      pool.daysRemaining = daysRemaining;

      // reward info
      const rewardPerBlock = convertToFormatEthNumber(data.rewardPerBlock);
      const rewardTokenPrice = await this.pricing.tryCachePriceForToken(pool.rewardToken.address);
      pool.rewardToken.price = rewardTokenPrice;
      pool.aprs = this.getRewardRates(rewardTokenPrice, rewardPerBlock, Number(pool.amountStaked));

      pool.isPartnerPool = pool.isPartnerPool || false;

      dataPools.push({
        ...pool,
      });

      i++;
    }

    return dataPools;
  }

  private async attachUserPoolsInfo(
    pools: RewardPool[],
    user: string,
    protocolTokenPrice: number,
  ): Promise<RewardPool[]> {
    if (!user) {
      pools.forEach((pool) => {
        pool.userInfo = this._getDefaultUserValues(pool.address);
      });
      return pools;
    }

    const userMulitcall = new Multicaller(this.rpc, poolAbi);

    for (const pool of pools) {
      userMulitcall.call(`${pool.address}.userInfo`, pool.address, 'userInfo', [user]);
      userMulitcall.call(`${pool.address}.pendingReward`, pool.address, 'pendingReward', [user]);
      // const percentageOwned = Number(userDeposit) / Number(formatEther(totalDeposits));
    }

    let userOnChainData = {} as Record<string, UserInfoMulticallResult>;
    try {
      userOnChainData = await userMulitcall.execute();
    } catch (err: any) {
      console.error(err);
      throw `Issue with multicall execution. ${err}`;
    }

    const userOnChainDataArray = Object.entries(userOnChainData);

    userOnChainDataArray.forEach((user) => {
      const [poolAddress, userData] = user;
      const pool = pools.find((p) => p.address == poolAddress);

      let data: RewardPoolUserInfo;

      if (userData.userInfo.amount.gt(0)) {
        const pendingStr = formatEther(userData.pendingReward);
        const userDeposit = formatEther(userData.userInfo.amount);
        const userDepositNum = Number(userDeposit);

        data = {
          poolAddress: pool.address,
          hasPendingRewards: userData.pendingReward.gt(0),
          pendingRewards: Number(pendingStr).toFixed(8),
          pendingRewardValue: (pool.rewardToken.price * Number(pendingStr)).toFixed(2),
          amountDeposited: userDepositNum.toFixed(4),
          depositValue: (userDepositNum * protocolTokenPrice).toFixed(2),
          amountDepositedFull: userDeposit,
          percentageOwned: ((userDepositNum / Number(pool.amountStaked)) * 100).toFixed(2),
        };
      } else {
        data = this._getDefaultUserValues(pool.address);
      }

      pool.userInfo = data;
    });

    return pools;
  }

  private getRewardRates(rewardTokenPrice: number, rewardPerBlock: number, totalDeposits: number) {
    totalDeposits = totalDeposits > 0 ? totalDeposits : 1;

    const amountPerDay = rewardPerBlock * BLOCKS_PER_DAY[this.rpc.chainId];
    const amountPerYear = amountPerDay * 365;
    const valuePerDay = rewardTokenPrice * amountPerYear;
    const valuePerYear = valuePerDay * 365;
    const apr = valuePerYear / totalDeposits;
    const daily = apr / 365;

    return {
      daily: commify(daily.toFixed(2)),
      apr: commify(apr.toFixed(2)),
    };
  }

  private _getDefaultUserValues(poolAddress: string): RewardPoolUserInfo {
    return {
      poolAddress,
      hasPendingRewards: false,
      pendingRewards: '0.0',
      pendingRewardValue: '0.0',
      amountDeposited: '0.0',
      depositValue: '0.0',
      amountDepositedFull: '0',
      percentageOwned: '0',
    };
  }
}
