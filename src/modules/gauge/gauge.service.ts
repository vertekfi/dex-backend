import { Inject, Injectable } from '@nestjs/common';
import { isNil, mapValues } from 'lodash';
import { formatEther, formatUnits, getAddress } from 'ethers/lib/utils';
import { bnum } from '../balancer-sdk/sor/impl/utils/bignumber';
import { ProtocolService } from '../protocol/protocol.service';
import { GaugeSubgraphService } from '../subgraphs/gauge-subgraph/gauge-subgraph.service';
import { GaugeSharesQueryVariables } from '../subgraphs/gauge-subgraph/generated/gauge-subgraph-types';
import { TokenPrices } from '../token/token-types-old';
import { GaugeShare, GaugeUserShare, Pool, SubgraphGauge } from './types';
import { ContractService } from '../common/web3/contract.service';
import { BalTokenAdmin } from '../balancer-sdk/contracts/bal-token-admin';
import { getBptPrice } from '../common/pool/pool-utils';
import { calculateGaugeApr, getAprRange } from './utils/gauge-utils';
import { VeBalHelpers } from './lib/ve-helpers';
import { Multicaller } from '../common/web3/multicaller';
import { RPC } from '../common/web3/rpc.provider';
import { AccountWeb3 } from '../common/types';
import { THIRTY_SECONDS_SECONDS } from '../utils/time';
import { CONTRACT_MAP } from '../data/contracts';
import { gql } from 'graphql-request';
import { PrismaService } from 'nestjs-prisma';
import { CacheDecorator } from '../common/decorators/cache.decorator';
import * as moment from 'moment-timezone';
import { scaleDown } from '../utils/old-big-number';
import { LiquidityGauge } from 'src/graphql';
import * as LGV5Abi from './abis/LiquidityGaugeV5.json';
import { BigNumber } from 'ethers';

const GAUGE_CACHE_KEY = 'GAUGE_CACHE_KEY';
const SUBGRAPH_GAUGE_CACHE_KEY = 'SUBGRAPH_GAUGE_CACHE_KEY';

