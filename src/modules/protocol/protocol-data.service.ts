import { BigNumber } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { AccountWeb3 } from '../common/types';
import { Multicaller } from '../common/web3/multicaller';
import { RPC } from '../common/web3/rpc.provider';
import { ethNum } from '../utils/old-big-number';
import { ProtocolService } from './protocol.service';

@Injectable()
export class ProtocolDataService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly protocolService: ProtocolService,
  ) {}

  async getAllGaugePendingProtocolFees() {
    const protoData = await this.protocolService.getProtocolConfigDataForChain();
    const pools = await this.prisma.prismaPool.findMany({
      where: {
        id: { in: protoData.gauges.map((g) => g.poolId) },
      },
      include: {
        staking: { include: { gauge: true } },
      },
    });

    const tokens = await this.prisma.prismaToken.findMany({ include: { types: true } });
    console.log(tokens[0]);
    //console.log(pools[0]);

    const multicaller = new Multicaller(this.rpc, [
      'function getAccumulatedFees() public view returns (uint256)',
    ]);

    pools.forEach((pool) => {
      if (pool.staking.gauge.id !== '0x9740727f14461738AF5a37a433D397822380c637') {
        multicaller.call(
          `${pool.staking.gauge.id}.pendingFees`,
          pool.staking.gauge.id,
          'getAccumulatedFees',
        );
      }
    });

    const result = await multicaller.execute<Record<string, { pendingFees: BigNumber }>>();

    return Object.entries(result).map((feeInfo) => {
      const gaugeAddress = feeInfo[0];
      const pool = pools.find((p) => p.staking.gauge.id === gaugeAddress);
      return {
        poolId: pool.id,
        poolName: pool.name,
        gaugeAddress,
        pendingPoolTokensFee: ethNum(feeInfo[1].pendingFees),
      };
    });
  }
}
