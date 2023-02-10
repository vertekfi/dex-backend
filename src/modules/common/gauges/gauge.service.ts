import { Inject, Injectable } from '@nestjs/common';
import { ProtocolService } from '../../protocol/protocol.service';
import { GaugeSubgraphService } from '../../subgraphs/gauge-subgraph/gauge-subgraph.service';
import { GaugeSharesQueryVariables } from '../../subgraphs/gauge-subgraph/generated/gauge-subgraph-types';
import { GaugeShare, GaugeUserShare } from '../../gauge/types';
import { Multicaller } from '../web3/multicaller';
import { RPC } from '../web3/rpc.provider';
import { AccountWeb3 } from '../types';
import { PrismaService } from 'nestjs-prisma';
import * as moment from 'moment-timezone';
import { ethNum, scaleDown } from '../../utils/old-big-number';
import { LiquidityGauge } from 'src/graphql';
import * as LGV5Abi from '../../abis/LiquidityGaugeV5.json';
import { BigNumber } from 'ethers';
import { PrismaPoolStakingGauge } from '@prisma/client';
import { ZERO_ADDRESS } from '../web3/utils';
import { prismaPoolMinimal } from 'prisma/prisma-types';
import { ProtocolGaugeInfo } from '../../protocol/types';
import { getContractAddress } from '../web3/contract';

const GAUGE_CACHE_KEY = 'GAUGE_CACHE_KEY';
const SUBGRAPH_GAUGE_CACHE_KEY = 'SUBGRAPH_GAUGE_CACHE_KEY';

const MAX_REWARDS = 8;

