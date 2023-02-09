import { TokenPrices } from '@balancer-labs/sdk';
import { bnum } from '@balancer-labs/sor';
import { Inject } from '@nestjs/common';
import { PrismaPoolAprItem } from '@prisma/client';
import { getAddress, formatUnits } from 'ethers/lib/utils';
import { isNil, mapValues } from 'lodash';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolWithExpandedNesting } from 'prisma/prisma-types';
import { BalTokenAdmin } from 'src/modules/balancer-sdk/contracts/bal-token-admin';
import { getBptPrice } from 'src/modules/common/pool/pool-utils';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { AccountWeb3 } from 'src/modules/common/types';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { GaugeService } from 'src/modules/gauge/gauge.service';
import { VeBalHelpers } from 'src/modules/gauge/lib/ve-helpers';
import { SubgraphGauge } from 'src/modules/gauge/types';
import { calculateGaugeApr, getAprRange } from 'src/modules/gauge/utils/gauge-utils';
import { ProtocolService } from 'src/modules/protocol/protocol.service';
import { PoolAprService } from '../../pool-types';

export class GaugeAprService implements PoolAprService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly gaugeService: GaugeService,
    private readonly tokenAdmin: BalTokenAdmin,
    private readonly protocolService: ProtocolService,
    private readonly contractService: ContractService,
    private readonly veBALHelpers: VeBalHelpers,
    private readonly prisma: PrismaService,
    private readonly pricingService: TokenPriceService,
  ) {}

  async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    try {
      const operations: any[] = [];
      const gauges = await this.gaugeService.getCoreGauges();

      const protoData = await this.protocolService.getProtocolConfigDataForChain();
      const gaugeData = protoData.gauges.map((g) => {
        return {
          id: g.address,
          poolId: g.poolId,
        };
      });

      const gaugeAprData: any[] = await this.getGaugeBALAprs({
        pools,
        gauges: gaugeData,
      });

      for (const aprInfo of gaugeAprData) {
        // TODO: need to write this to db somehow
        // const item: PrismaPoolAprItem = {
        //   id: `${aprInfo[0]}-VRTK-apr`,
        //   poolId: aprInfo[0],
        //   title: `VRTK reward APR`,
        //   apr: rewardApr,
        //   type: 'NATIVE_REWARD',
        //   group: null,
        // };
      }

      // await prismaBulkExecuteOperations(operations);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getGaugeBALAprs({
    pools,
    gauges,
  }: {
    pools: PrismaPoolWithExpandedNesting[];
    gauges: { id: string; poolId: string }[];
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

      const balPrice = await this.pricingService.getProtocolTokenPrice();

      const aprs = gauges.map((gauge) => {
        const poolId = gauge.poolId;
        const pool = pools.find((pool) => pool.id === poolId);
        const nilApr = [poolId, { min: '0', max: '0' }];

        if (!pool) return nilApr;
        if (isNil(inflationRate)) return nilApr;

        if (!protocolTokenAddress) return nilApr;

        const totalSupply = bnum(totalSupplies[getAddress(gauge.id)]);

        const gaugeBALApr = calculateGaugeApr({
          gaugeAddress: getAddress(gauge.id),
          bptPrice: getBptPrice(
            String(pool.dynamicData.totalLiquidity),
            pool.dynamicData.totalShares,
          ),
          balPrice,
          // undefined inflation rate is guarded above
          inflationRate: inflationRate as string,
          boost: '1',
          workingSupplies,
          relativeWeights,
          totalSupply,
        });

        const range = getAprRange(gaugeBALApr || '0');
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
