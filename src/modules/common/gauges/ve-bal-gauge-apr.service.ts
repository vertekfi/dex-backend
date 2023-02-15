import {
  prismaPoolWithExpandedNesting,
  PrismaPoolWithExpandedNesting,
} from '../../../../prisma/prisma-types';
import { prismaBulkExecuteOperations } from '../../../../prisma/prisma-util';
import { PoolAprService } from '../../pool/pool-types';
import { GaugeService } from 'src/modules/common/gauges/gauge.service';
import { ONE_YEAR_SECONDS } from 'src/modules/utils/time';
import { TokenPriceService } from 'src/modules/common/token/pricing/token-price.service';
import { getAddress, formatUnits } from 'ethers/lib/utils';
import { isNil, mapValues } from 'lodash';
import { getBptPrice } from 'src/modules/common/pool/pool-utils';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { calculateGaugeApr, getAprRange } from 'src/modules/pool/lib/aprs/gauge-apr-utils';
import { Inject, Injectable } from '@nestjs/common';
import { BalTokenAdmin } from 'src/modules/balancer-sdk/contracts/bal-token-admin';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { ProtocolService } from 'src/modules/protocol/protocol.service';
import { PrismaService } from 'nestjs-prisma';
import { PrismaPoolAprItem, PrismaPoolAprRange } from '@prisma/client';
import { BigNumber, Contract } from 'ethers';
import { getContractAddress } from 'src/modules/common/web3/contract';
import { bnum } from 'src/modules/utils/bignumber-utils';
import { VeBalAprCalc } from 'src/modules/common/gauges/vebal-apr.calc';
import { networkConfig } from 'src/modules/config/network-config';
import { ProtocoFeesService } from 'src/modules/protocol/protocol-fees.service';
import { PoolSnapshotService } from '../pool/pool-snapshot.service';

