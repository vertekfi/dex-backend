import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaTokenCurrentPrice, PrismaTokenType } from '@prisma/client';
import * as moment from 'moment';
import { PrismaService } from 'nestjs-prisma';
import { GaugeService } from '../common/gauges/gauge.service';
import { TokenPriceService } from '../common/token/pricing/token-price.service';
import { AccountWeb3 } from '../common/types';
import { getContractAddress } from '../common/web3/contract';
import { Multicaller } from '../common/web3/multicaller';
import { RPC } from '../common/web3/rpc.provider';
import { bscScanService } from '../utils/bsc-scan.service';
import { getEventData } from '../utils/event-scraping';
import { logging } from '../utils/logger';
import { ethNum } from '../utils/old-big-number';
import { ProtocolService } from './protocol.service';

@Injectable()
export class ProtocolDataService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
    private readonly priceService: TokenPriceService,
    private readonly gaugeService: GaugeService,
  ) {}

  async getGaugeFees(hoursInPast: number) {
    const [pools, prices] = await Promise.all([
      this.gaugeService.getPoolGaugesWithFees(),
      this.priceService.getCurrentTokenPrices(),
    ]);

    if (hoursInPast && hoursInPast > 7 * 24) {
      hoursInPast = 7 * 24;
    }
    hoursInPast = hoursInPast || 24;

    logging.info(`Checking gauge fees for (${hoursInPast}) hours in the past`);

    const [currentBlockNumber, blockNumberOneDayAgo] = await Promise.all([
      this.rpc.provider.getBlockNumber(),
      bscScanService.getBlockNumberByTimestamp(moment().subtract(hoursInPast, 'hours').unix()),
    ]);

    const fees = [];

    for (const pool of [pools[10]]) {
      logging.info(`Check 24 hour gauge fees for "${pool.name}"`);

      const gauge = pool.staking.gauge;

      const gaugeInstance = new Contract(
        gauge.gaugeAddress,
        ['event FeesWithdraw(uint256 fee_amount)'],
        this.rpc.provider,
      );

      await getEventData(
        gaugeInstance,
        'FeesWithdraw',
        blockNumberOneDayAgo,
        currentBlockNumber,
        5000,
        (evt) => {
          const amount = ethNum(evt.args.fee_amount);
          const price = prices.find((p) => p.tokenAddress === pool.address);
          const value = amount * price.price;

          fees.push({
            gauge: gauge.gaugeAddress,
            amount,
            value,
          });
        },
      );
    }

    console.log(fees);
  }

  async getAllPendingFeeData(onlyWithBalances: boolean) {
    const bpts = await this.getPoolsAndBptsWithPrice();
    let [gauges, feeCollector] = await Promise.all([
      this.getAllGaugePendingProtocolFees(bpts),
      this.getFeeCollectorPendingInfo(bpts),
    ]);

    if (onlyWithBalances) {
      gauges.values = gauges.values.filter((g) => g.valueUSD > 0);
      feeCollector.values = feeCollector.values.filter((f) => f.valueUSD > 0);
    }

    return {
      totalValueUSD: gauges.totalValueUSD + feeCollector.totalValueUSD,
      gauges,
      feeCollector,
    };
  }

  async getAllGaugePendingProtocolFees(bpts: Array<PrismaTokenType & PrismaTokenCurrentPrice>) {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();

    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: protoData.gauges.map((g) => g.poolId) },
      },
      include: {
        staking: { include: { gauge: true } },
      },
    });

    const multicaller = new Multicaller(this.rpc, [
      'function getAccumulatedFees() public view returns (uint256)',
    ]);

    pools.forEach((pool) => {
      // Skip StakelessGauge
      if (
        pool.staking.gauge &&
        pool.staking.gauge.id !== '0x9740727f14461738AF5a37a433D397822380c637'
      ) {
        multicaller.call(
          `${pool.staking.gauge.id}.pendingFees`,
          pool.staking.gauge.id,
          'getAccumulatedFees',
        );
      }
    });

    const result = await multicaller.execute<Record<string, { pendingFees: BigNumber }>>(
      'ProtocolDataService:getAllGaugePendingProtocolFees',
    );

    const values = Object.entries(result).map((feeInfo) => {
      const gaugeAddress = feeInfo[0];

      // List is based on current gauges, so we know this is good
      const pool = pools.find((p) => p.staking.gauge.id === gaugeAddress);
      const gauge = pool.staking.gauge.symbol;
      const amount = ethNum(feeInfo[1].pendingFees);
      const valueUSD = this.getAmountValueUSD(bpts, pool.address, ethNum(feeInfo[1].pendingFees));

      return {
        poolId: pool.id,
        poolName: pool.name,
        poolAddress: pool.address,
        gauge,
        gaugeAddress,
        amount,
        valueUSD,
      };
    });

    return {
      totalValueUSD: values.reduce((prev, current) => prev + current.valueUSD, 0),
      values,
    };
  }

  async getFeeCollectorPendingInfo(bpts: Array<PrismaTokenType & PrismaTokenCurrentPrice>) {
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        categories: {
          none: { category: 'BLACK_LISTED' },
        },
      },
    });
    const multicaller = new Multicaller(this.rpc, [
      'function balanceOf(address) public view returns (uint256)',
    ]);

    const feeCollecorAddress = getContractAddress('ProtocolFeesCollector');
    for (const pool of pools) {
      multicaller.call(`${pool.address}.balance`, pool.address, 'balanceOf', [feeCollecorAddress]);
    }

    const results = await multicaller.execute<{ [address: string]: { balance: BigNumber } }>(
      'ProtocolDataService:getFeeCollectorPendingInfo',
    );

    let totalValueUSD = 0;
    const values = Object.entries(results).map((feeInfo) => {
      const poolAddress = feeInfo[0];
      const poolBalance = ethNum(feeInfo[1].balance);
      const valueUSD = this.getAmountValueUSD(bpts, poolAddress, poolBalance);
      const pool = pools.find((p) => p.address === poolAddress);

      totalValueUSD += valueUSD;

      return {
        token: poolAddress,
        poolId: pool.id,
        poolAddress,
        poolName: pool.name,
        amount: String(poolBalance),
        valueUSD,
      };
    });

    return {
      totalValueUSD,
      values,
    };
  }

  async getPoolsAndBptsWithPrice() {
    const tokens = await this.prisma.prismaToken.findMany({
      include: {
        types: {
          where: {
            type: 'BPT',
          },
        },
        currentPrice: true,
      },
    });

    const bpts: Array<PrismaTokenType & PrismaTokenCurrentPrice> = [];
    for (const token of tokens) {
      const pt = token.types.find((type) => type.type === 'BPT');
      if (pt && token.currentPrice?.price)
        bpts.push({
          ...token.types.find((type) => type.type === 'BPT'),
          ...token.currentPrice,
        });
    }

    return bpts;
  }

  private getAmountValueUSD(
    bpts: Array<PrismaTokenType & PrismaTokenCurrentPrice>,
    poolAddress: string,
    amount: number,
  ) {
    const bptInfo = bpts.find((b) => b.tokenAddress === poolAddress);

    if (bptInfo) {
      const valueUSD = bptInfo.price * amount;
      return valueUSD;
    } else {
      console.log('getFeeCollectorBalances: No bpt match for pool address: ' + poolAddress);
      return 0;
    }
  }
}
