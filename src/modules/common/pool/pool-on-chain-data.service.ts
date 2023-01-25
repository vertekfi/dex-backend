import { isSameAddress } from '@balancer-labs/sdk';
import { Injectable } from '@nestjs/common';
import { formatFixed } from '@ethersproject/bignumber';
import { Inject } from '@nestjs/common';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { AccountWeb3 } from 'src/modules/common/types';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { MulticallExecuteResult, SUPPORTED_POOL_TYPES } from '../../pool/pool-types';
import { isComposableStablePool, isWeightedPoolV2, isStablePool } from '../../pool/lib/pool-utils';
import { PrismaService } from 'nestjs-prisma';
import { WeiPerEther } from '@ethersproject/constants';

import * as VaultAbi from '../../pool/abi/Vault.json';
import * as aTokenRateProvider from '../../pool/abi/StaticATokenRateProvider.json';
// import * as WeightedPoolAbi from '../../pool/abi/WeightedPool.json';
import * as StablePoolAbi from '../../pool/abi/StablePool.json';
import * as MetaStablePool from '../../pool/abi/MetaStablePool.json';
// import  * as ElementPoolAbi from '../../pool/abi/ConvergentCurvePool.json';
import * as LinearPoolAbi from '../../pool/abi/LinearPool.json';
import * as StablePhantomPoolAbi from '../../pool/abi/StablePhantomPool.json';
//import ComposableStablePoolAbi from '../../pool/abi/ComposableStablePool.json';
import WeightedPoolV2Abi from '../../pool/abi/WeightedPoolV2.json';
import * as LiquidityBootstrappingPoolAbi from '../../pool/abi/LiquidityBootstrappingPool.json';
import { Multicaller } from 'src/modules/common/web3/multicaller';
import { TokenPriceService } from '../token/pricing/token-price.service';

