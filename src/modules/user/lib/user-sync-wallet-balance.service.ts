import * as _ from 'lodash';
import { formatFixed } from '@ethersproject/bignumber';
import { Inject } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { PrismaService } from 'nestjs-prisma';
import { prismaBulkExecuteOperations } from 'prisma/prisma-util';
import { AccountWeb3 } from 'src/modules/common/types';
import { Multicaller, MulticallUserBalance } from 'src/modules/common/web3/multicaller';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { ZERO_ADDRESS } from 'src/modules/common/web3/utils';
import { networkConfig } from 'src/modules/config/network-config';
import { BalancerSubgraphService } from 'src/modules/subgraphs/balancer/balancer-subgraph.service';
import { BalancerUserPoolShare } from 'src/modules/subgraphs/balancer/balancer-types';
import * as ERC20Abi from '../../common/web3/abi/ERC20.json';
import { CONTRACT_MAP } from 'src/modules/data/contracts';

@Injectable()
export class UserSyncWalletBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancerSubgraphService: BalancerSubgraphService,
    @Inject(RPC) private rpc: AccountWeb3,
  ) {}

  async initBalancesForPools() {
    console.log('initBalancesForPools: loading balances, pools, block...');
    const { block } = await this.balancerSubgraphService.getMetadata();

    let endBlock = block.number;

    const pools = await this.prisma.prismaPool.findMany({
      select: { id: true, address: true },
      where: { dynamicData: { totalSharesNum: { gt: 0.000000000001 } } },
    });
    const poolIdsToInit = pools.map((pool) => pool.id);
    const chunks = _.chunk(poolIdsToInit, 100);
    let shares: BalancerUserPoolShare[] = [];

    console.log('initBalancesForPools: loading pool shares...');
    for (const chunk of chunks) {
      shares = [
        ...shares,
        ...(await this.balancerSubgraphService.getAllPoolShares({
          where: {
            poolId_in: chunk,
            userAddress_not_in: [ZERO_ADDRESS, CONTRACT_MAP.VAULT[this.rpc.chainId]],
            balance_not: '0',
          },
        })),
      ];
    }
    console.log('initBalancesForPools: finished loading pool shares...');

    let operations: any[] = [];
    operations.push(this.prisma.prismaUserWalletBalance.deleteMany());

    for (const pool of pools) {
      const poolShares = shares.filter((share) => share.poolAddress.toLowerCase() === pool.address);

      if (poolShares.length > 0) {
        operations = [
          ...operations,
          ...poolShares.map((share) => this.getPrismaUpsertForPoolShare(pool.id, share)),
        ];
      }
    }

    console.log('initBalancesForPools: performing db operations...');
    await prismaBulkExecuteOperations(
      [
        this.prisma.prismaUser.createMany({
          data: _.uniq([...shares.map((share) => share.userAddress)]).map((address) => ({
            address,
          })),
          skipDuplicates: true,
        }),
        ...operations,
        this.prisma.prismaUserBalanceSyncStatus.upsert({
          where: { type: 'WALLET' },
          create: { type: 'WALLET', blockNumber: endBlock },
          update: { blockNumber: Math.min(block.number, endBlock) },
        }),
      ],
      true,
    );
    console.log('initBalancesForPools: finished performing db operations...');
  }

  async initBalancesForPool(poolId: string) {
    const { block } = await this.balancerSubgraphService.getMetadata();
    const shares = await this.balancerSubgraphService.getAllPoolShares({
      where: { poolId, userAddress_not: ZERO_ADDRESS, balance_not: '0' },
    });

    await prismaBulkExecuteOperations(
      [
        this.prisma.prismaUser.createMany({
          data: shares.map((share) => ({ address: share.userAddress })),
          skipDuplicates: true,
        }),
        ...shares.map((share) => this.getPrismaUpsertForPoolShare(poolId, share)),
        this.prisma.prismaUserBalanceSyncStatus.upsert({
          where: { type: 'WALLET' },
          create: { type: 'WALLET', blockNumber: block.number },
          update: { blockNumber: block.number },
        }),
      ],
      true,
    );
  }

  async syncChangedBalancesForAllPools() {
    const jsonRpcProvider = this.rpc.provider;
    const erc20Interface = new ethers.utils.Interface(ERC20Abi);
    const latestBlock = await jsonRpcProvider.getBlockNumber();
    const syncStatus = await this.prisma.prismaUserBalanceSyncStatus.findUnique({
      where: { type: 'WALLET' },
    });
    const response = await this.prisma.prismaPool.findMany({ select: { id: true, address: true } });
    const poolAddresses = response.map((item) => item.address);

    if (!syncStatus) {
      throw new Error('UserWalletBalanceService: syncBalances called before initBalances');
    }

    const fromBlock = syncStatus.blockNumber + 1;
    const toBlock = latestBlock - fromBlock > 500 ? fromBlock + 500 : latestBlock;

    //fetch all transfer events for the block range
    const events = await jsonRpcProvider.getLogs({
      //ERC20 Transfer topic
      topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
      fromBlock,
      toBlock,
    });

    const relevantERC20Addresses = poolAddresses;
    // if (isFantomNetwork()) {
    //   relevantERC20Addresses.push(networkConfig.fbeets!.address);
    // }
    const balancesToFetch = _.uniqBy(
      events
        .filter((event) =>
          //we also need to track fbeets balance
          relevantERC20Addresses.includes(event.address.toLowerCase()),
        )
        .map((event) => {
          const parsed = erc20Interface.parseLog(event);

          return [
            { erc20Address: event.address, userAddress: parsed.args?.from as string },
            { erc20Address: event.address, userAddress: parsed.args?.to as string },
          ];
        })
        .flat(),
      (entry) => entry.erc20Address + entry.userAddress,
    );

    if (balancesToFetch.length === 0) {
      await this.prisma.prismaUserBalanceSyncStatus.upsert({
        where: { type: 'WALLET' },
        create: { type: 'WALLET', blockNumber: toBlock },
        update: { blockNumber: toBlock },
      });

      return;
    }

    const balances = await Multicaller.fetchBalances({
      multicallAddress: networkConfig.multicall,
      provider: jsonRpcProvider,
      balancesToFetch,
    });

    await prismaBulkExecuteOperations(
      [
        //make sure all users exist
        this.prisma.prismaUser.createMany({
          data: balances.map((item) => ({ address: item.userAddress })),
          skipDuplicates: true,
        }),
        //update balances
        ...balances
          .filter(({ userAddress }) => userAddress !== ZERO_ADDRESS)
          .map((userBalance) => {
            const poolId = response.find((item) => item.address === userBalance.erc20Address)?.id;
            return this.getUserWalletBalanceUpsert(userBalance, poolId!);
          }),
        this.prisma.prismaUserBalanceSyncStatus.upsert({
          where: { type: 'WALLET' },
          create: { type: 'WALLET', blockNumber: toBlock },
          update: { blockNumber: toBlock },
        }),
      ],
      true,
    );
  }

  private getPrismaUpsertForPoolShare(poolId: string, share: BalancerUserPoolShare) {
    return this.prisma.prismaUserWalletBalance.upsert({
      where: { id: `${poolId}-${share.userAddress}` },
      create: {
        id: `${poolId}-${share.userAddress}`,
        userAddress: share.userAddress,
        poolId,
        tokenAddress: share.poolAddress.toLowerCase(),
        balance: share.balance,
        balanceNum: parseFloat(share.balance),
      },
      update: { balance: share.balance, balanceNum: parseFloat(share.balance) },
    });
  }

  private getUserWalletBalanceUpsert(userBalance: MulticallUserBalance, poolId: string) {
    const { userAddress, balance, erc20Address } = userBalance;

    return this.prisma.prismaUserWalletBalance.upsert({
      where: { id: `${poolId}-${userAddress}` },
      create: {
        id: `${poolId}-${userAddress}`,
        userAddress,
        poolId,
        tokenAddress: erc20Address,
        balance: formatFixed(balance, 18),
        balanceNum: parseFloat(formatFixed(balance, 18)),
      },
      update: {
        balance: formatFixed(balance, 18),
        balanceNum: parseFloat(formatFixed(balance, 18)),
      },
    });
  }
}
