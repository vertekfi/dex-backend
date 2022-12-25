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

const GAUGE_CACHE_KEY = 'GAUGE_CACHE_KEY';
const GAUGE_APR_KEY = 'GAUGE_APR_KEY';

@Injectable()
export class GaugeService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly gaugeSubgraphService: GaugeSubgraphService,
    private readonly tokenAdmin: BalTokenAdmin,
    private readonly protocolService: ProtocolService,
    private readonly cache: CacheService,
    private readonly contractService: ContractService,
    private veBALHelpers: VeBalHelpers,
  ) {}

  async getAllGaugeAddresses(): Promise<string[]> {
    return await this.gaugeSubgraphService.getAllGaugeAddresses();
  }

  async getAllGauges(args: GaugeLiquidityGaugesQueryVariables) {
    const [gauges, protoData] = await Promise.all([
      this.gaugeSubgraphService.getAllGauges(args),
      this.protocolService.getProtocolConfigDataForChain(),
    ]);

    return gauges
      .filter((g) => protoData.gauges.includes(g.poolId))
      .map(({ id, poolId, totalSupply, shares, tokens }) => ({
        id,
        address: id,
        poolId,
        totalSupply,
        shares:
          shares?.map((share) => ({
            userAddress: share.user.id,
            amount: share.balance,
          })) ?? [],
        tokens: tokens,
      }));
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