@Injectable()
export class GaugeService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly gaugeSubgraphService: GaugeSubgraphService,
    private readonly protocolService: ProtocolService,
    private readonly prisma: PrismaService,
  ) {}

  async getAllGaugeAddresses(): Promise<ProtocolGaugeInfo[]> {
    const data = await this.protocolService.getProtocolConfigDataForChain();
    return data.gauges;
  }

  async getAllGauges() {
    const gauges = await this.getCoreGauges();
    const { pools, tokens } = await this.getPoolsForGauges(gauges.map((g) => g.poolId));
    // Attach each gauges pool info
    // These can be cached along with the gauges since only static(mostly) data is asked for
    pools.forEach((p) => {
      const gauge = gauges.find((g) => g.poolId == p.id);
      if (gauge) {
        gauge.pool = {
          ...p,
          poolType: p.type,
          name: p.name,
          tokensList: p.tokens.map((t) => t.address),
          tokens: p.tokens.map((t) => {
            const token = tokens.find((tk) => tk.address === t.address);
            const poolToken = p.tokens.find((tk) => tk.address === t.address);
            console.log(poolToken);
            return {
              weight: poolToken.dynamicData.weight,
              symbol: token.symbol,
              address: t.address,
              logoURI: tokens.find((t2) => t2.address == t.address)?.logoURI,
            };
          }),
        };
      }
    });

    return gauges;
  }

  async getCoreGauges() {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const poolIds = protoData.gauges.map((g) => g.poolId);
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: poolIds },
      },
      ...prismaPoolMinimal,
    });

    //  const gaugeInfos = pools.filter((p) => p.staking).map((p) => p.staking.gauge);
    const stakingInfos = pools.filter((p) => p.staking).map((p) => p.staking);

    // TODO: reward tokens
    // const [rewardTokens] = await Promise.all([this.getGaugesRewardData(gaugeInfos)]);
    // const onchainInfo = await this.getGaugeAdditionalInfo(gaugeInfos);

    const gauges = [];

    for (const gauge of stakingInfos) {
      const pool = pools.find((p) => p.id === gauge.poolId);
      const gqlPool = {
        ...pool,
        poolType: pool.type,
        tokensList: pool.tokens.map((t) => t.address),
        tokens: pool.tokens.map((token) => {
          return {
            ...token,
            ...token.token,
          };
        }),
      };

      if (pool.staking.gauge) {
        gauges.push({
          id: gauge.id,
          symbol: pool.staking.gauge.symbol,
          poolId: gauge.poolId,
          address: gauge.id,
          totalSupply: pool.staking.gauge.totalSupply,
          factory: {
            id: getContractAddress('LIQUIDITY_GAUGEV5_FACTORY'),
          },
          isKilled: pool.staking.gauge.isKilled,
          rewardTokens: pool.staking.gauge.rewards,
          depositFee: pool.staking.gauge.depositFee,
          withdrawFee: pool.staking.gauge.withdrawFee,
          pool: gqlPool,
        });
      }
    }

    return gauges;
  }

  async getGaugeRewardTokenAddresses(gauges: string[]) {
    const multiCaller = new Multicaller(this.rpc, LGV5Abi);

    gauges.forEach((gauge) => {
      let count = 0;
      while (count < MAX_REWARDS) {
        multiCaller.call(`${gauge}.reward_tokens.${count}`, gauge, 'reward_tokens', [count]);
        count++;
      }
    });

    const rewardTokensResult = await multiCaller.execute<
      Record<string, { reward_tokens: string[] }>
    >();

    for (const gauge of gauges) {
      rewardTokensResult[gauge].reward_tokens = rewardTokensResult[gauge].reward_tokens.filter(
        (t) => t !== ZERO_ADDRESS,
      );
    }

    return rewardTokensResult;
  }

  async getGaugesRewardData(gauges: string[]) {
    const tokenAddresses = await this.getGaugeRewardTokenAddresses(gauges);

    const multiCaller = new Multicaller(this.rpc, LGV5Abi);

    const tokenMapping: {
      [gauge: string]: {
        tokens: {
          tokenAddress: string;
          rate: BigNumber;
          period_finish: BigNumber;
          gaugeId: string;
          rewardPerSecond: string;
        }[];
      };
    } = {};

    gauges.forEach(
      (gauge) =>
        (tokenMapping[gauge] = {
          tokens: [],
        }),
    );

    for (const gauge in tokenAddresses) {
      const rewardTokens = tokenAddresses[gauge].reward_tokens;
      rewardTokens.forEach((token, idx) => {
        tokenMapping[gauge].tokens.push({
          tokenAddress: token,
          period_finish: null,
          rate: null,
          gaugeId: gauge,
          rewardPerSecond: '0',
        });

        multiCaller.call(`${gauge}.reward_data.${idx}`, gauge, 'reward_data', [token]);
      });
    }

    // Not concerned with empty reward tokens
    const tokenResult = Object.fromEntries(
      Object.entries(tokenMapping).filter((data) => data[1].tokens.length),
    );

    const rewardDataResult = (await multiCaller.execute()) as Record<
      string,
      {
        reward_data: { token: string; rate: BigNumber; period_finish: BigNumber }[];
      }
    >;

    for (const gauge in rewardDataResult) {
      rewardDataResult[gauge].reward_data.forEach((token, idx) => {
        const isActive = moment.unix(token.period_finish.toNumber()).isAfter(moment());
        const rewardPerSecond = isActive ? scaleDown(token.rate.toString(), 18).toNumber() : 0;
        const tokenInfo = tokenResult[gauge].tokens[idx];

        tokenInfo.period_finish = token.period_finish;
        tokenInfo.rate = token.rate;
        tokenInfo.rewardPerSecond = rewardPerSecond.toString();
      });
    }

    return Object.entries(tokenResult);
  }

  async getGaugeAdditionalInfo(gauges: { id: string }[]) {
    const multiCaller = new Multicaller(this.rpc, LGV5Abi);

    gauges.forEach((gauge) => {
      multiCaller.call(`${gauge.id}.depositFee`, gauge.id, 'getDepositFee');
      multiCaller.call(`${gauge.id}.withdrawFee`, gauge.id, 'getWithdrawFee');
      multiCaller.call(`${gauge.id}.totalSupply`, gauge.id, 'totalSupply');
      multiCaller.call(`${gauge.id}.iskilled`, gauge.id, 'is_killed');
      multiCaller.call(`${gauge.id}.symbol`, gauge.id, 'symbol');
    });

    const data = await multiCaller.execute();

    const results: any = {};
    for (const address in data) {
      results[address] = {
        depositFee: data[address].depositFee.toNumber(),
        withdrawFee: data[address].withdrawFee.toNumber(),
        iskilled: data[address].iskilled,
        totalSupply: ethNum(data[address].totalSupply),
        symbol: data[address].symbol,
      };
    }

    return results;
  }

  async getDatabaseGauges() {
    return this.prisma.prismaPoolStaking.findMany({
      where: {
        AND: [
          {
            gauge: {
              isKilled: false,
            },
          },
        ],
      },
      include: {
        gauge: {
          include: {
            rewards: true,
          },
        },
      },
    });
  }

  private async getPoolsForGauges(poolIds: string[]) {
    const [tokens, pools] = await Promise.all([
      this.prisma.prismaToken.findMany({}),
      this.prisma.prismaPool.findMany({
        where: {
          id: {
            in: poolIds,
          },
        },
        include: {
          tokens: {
            include: {
              dynamicData: true,
            },
          },
        },
      }),
    ]);

    return {
      pools,
      tokens,
    };
  }

  async getUserGaugeStakes(args: { user: string; poolIds: string[] }): Promise<LiquidityGauge[]> {
    const userGauges: LiquidityGauge[] = [];

    // throw new Error(`getUserGaugeStakes: Unimplemented`);

    return userGauges;
  }

  async getAllUserShares(userAddress: string): Promise<GaugeUserShare[]> {
    const userGauges = await this.gaugeSubgraphService.getUserGauges(userAddress);
    return (
      userGauges?.gaugeShares?.map((share) => ({
        gaugeAddress: share.gauge.id,
        poolId: share.gauge.poolId,
        amount: share.balance,
        tokens: share.gauge.tokens ?? [],
      })) ?? []
    );
  }

  async getAllGaugeShares(args: GaugeSharesQueryVariables): Promise<GaugeShare[]> {
    return await this.gaugeSubgraphService.getAllGaugeShares(args);
  }

  async getMetadata() {
    return this.gaugeSubgraphService.getMetadata();
  }
}
