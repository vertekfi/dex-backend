import * as _ from 'lodash';
import { prismaBulkExecuteOperations } from '../../../../prisma/prisma-util';
import { BigNumber } from 'ethers';
import { formatFixed } from '@ethersproject/bignumber';
import { UserStakedBalanceService, UserSyncUserBalanceInput } from '../user-types';
import { PrismaService } from 'nestjs-prisma';
import { ZERO_ADDRESS } from 'src/modules/common/web3/utils';
import { OrderDirection } from 'src/modules/subgraphs/balancer/generated/balancer-subgraph-types';
import { GaugeService } from 'src/modules/common/gauges/gauge.service';
import { GaugeShare } from 'src/modules/gauge/types';
import * as LiqGaugeV5abi from '../../abis/LiquidityGaugeV5.json';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { AccountWeb3 } from 'src/modules/common/types';
import { ContractService } from 'src/modules/common/web3/contract.service';

@Injectable()
export class UserSyncGaugeBalanceService implements UserStakedBalanceService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly gaugeService: GaugeService,
    private readonly contractService: ContractService,
  ) {}

  async initStakedBalances(): Promise<void> {
    const { block } = await this.gaugeService.getMetadata();
    console.log('initStakedBalances: loading subgraph users...');
    const gaugeShares = await this.loadAllSubgraphUsers();
    console.log('initStakedBalances: finished loading subgraph users...');
    console.log('initStakedBalances: loading pools...');
    const pools = await this.prisma.prismaPool.findMany({ select: { id: true } });
    console.log('initStakedBalances: finished loading pools...');
    const userAddresses = _.uniq(gaugeShares.map((share) => share.user.id));

    console.log('initStakedBalances: performing db operations...');

    await prismaBulkExecuteOperations(
      [
        this.prisma.prismaUser.createMany({
          data: userAddresses.map((userAddress) => ({ address: userAddress })),
          skipDuplicates: true,
        }),
        this.prisma.prismaUserStakedBalance.deleteMany({}),
        this.prisma.prismaUserStakedBalance.createMany({
          data: gaugeShares.map((share) => {
            const pool = pools.find((pool) => pool.id === share.gauge.poolId);

            return {
              id: `${share.gauge.id}-${share.user.id}`,
              balance: share.balance,
              balanceNum: parseFloat(share.balance),
              userAddress: share.user.id,
              poolId: pool?.id,
              tokenAddress: share.gauge.poolAddress,
              stakingId: share.gauge.id,
            };
          }),
        }),
        this.prisma.prismaUserBalanceSyncStatus.upsert({
          where: { type: 'STAKED' },
          create: { type: 'STAKED', blockNumber: block.number },
          update: { blockNumber: block.number },
        }),
      ],
      true,
    );

    console.log('initStakedBalances: finished...');
  }

  async syncChangedStakedBalances(): Promise<void> {
    try {
      // we always store the latest synced block
      const status = await this.prisma.prismaUserBalanceSyncStatus.findUnique({
        where: { type: 'STAKED' },
      });

      if (!status) {
        throw new Error(
          'UserSyncGaugeBalanceService: syncStakedBalances called before initStakedBalances',
        );
      }

      const jsonRpcProvider = this.rpc.provider;
      const pools = await this.prisma.prismaPool.findMany({ include: { staking: true } });
      const latestBlock = await jsonRpcProvider.getBlockNumber();
      const gaugeAddresses = (await this.gaugeService.getAllProtocolGauges()).map((g) => g.address);

      // we sync at most 10k blocks at a time
      const startBlock = status.blockNumber + 1;
      const endBlock = latestBlock - startBlock > 2_000 ? startBlock + 2_000 : latestBlock;

      const multicall = new Multicaller(this.rpc, LiqGaugeV5abi);

      // the multicall response will be merged into this object
      let response: {
        [gauge: string]: { [userAddress: string]: BigNumber };
      } = {};

      // we keep track of all user addresses to create them as entities in the db
      const allUserAddress: string[] = [];

      /*
            we need to figure out which users have a changed balance on any gauge contract and update their balance,
            therefore we check all deposit, withdraw and transfer events since the last synced block
         */
      for (let gaugeAddress of gaugeAddresses) {
        const gauge = this.contractService.getLiquidityGauge(gaugeAddress);

        // so we get all events since the last synced block
        const events = await gauge.queryFilter({ address: gaugeAddress }, startBlock, endBlock);

        // we filter by those events and avoid duplicated users per gauge contract by utlizing a Set
        const uniqueUserAddresses = new Set<string>();
        const filteredEvents = events.filter((event) =>
          ['Deposit', 'Withdraw', 'Transfer'].includes(event.event!),
        );

        for (let event of filteredEvents) {
          if (event.event === 'Transfer') {
            if (event.args!._from !== ZERO_ADDRESS && event.args!._to !== ZERO_ADDRESS) {
              uniqueUserAddresses.add(event.args!._from.toLowerCase());
              uniqueUserAddresses.add(event.args!._to.toLowerCase());
            }
          } else {
            uniqueUserAddresses.add(event.args!.provider.toLowerCase());
          }
        }

        for (const userAddress of uniqueUserAddresses) {
          // a dot in the path nests the response on this key
          multicall.call(`${gaugeAddress}.${userAddress}`, gaugeAddress, 'balanceOf', [
            userAddress,
          ]);

          // so if we scheduled more than 100 calls, we execute the batch
          if (multicall.numCalls >= 100) {
            response = _.merge(
              response,
              await multicall.execute('UserSyncGaugeBalanceService:syncChangedStakedBalances'),
            );
          }
        }
        allUserAddress.push(...uniqueUserAddresses);
      }
      // see if we have some more calls to execute
      if (multicall.numCalls > 0) {
        response = _.merge(
          response,
          await multicall.execute('UserSyncGaugeBalanceService:syncChangedStakedBalances'),
        );
      }

      /*
            we have an object with gaugeAddress => userAddress => balance,
            the 2nd argument of the lodash _.map function provides the key of the object
         */
      const userGaugeBalanceUpdates = _.map(response, (userBalance, gaugeAddress) => {
        // now we have an object userAddress => balance, so 2nd argument is the key which is the user address
        return _.map(userBalance, (amount, userAddress) => ({
          gaugeAddress,
          userAddress: userAddress.toLowerCase(),
          amount: formatFixed(amount, 18),
        }));
      }).flat();

      if (userGaugeBalanceUpdates.length === 0) {
        await this.prisma.prismaUserBalanceSyncStatus.update({
          where: { type: 'STAKED' },
          data: { blockNumber: endBlock },
        });

        return;
      }

      await prismaBulkExecuteOperations(
        [
          this.prisma.prismaUser.createMany({
            data: _.uniq(allUserAddress).map((address) => ({ address })),
            skipDuplicates: true,
          }),

          ...userGaugeBalanceUpdates
            .map((update) => {
              const pool = pools.find((pool) => pool.staking?.id === update.gaugeAddress);

              console.log(pool);
              if (!pool?.id) {
                console.log(pool);
                console.log('NO POOL???');
                return;
              }

              return this.prisma.prismaUserStakedBalance.upsert({
                where: { id: `${update.gaugeAddress}-${update.userAddress}` },
                update: {
                  balance: update.amount,
                  balanceNum: parseFloat(update.amount),
                },
                create: {
                  id: `${update.gaugeAddress}-${update.userAddress}`,
                  balance: update.amount,
                  balanceNum: parseFloat(update.amount),
                  userAddress: update.userAddress,
                  poolId: pool?.id,
                  tokenAddress: pool?.address,
                  stakingId: update.gaugeAddress,
                },
              });
            })
            .filter((op) => op !== undefined),

          this.prisma.prismaUserBalanceSyncStatus.update({
            where: { type: 'STAKED' },
            data: { blockNumber: endBlock },
          }),
        ],
        true,
      );
    } catch (error) {
      console.error('Error syncing gauge balances', error);
    }
  }

  async syncUserBalance({ userAddress, poolId, poolAddress, staking }: UserSyncUserBalanceInput) {
    const gauge = this.contractService.getLiquidityGauge(staking.address);
    const balance = await gauge.balanceOf(userAddress);
    const amount = formatFixed(balance, 18);

    await this.prisma.prismaUserStakedBalance.upsert({
      where: { id: `${staking.address}-${userAddress}` },
      update: {
        balance: amount,
        balanceNum: parseFloat(amount),
      },
      create: {
        id: `${staking.address}-${userAddress}`,
        balance: amount,
        balanceNum: parseFloat(amount),
        userAddress: userAddress,
        poolId: poolId,
        tokenAddress: poolAddress,
        stakingId: staking.address,
      },
    });
  }

  private async loadAllSubgraphUsers(): Promise<GaugeShare[]> {
    const pageSize = 1000;
    const MAX_SKIP = 5000;
    let shares: GaugeShare[] = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      const gaugeShares = await this.gaugeService.getAllGaugeShares({
        first: pageSize,
        skip,
        orderDirection: OrderDirection.Asc,
      });

      shares.push(...gaugeShares);
      hasMore = gaugeShares.length >= pageSize;

      skip += pageSize;

      if (skip > MAX_SKIP) {
        hasMore = false;
      }
    }

    return _.uniqBy(shares, (user) => user.id);
  }
}