@Injectable()
export class PoolOnChainDataService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly prisma: PrismaService,
    private readonly pricingService: TokenPriceService,
  ) {}

  async updateOnChainData(poolIds: string[], blockNumber: number) {
    if (poolIds.length === 0) return;

    const tokenPrices = await this.pricingService.getCurrentTokenPrices();

    const pools = await this.prisma.prismaPool.findMany({
      where: { id: { in: poolIds } },
      include: {
        tokens: { orderBy: { index: 'asc' }, include: { dynamicData: true, token: true } },
        stableDynamicData: true,
        dynamicData: true,
        linearDynamicData: true,
        linearData: true,
      },
    });

    const abis: any = Object.values(
      // Remove duplicate entries using their names
      Object.fromEntries(
        [
          ...VaultAbi,
          ...aTokenRateProvider,
          //...WeightedPoolAbi,
          ...StablePoolAbi,
          // ...ElementPoolAbi,
          ...LinearPoolAbi,
          ...LiquidityBootstrappingPoolAbi,
          ...StablePhantomPoolAbi,
          ...MetaStablePool,
          //...ComposableStablePoolAbi,
          ...WeightedPoolV2Abi,
        ].map((row) => [row.name, row]),
      ),
    );

    const multiPool = new Multicaller(this.rpc, abis);

    pools.forEach((pool) => {
      if (!SUPPORTED_POOL_TYPES.includes(pool.type)) {
        console.error(`Unknown pool type: ${pool.type} ${pool.id}`);
        return;
      }
      multiPool.call(
        `${pool.id}.poolTokens`,
        CONTRACT_MAP.VAULT[this.rpc.chainId],
        'getPoolTokens',
        [pool.id],
      );

      // TO DO - Make this part of class to make more flexible?
      if (
        pool.type === 'WEIGHTED' ||
        pool.type === 'LIQUIDITY_BOOTSTRAPPING' ||
        pool.type === 'INVESTMENT'
      ) {
        multiPool.call(`${pool.id}.weights`, pool.address, 'getNormalizedWeights');
        multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
      } else if (isStablePool(pool.type)) {
        // MetaStable & StablePhantom is the same as Stable for multicall purposes
        multiPool.call(`${pool.id}.amp`, pool.address, 'getAmplificationParameter');
        multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
      } else if (pool.type === 'ELEMENT') {
        multiPool.call(`${pool.id}.swapFee`, pool.address, 'percentFee');
      } else if (pool.type === 'LINEAR') {
        multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');

        multiPool.call(`${pool.id}.targets`, pool.address, 'getTargets');
        multiPool.call(`${pool.id}.rate`, pool.address, 'getRate');
        multiPool.call(`${pool.id}.wrappedTokenRate`, pool.address, 'getWrappedTokenRate');
      }

      if (pool.type === 'LIQUIDITY_BOOTSTRAPPING' || pool.type === 'INVESTMENT') {
        multiPool.call(`${pool.id}.swapEnabled`, pool.address, 'getSwapEnabled');
      }

      if (pool.type === 'META_STABLE') {
        const tokenAddresses = pool.tokens.map((token) => token.address);

        tokenAddresses.forEach((token, i) => {
          multiPool.call(`${pool.id}.metaPriceRateCache[${i}]`, pool.address, 'getPriceRateCache', [
            token,
          ]);
        });
      }

      if (isComposableStablePool(pool) || isWeightedPoolV2(pool)) {
        // the new ComposableStablePool and WeightedPool mint bpts for protocol fees which are included in the getActualSupply call
        multiPool.call(`${pool.id}.totalSupply`, pool.address, 'getActualSupply');
      } else if (pool.type === 'LINEAR' || pool.type === 'PHANTOM_STABLE') {
        // the old phantom stable and linear pool does not have this and expose the actual supply as virtualSupply
        multiPool.call(`${pool.id}.totalSupply`, pool.address, 'getVirtualSupply');
      } else {
        //default to totalSupply for any other pool type
        multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');
      }

      if (pool.type === 'PHANTOM_STABLE') {
        //we retrieve token rates for phantom stable and composable stable pools
        const tokenAddresses = pool.tokens.map((token) => token.address);

        tokenAddresses.forEach((token, i) => {
          multiPool.call(`${pool.id}.tokenRates[${i}]`, pool.address, 'getTokenRate', [token]);
        });
      }
    });

    let poolsOnChainData = {} as Record<string, MulticallExecuteResult>;

    try {
      poolsOnChainData = (await multiPool.execute()) as Record<string, MulticallExecuteResult>;
    } catch (err: any) {
      console.error(err);
      throw `Issue with multicall execution. ${err}`;
    }

    const poolsOnChainDataArray = Object.entries(poolsOnChainData);
    const dataPools = [];

    for (let index = 0; index < poolsOnChainDataArray.length; index++) {
      const [poolId, onchainData] = poolsOnChainDataArray[index];
      const pool = pools.find((pool) => pool.id === poolId)!;
      const { poolTokens } = onchainData;

      dataPools.push({
        poolId,
        ...onchainData,
      });

      try {
        if (isStablePool(pool.type)) {
          if (!onchainData.amp) {
            console.log('onchain data', onchainData);
            console.error(`Stable Pool Missing Amp: ${poolId}`);
            continue;
          }

          // Need to scale amp by precision to match expected Subgraph scale
          // amp is stored with 3 decimals of precision
          const amp = formatFixed(onchainData.amp[0], 3);

          // only update if amp has changed
          if (!pool.stableDynamicData || pool.stableDynamicData.amp !== amp) {
            await this.prisma.prismaPoolStableDynamicData.upsert({
              where: { id: pool.id },
              create: { id: pool.id, poolId: pool.id, amp, blockNumber },
              update: { amp, blockNumber },
            });
          }
        }

        if (pool.type === 'LINEAR') {
          if (!onchainData.targets) {
            console.error(`Linear Pool Missing Targets: ${poolId}`);
            continue;
          } else {
            const lowerTarget = formatFixed(onchainData.targets[0], 18);
            const upperTarget = formatFixed(onchainData.targets[1], 18);

            if (
              !pool.linearDynamicData ||
              pool.linearDynamicData.lowerTarget !== lowerTarget ||
              pool.linearDynamicData.upperTarget !== upperTarget
            ) {
              await this.prisma.prismaPoolLinearDynamicData.upsert({
                where: { id: pool.id },
                create: { id: pool.id, poolId: pool.id, upperTarget, lowerTarget, blockNumber },
                update: { upperTarget, lowerTarget, blockNumber },
              });
            }
          }

          const wrappedIndex = pool.linearData?.wrappedIndex;
          if (typeof wrappedIndex !== 'number' || onchainData.wrappedTokenRate === undefined) {
            console.error(`Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`);
            continue;
          }

          //TODO: need to make sure its safe to index the tokens like this.

          onchainData.tokenRates = [];
          //main rate is always 1
          onchainData.tokenRates[pool.linearData?.mainIndex || 0] = WeiPerEther;

          // Update priceRate of wrappedToken
          if (pool.tokens[wrappedIndex]) {
            onchainData.tokenRates[wrappedIndex] = onchainData.wrappedTokenRate;
          }

          const phantomIdx = pool.tokens.findIndex((token) => token.address === pool.address);

          if (phantomIdx !== -1 && onchainData.rate) {
            onchainData.tokenRates[phantomIdx] = onchainData.rate;
          }
        }

        const swapFee = formatFixed(onchainData.swapFee, 18);
        const totalShares = formatFixed(onchainData.totalSupply, 18);
        const swapEnabled =
          typeof onchainData.swapEnabled !== 'undefined'
            ? onchainData.swapEnabled
            : pool.dynamicData?.swapEnabled;

        if (
          pool.dynamicData &&
          (pool.dynamicData.swapFee !== swapFee ||
            pool.dynamicData.totalShares !== totalShares ||
            pool.dynamicData.swapEnabled !== swapEnabled)
        ) {
          await this.prisma.prismaPoolDynamicData.update({
            where: { id: pool.id },
            data: {
              swapFee,
              totalShares,
              totalSharesNum: parseFloat(totalShares),
              swapEnabled: typeof swapEnabled !== 'undefined' ? swapEnabled : true,
              blockNumber,
            },
          });
        }

        for (let i = 0; i < poolTokens.tokens.length; i++) {
          const tokenAddress = poolTokens.tokens[i];
          const poolToken = pool.tokens.find((token) => isSameAddress(token.address, tokenAddress));

          if (!poolToken) {
            throw `Pool Missing Expected Token: ${poolId} ${tokenAddress}`;
          }

          const balance = formatFixed(poolTokens.balances[i], poolToken.token.decimals);
          const weight = onchainData.weights ? formatFixed(onchainData.weights[i], 18) : null;

          let priceRate = onchainData.tokenRates
            ? formatFixed(onchainData.tokenRates[i], 18)
            : '1.0';

          if (onchainData.metaPriceRateCache && onchainData.metaPriceRateCache[i][0].gt('0')) {
            priceRate = formatFixed(onchainData.metaPriceRateCache[i][0], 18);
          }

          if (
            !poolToken.dynamicData ||
            poolToken.dynamicData.balance !== balance ||
            poolToken.dynamicData.priceRate !== priceRate ||
            poolToken.dynamicData.weight !== weight
          ) {
            await this.prisma.prismaPoolTokenDynamicData.upsert({
              where: { id: poolToken.id },
              create: {
                id: poolToken.id,
                poolTokenId: poolToken.id,
                blockNumber,
                priceRate,
                weight,
                balance,
                balanceUSD:
                  poolToken.address === pool.address
                    ? 0
                    : this.pricingService.getPriceForToken(tokenPrices, poolToken.address) *
                      parseFloat(balance),
              },
              update: {
                blockNumber,
                priceRate,
                weight,
                balance,
                balanceUSD:
                  poolToken.address === pool.address
                    ? 0
                    : this.pricingService.getPriceForToken(tokenPrices, poolToken.address) *
                      parseFloat(balance),
              },
            });
          }
        }

        return dataPools;
      } catch (e) {
        console.log('error syncing on chain data', e);
      }
    }
  }
}
