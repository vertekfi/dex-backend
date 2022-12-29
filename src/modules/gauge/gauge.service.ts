import { Inject, Injectable } from '@nestjs/common';
import { isNil, mapValues } from 'lodash';
import { formatUnits, getAddress } from 'ethers/lib/utils';
import { bnum } from '../balancer-sdk/sor/impl/utils/bignumber';
import { CacheService } from '../common/cache.service';
import { ProtocolService } from '../protocol/protocol.service';
import { GaugeSubgraphService } from '../subgraphs/gauge-subgraph/gauge-subgraph.service';
import {
  GaugeLiquidityGaugesQueryVariables,
  GaugeSharesQueryVariables,
  LiquidityGauge,
} from '../subgraphs/gauge-subgraph/generated/gauge-subgraph-types';
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
import { FIVE_MINUTES_SECONDS } from '../utils/time';
import { CONTRACT_MAP } from '../data/contracts';
import { GaugePool } from 'src/graphql';
import { BalancerSubgraphService } from '../subgraphs/balancer/balancer-subgraph.service';

const GAUGE_CACHE_KEY = 'GAUGE_CACHE_KEY';
const GAUGE_APR_KEY = 'GAUGE_APR_KEY';

const MAIN_POOL_GAUGE = {
  5: getAddress('0x5C17FbD4Ad85463F0C8A2759D767fD64a948428e'),
  56: '',
};

@Injectable()
export class GaugeService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly gaugeSubgraphService: GaugeSubgraphService,
    private readonly tokenAdmin: BalTokenAdmin,
    private readonly protocolService: ProtocolService,
    private readonly cache: CacheService,
    private readonly contractService: ContractService,
    private readonly veBALHelpers: VeBalHelpers,
    private readonly balancerSubgraph: BalancerSubgraphService,
  ) {}

  async getAllGaugeAddresses(): Promise<string[]> {
    return await this.gaugeSubgraphService.getAllGaugeAddresses();
  }

  async getAllGauges(args: GaugeLiquidityGaugesQueryVariables = {}) {
    const [subgraphGauges, protoData] = await Promise.all([
      this.gaugeSubgraphService.getAllGauges(args),
      this.protocolService.getProtocolConfigDataForChain(),
    ]);

    console.log(protoData);

    const gauges = [];
    for (const gauge of subgraphGauges) {
      if (
        protoData.gauges.includes(gauge.poolId) &&
        getAddress(gauge.id) !== MAIN_POOL_GAUGE[this.rpc.chainId]
      ) {
        gauges.push({
          id: gauge.id,
          symbol: '',
          poolId: gauge.poolId,
          totalSupply: gauge.totalSupply,
          factory: {
            id: CONTRACT_MAP.LIQUIDITY_GAUGEV5_FACTORY[this.rpc.chainId],
          },
        });
      }
    }

    const poolIds = gauges.map((g) => g.poolId);
    const pools = await this.balancerSubgraph.getAllPools({
      where: {
        id_in: poolIds,
      },
    });

    // Attach each gauges pool info
    // These can be cached along with the gauges since only static data is asked for
    pools.forEach((p) => {
      const gauge = gauges.find((g) => g.poolId == p.id);
      gauge.pool = p;
    });

    return gauges;
  }

  async getUserGaugeStakes(args: { user: string; poolIds: string[] }): Promise<LiquidityGauge[]> {
    const userGauges: LiquidityGauge[] = [];

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
      const cached = await this.cache.get(GAUGE_APR_KEY);
      if (cached) {
        return cached;
      }

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
      await this.cache.set(GAUGE_APR_KEY, data, 60 * 5);

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