@Injectable()
export class GaugeService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly gaugeSubgraphService: GaugeSubgraphService,
    private readonly tokenAdmin: BalTokenAdmin,
    private readonly protocolService: ProtocolService,
    private readonly contractService: ContractService,
    private readonly veBALHelpers: VeBalHelpers,
    private readonly prisma: PrismaService,
  ) {}

  async getAllGaugeAddresses(): Promise<string[]> {
    return await this.gaugeSubgraphService.getAllGaugeAddresses();
  }

  // TODO: Get these from database
  //  @CacheDecorator(SUBGRAPH_GAUGE_CACHE_KEY, THIRTY_SECONDS_SECONDS)
  async getLiquidityGauges() {
    const { liquidityGauges } = await this.gaugeSubgraphService.client.request(gql`
      query {
        liquidityGauges {
          id
          symbol
          poolId
          totalSupply
          factory {
            id
          }
          isKilled
          tokens {
            id
            decimals
            symbol
            rate
            periodFinish
            totalDeposited
          }
        }
      }
    `);

    return liquidityGauges;
  }

  // @CacheDecorator(GAUGE_CACHE_KEY, THIRTY_SECONDS_SECONDS)
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
            return {
              weight: t.dynamicData.weight,
              address: t.address,
              logoURI: tokens.find((t2) => t2.address == t.address)?.logoURI,
            };
          }),
        };
      }
    });

    return gauges;
  }

  // @CacheDecorator(GAUGE_CACHE_KEY, THIRTY_SECONDS_SECONDS)
  async getCoreGauges() {
    const [subgraphGauges, protoData] = await Promise.all([
      this.getLiquidityGauges(),
      this.protocolService.getProtocolConfigDataForChain(),
    ]);

    const rewardTokens = await this.getGaugesRewardData(subgraphGauges);
    const gaugeFeesMap = await this.getGaugeFees(subgraphGauges);
    const gauges = [];

    for (const gauge of subgraphGauges) {
      if (protoData.gauges.includes(gauge.poolId)) {
        gauges.push({
          id: gauge.id,
          symbol: gauge.symbol,
          poolId: gauge.poolId,
          address: gauge.id,
          totalSupply: gauge.totalSupply,
          factory: {
            id: CONTRACT_MAP.LIQUIDITY_GAUGEV5_FACTORY[this.rpc.chainId],
          },
          isKilled: gauge.isKilled,
          rewardTokens: rewardTokens.filter((r) => r.gaugeAddress == gauge.id),
          fees: gaugeFeesMap[gauge.id],
        });
      }
    }

    return gauges;
  }

  async getGaugesRewardData(gauges: any[]) {
    const multiCaller = new Multicaller(this.rpc, LGV5Abi);
    const rewardTokens = [];

    for (const gauge of gauges) {
      gauge.tokens?.forEach((rewardToken) => {
        // id in subgraph = <tokenAddress>-<gaugeAddress>
        const tokenAddress = rewardToken.id.split('-')[0];
        multiCaller.call(rewardToken.id, gauge.id, 'reward_data', [tokenAddress]);
      });

      const rewardDataResult = (await multiCaller.execute()) as Record<
        string,
        { rate: BigNumber; period_finish: string }
      >;

      gauge.tokens?.forEach((rewardToken) => {
        const rewardData = rewardDataResult[rewardToken.id];
        const isActive = moment.unix(parseInt(rewardData.period_finish)).isAfter(moment());
        // id in subgraph = <tokenAddress>-<gaugeAddress>
        const address = rewardToken.id.split('-')[0];

        rewardTokens.push({
          gaugeAddress: gauge.id,
          ...rewardToken,
          address,
          rewardsPerSecond: isActive
            ? scaleDown(rewardData.rate.toString(), rewardToken.decimals || 18).toNumber()
            : 0,
          id: address,
        });
      });
    }

    return rewardTokens;
  }

  async getGaugeFees(gauges: any[]) {
    const multiCaller = new Multicaller(this.rpc, LGV5Abi);

    gauges.forEach((gauge) => {
      multiCaller.call(`${gauge.id}.depositFee`, gauge.id, 'getDepositFee');
      multiCaller.call(`${gauge.id}.withdrawFee`, gauge.id, 'getWithdrawFee');
    });

    const fees = await multiCaller.execute();
    for (const address in fees) {
      fees[address].depositFee = Number(formatEther(fees[address].depositFee));
      fees[address].withdrawFee = Number(formatEther(fees[address].withdrawFee));
    }

    return fees;
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

    throw new Error(`getUserGaugeStakes: Unimplemented`);

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

  // @CacheDecorator(GAUGE_APR_KEY, THIRTY_SECONDS_SECONDS)
  async getGaugeBALAprs({
    prices,
    pools,
    gauges,
  }: {
    prices: TokenPrices;
    pools: Pool[];
    gauges: SubgraphGauge[];
  }) {
    try {
      let gaugeAddresses = gauges.map((gauge) => gauge.id);
      const protocolTokenAddress = this.contractService.getProtocolToken().address;

      const [inflationRate, relativeWeights, workingSupplies, totalSupplies] = await Promise.all([
        this.tokenAdmin.getInflationRate(),
        this.getRelativeWeightsForGauges(gaugeAddresses),
        this.getWorkingSupplyForGauges(gaugeAddresses),
        this.getTotalSupplyForGauges(gaugeAddresses),
      ]);

      const aprs = gauges.map((gauge) => {
        const poolId = gauge.poolId;
        const pool = pools.find((pool) => pool.id === poolId);
        const nilApr = [poolId, { min: '0', max: '0' }];

        if (!pool) return nilApr;
        if (isNil(inflationRate)) return nilApr;

        if (!protocolTokenAddress) return nilApr;

        const totalSupply = bnum(totalSupplies[getAddress(gauge.id)]);
        const balPrice = prices[getAddress(protocolTokenAddress)].usd;

        const gaugeBALApr = calculateGaugeApr({
          gaugeAddress: getAddress(gauge.id),
          bptPrice: getBptPrice(pool.totalLiquidity, pool.totalShares),
          balPrice: String(balPrice),
          // undefined inflation rate is guarded above
          inflationRate: inflationRate as string,
          boost: '1',
          workingSupplies,
          relativeWeights,
          totalSupply,
        });

        const range = getAprRange(gaugeBALApr || '0'.toString());
        return [poolId, { ...range }];
      });

      const data = Object.fromEntries(aprs);

      return data;
    } catch (error) {
      console.log('getGaugeBALAprs failed');
      return {};
    }
  }

  async getWorkingSupplyForGauges(gaugeAddresses: string[]) {
    const multicaller = new Multicaller(this.rpc, [
      'function working_supply() public view returns (uint256)',
    ]);
    for (const gaugeAddress of gaugeAddresses) {
      multicaller.call(getAddress(gaugeAddress), getAddress(gaugeAddress), 'working_supply');
    }

    const result = await multicaller.execute();
    const supplies = mapValues(result, (weight) => {
      return weight ? formatUnits(weight, 18) : '0.0';
    });
    return supplies;
  }

  async getTotalSupplyForGauges(gaugeAddresses: string[]) {
    const multicaller = new Multicaller(this.rpc, [
      'function totalSupply() public view returns (uint256)',
    ]);
    for (const gaugeAddress of gaugeAddresses) {
      multicaller.call(getAddress(gaugeAddress), getAddress(gaugeAddress), 'totalSupply');
    }
    const result = await multicaller.execute();
    const supplies = mapValues(result, (weight) => {
      return weight ? formatUnits(weight, 18) : '0.0';
    });
    return supplies;
  }

  private async getRelativeWeightsForGauges(gaugeAddresses: string[]) {
    // the ve bal helpers contract for gauge weights calls
    // the checkpoint function which is necesary for returning
    // the correct value.
    return await this.veBALHelpers.getRelativeWeights(gaugeAddresses);
  }
}