@Injectable()
export class VeGaugeAprService implements PoolAprService {
  readonly name = 'VeGaugeAprService';
  primaryTokens: string[] = [];

  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly tokenAdmin: BalTokenAdmin,
    private readonly gaugeService: GaugeService,
    private readonly pricingService: TokenPriceService,
    private readonly protocolService: ProtocolService,
    private readonly prisma: PrismaService,
    private readonly veBalAprService: VeBalAprCalc,
    private readonly feesService: ProtocoFeesService,
    private readonly poolSnapshots: PoolSnapshotService,
  ) {}

  setPrimaryTokens(tokens: string[]) {
    this.primaryTokens = tokens;
  }

  async updateAprForPools(pools: PrismaPoolWithExpandedNesting[]): Promise<void> {
    try {
      const operations: any[] = [];
      const [gauges, tokenPrices] = await Promise.all([
        this.gaugeService.getCoreGauges(),
        this.pricingService.getCurrentTokenPrices(),
      ]);

      // Not awaiting these
      this.updateGaugeNativeAprs(pools);
      this.updateVeVrtkApr();

      for (const pool of pools) {
        const gauge = gauges.find((g) => g.address === pool.staking?.gauge?.gaugeAddress);

        if (!gauge || !pool.dynamicData) {
          continue;
        }

        const totalShares = parseFloat(pool.dynamicData.totalShares);
        const gaugeTvl =
          totalShares > 0
            ? (parseFloat(gauge.totalSupply) / totalShares) * pool.dynamicData.totalLiquidity
            : 0;

        let thirdPartyApr = 0;

        for (let rewardToken of gauge.rewardTokens) {
          // Missing price shouldn't be possible since gauges stored in database are only ones added to gauge controller
          const tokenPrice =
            this.pricingService.getPriceForToken(tokenPrices, rewardToken.address) || 0.1;

          const rewardTokenPerYear = rewardToken.rewardsPerSecond * ONE_YEAR_SECONDS;
          const rewardTokenValuePerYear = tokenPrice * rewardTokenPerYear;
          const rewardApr = gaugeTvl > 0 ? rewardTokenValuePerYear / gaugeTvl : 0;

          const isThirdPartyApr = !this.primaryTokens.includes(rewardToken.address);
          if (isThirdPartyApr) {
            thirdPartyApr += rewardApr;
          }

          const item: PrismaPoolAprItem = {
            id: `${pool.id}-${rewardToken.symbol}-apr`,
            poolId: pool.id,
            title: `${rewardToken.symbol} reward APR`,
            apr: rewardApr,
            type: isThirdPartyApr ? 'THIRD_PARTY_REWARD' : 'NATIVE_REWARD',
            group: null,
          };

          operations.push(
            this.prisma.prismaPoolAprItem.upsert({
              where: { id: item.id },
              update: item,
              create: item,
            }),
          );
        }
      }

      await prismaBulkExecuteOperations(operations);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async updateVeVrtkApr() {
    const operations = [];
    // TODO: Need to check fee distributor because we may add multiple tokens
    const vrtkPool = await this.prisma.prismaPool.findFirst({
      where: {
        id: networkConfig.balancer.votingEscrow.lockablePoolId,
      },
      ...prismaPoolWithExpandedNesting,
    });

    const vrtkApCalc = await this.veBalAprService.calc(
      vrtkPool.dynamicData.totalLiquidity.toString(),
      vrtkPool.dynamicData.totalShares,
    );

    const item: PrismaPoolAprItem = {
      id: `${vrtkPool.id}-veVRTK-apr`,
      poolId: vrtkPool.id,
      title: `veVRTK reward APR`,
      apr: parseFloat(vrtkApCalc),
      type: 'VE_VRTK',
      group: null,
    };

    operations.push(
      this.prisma.prismaPoolAprItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      }),
    );

    await prismaBulkExecuteOperations(operations);
  }

  async updateGaugeNativeAprs(pools: PrismaPoolWithExpandedNesting[]) {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const gaugeData = protoData.gauges.map((g) => {
      return {
        id: g.address,
        poolId: g.poolId,
      };
    });

    const gaugeAprs: any[] = await this.getGaugeBALAprs({
      pools,
      gauges: gaugeData,
    });

    let operations: any[] = [];

    for (const aprInfo of Object.entries(gaugeAprs)) {
      const [poolId, aprs] = aprInfo;

      const pool = gaugeData.find((g) => g.poolId === poolId);
      if (!pool) {
        console.log(`No apr info for pool id: ${poolId}`);
        continue;
      }

      const max = parseFloat(aprs.max);
      const min = parseFloat(aprs.min);
      const userApr = max;

      const aprItemId = `${poolId}-VRTK-apr`;

      const aprRange: PrismaPoolAprRange = {
        id: `${poolId}-VRTK-apr-range`,
        aprItemId,
        min,
        max,
      };

      operations.push(
        this.prisma.prismaPoolAprItem.upsert({
          where: { id: aprItemId },
          create: {
            id: aprItemId,
            poolId,
            title: 'VRTK reward APR',
            apr: userApr,
            type: 'NATIVE_REWARD',
          },
          update: { apr: userApr },
        }),
      );

      operations.push(
        this.prisma.prismaPoolAprRange.upsert({
          where: { id: aprRange.id },
          create: aprRange,
          update: aprRange,
        }),
      );
    }

    await prismaBulkExecuteOperations(operations);
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

        const totalSupply = bnum(totalSupplies[getAddress(gauge.id)]);

        // console.log(poolId);
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

    const result = await multicaller.execute('VeGaugeAprService:getWorkingSupplyForGauges');
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
    const result = await multicaller.execute('VeGaugeAprService:getTotalSupplyForGauges');
    const supplies = mapValues(result, (weight) => {
      return weight ? formatUnits(weight, 18) : '0.0';
    });
    return supplies;
  }

  private async getRelativeWeightsForGauges(gaugeAddresses: string[]) {
    // the ve bal helpers contract for gauge weights calls
    // the checkpoint function which is necesary for returning
    // the correct value.
    try {
      const gaugeController = new Contract(
        getContractAddress('GaugeController'),
        [
          'function gauge_relative_weight(address, uint) public view returns(uint)',
          'function time_total() public view returns(uint)',
        ],
        this.rpc.provider,
      );
      const nextEpochTs: BigNumber = await gaugeController.time_total();
      const multicaller = new Multicaller(this.rpc, [
        'function getCappedRelativeWeight(uint) public view returns(uint)',
      ]);

      for (const gaugeAddress of gaugeAddresses) {
        multicaller.call(`${gaugeAddress}.weight`, gaugeAddress, 'getCappedRelativeWeight', [
          nextEpochTs,
        ]);
      }

      const result = await multicaller.execute<Record<string, { weight: BigNumber }>>(
        'VeGaugeAprService:getRelativeWeightsForGauges',
      );

      const weightMap: Record<string, string> = {};
      for (const address in result) {
        weightMap[address] = formatUnits(result[address].weight);
      }

      return weightMap;
    } catch (error) {
      console.log(error);
    }
  }
}
