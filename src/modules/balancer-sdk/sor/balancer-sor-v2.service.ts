import { FundManagement, SwapInfo } from '@balancer-labs/sdk';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import { BigNumber } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import {
  GqlSorSwapOptionsInput,
  GqlSorSwapRoute,
  GqlSorSwapRouteHop,
  GqlSorSwapType,
} from 'src/gql-addons';
import { AccountWeb3, TokenAmountHumanReadable } from 'src/modules/common/types';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { ZERO_ADDRESS } from 'src/modules/common/web3/utils';
import { PoolService } from 'src/modules/pool/pool.service';
import { networkConfig } from '../../config/network-config';
import { replaceEthWithZeroAddress, replaceZeroAddressWithEth } from '../../utils/addresses';
import { oldBnum } from '../../utils/old-big-number';
import { GetSwapsInput, PoolFilter, SwapTypes, SwapV2 } from './types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { SorPriceService } from './api/sor-price.service';
import { SubgraphPoolDataService } from './api/subgraphPoolDataService';
import { SOR } from './impl/wrapper';
import { toLowerCaseArr } from 'src/modules/utils/general.utils';
import { BalancerSorV1Service } from './v1/balancer-sor-v1.service';

const SWAP_COST = process.env.APP_SWAP_COST || '100000';
const GAS_PRICE = process.env.APP_GAS_PRICE || '100000000000';

const V1_STABLES = toLowerCaseArr([
  '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  '0x55d398326f99059fF775485246999027B3197955',
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
]);

@Injectable()
export class BalancerSorV2Service {
  private readonly sor: SOR;

  constructor(
    private readonly contractService: ContractService,
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly sorPriceService: SorPriceService,
    private readonly poolService: PoolService,
    private readonly sorV1: BalancerSorV1Service,
  ) {
    this.sor = new SOR(
      this.rpc.provider,
      {
        chainId: this.rpc.chainId,
        vault: CONTRACT_MAP.VAULT[this.rpc.chainId],
        weth: networkConfig.weth.address,
      },
      new SubgraphPoolDataService(rpc, networkConfig.subgraphs.balancer),
      this.sorPriceService,
    );
  }

  async getSwaps({ tokenIn, tokenOut, swapType, swapOptions, swapAmount, tokens }: GetSwapsInput) {
    tokenIn = replaceEthWithZeroAddress(tokenIn);
    tokenOut = replaceEthWithZeroAddress(tokenOut);

    const isExactInSwap = swapType === 'EXACT_IN';

    const tokenDecimals = this.getTokenDecimals(isExactInSwap ? tokenIn : tokenOut, tokens);

    let swapAmountScaled = BigNumber.from(`0`);
    try {
      swapAmountScaled = parseFixed(swapAmount, tokenDecimals);
    } catch (e) {
      console.log(
        `Invalid input: Could not parse swapAmount ${swapAmount} with decimals ${tokenDecimals}`,
      );
      throw new Error('SOR: invalid swap amount input');
    }

    const [tokenInPrice, tokenOutPrice] = await Promise.all([
      this.sorPriceService.getTokenPrice(tokenIn),
      this.sorPriceService.getTokenPrice(tokenOut),
    ]);

    const priceOfNativeAssetInBuyToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenInPrice, 36)), 36),
    );

    const priceOfNativeAssetInSellToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenOutPrice, 36)), 36),
    );

    await Promise.all([
      this.sor.swapCostCalculator.setNativeAssetPriceInToken(
        tokenIn,
        priceOfNativeAssetInBuyToken.toString(),
      ),
      this.sor.swapCostCalculator.setNativeAssetPriceInToken(
        tokenOut,
        priceOfNativeAssetInSellToken.toString(),
      ),
    ]);

    const sorSwapType = this.orderKindToSwapType(swapType);

    const gasPrice = BigNumber.from(GAS_PRICE);
    const swapGas = BigNumber.from(SWAP_COST);

    console.time('[Sor] fetchPools');
    await this.sor.fetchPools();
    console.timeEnd(`[Sor] fetchPools`);

    const options = {
      forceRefresh: true,
      maxPools: 8,
      poolTypeFilter: PoolFilter.All,
      gasPrice,
      swapGas,
      timestamp: Math.floor(Date.now() / 1000),
    };

    let swapInfoV1: SwapInfo;
    let swapInfoV2: SwapInfo;

    const checkV1 = V1_STABLES.includes(tokenIn) && V1_STABLES.includes(tokenOut);
    if (checkV1) {
      const [swapV1, swapV2] = await Promise.all([
        this.sorV1.getSwaps({
          tokenIn,
          tokenOut,
          swapType,
          swapAmount,
          swapOptions,
          tokens,
        }),
        this.sor.getSwaps(tokenIn, tokenOut, sorSwapType, swapAmountScaled, options),
      ]);

      swapInfoV1 = swapV1;
      swapInfoV2 = swapV2;
    } else {
      swapInfoV2 = await this.sor.getSwaps(
        tokenIn,
        tokenOut,
        sorSwapType,
        swapAmountScaled,
        options,
      );
    }
    // const swapInfoV2 = await this.sor.getSwaps(
    //   tokenIn,
    //   tokenOut,
    //   sorSwapType,
    //   swapAmountScaled,
    //   options,
    // );

    console.log('SorService: swapInfo result =');
    console.log(swapInfoV2);

    const returnAmount = formatFixed(
      swapInfoV2.returnAmount,
      this.getTokenDecimals(isExactInSwap ? tokenOut : tokenIn, tokens),
    );

    const tokenInAmount = isExactInSwap ? swapAmount : returnAmount;
    const tokenOutAmount = isExactInSwap ? returnAmount : swapAmount;

    const effectivePrice = oldBnum(tokenInAmount).div(tokenOutAmount);
    const effectivePriceReversed = oldBnum(tokenOutAmount).div(tokenInAmount);
    const priceImpact = effectivePrice.div(swapInfoV2.marketSp).minus(1);

    // Will be cached at this point
    // const pools = await this.sor.getPools();
    const hops: GqlSorSwapRouteHop[] = [];

    const poolIds = swapInfoV2.swaps.map((path) => path.poolId);

    const gqlPoolsProms = poolIds.map((id) => this.poolService.getGqlPool(id));
    const gqlPools = await Promise.all(gqlPoolsProms);

    // TODO: Probably already a method on the sor to extract the routing/hop info for a given swap

    gqlPools.forEach((pool) => {
      const hop: GqlSorSwapRouteHop = {
        poolId: pool.id,
        pool: {
          id: pool.id,
          address: pool.address,
          decimals: pool.decimals,
          createTime: pool.createTime,
          name: pool.name,
          type: pool.type,
          symbol: pool.symbol,
          dynamicData: pool.dynamicData,
          allTokens: pool.allTokens,
          displayTokens: pool.displayTokens,
        },
        tokenIn,
        tokenOut,
        tokenInAmount,
        tokenOutAmount,
      };

      hops.push(hop);
    });

    const routes = swapInfoV2.swaps.map((path): GqlSorSwapRoute => {
      return {
        tokenIn,
        tokenOut,
        tokenInAmount,
        tokenOutAmount: path.returnAmount,
        share: 0,
        hops,
      };
    });

    return {
      ...swapInfoV2,
      tokenIn: replaceZeroAddressWithEth(swapInfoV2.tokenIn),
      tokenOut: replaceZeroAddressWithEth(swapInfoV2.tokenOut),
      swapType,
      tokenInAmount,
      tokenOutAmount,
      swapAmount,
      swapAmountScaled: BigNumber.from(swapInfoV2.swapAmount).toString(),
      swapAmountForSwaps: swapInfoV2.swapAmountForSwaps
        ? BigNumber.from(swapInfoV2.swapAmountForSwaps).toString()
        : undefined,
      returnAmount,
      returnAmountScaled: BigNumber.from(swapInfoV2.returnAmount).toString(),
      returnAmountConsideringFees: BigNumber.from(
        swapInfoV2.returnAmountConsideringFees,
      ).toString(),
      returnAmountFromSwaps: swapInfoV2.returnAmountFromSwaps
        ? BigNumber.from(swapInfoV2.returnAmountFromSwaps).toString()
        : undefined,
      // routes: swapInfo.routes.map((route) => ({
      //   ...route,
      //   hops: route.hops.map((hop) => ({
      //     ...hop,
      //     pool: pools.find((pool) => pool.id === hop.poolId)!,
      //   })),
      // })),
      routes,
      effectivePrice: effectivePrice.toString(),
      effectivePriceReversed: effectivePriceReversed.toString(),
      priceImpact: priceImpact.toString(),
    };
  }

  async getBatchSwapForTokensIn({
    tokensIn,
    tokenOut,
    swapOptions,
    tokens,
  }: {
    tokensIn: TokenAmountHumanReadable[];
    tokenOut: string;
    swapOptions: GqlSorSwapOptionsInput;
    tokens: PrismaToken[];
  }): Promise<{ tokenOutAmount: string; swaps: SwapV2[]; assets: string[] }> {
    const swaps: SwapV2[][] = [];
    const assetArray: string[][] = [];
    // get path information for each tokenIn
    for (let i = 0; i < tokensIn.length; i++) {
      const response = await this.getSwaps({
        tokenIn: tokensIn[i].address,
        swapAmount: tokensIn[i].amount,
        tokenOut,
        swapType: 'EXACT_IN',
        swapOptions,
        tokens,
      });

      console.log(tokensIn[i].address, response.swaps);
      console.log(tokensIn[i].address, response.tokenAddresses);

      swaps.push(response.swaps);
      assetArray.push(response.tokenAddresses);
    }

    // Join swaps and assets together correctly
    const batchedSwaps = this.batchSwaps(assetArray, swaps);

    console.log('batchedSwaps', batchedSwaps);

    let tokenOutAmountScaled = '0';
    try {
      // Onchain query
      const deltas = await this.queryBatchSwap(
        SwapTypes.SwapExactIn,
        batchedSwaps.swaps,
        batchedSwaps.assets,
      );
      tokenOutAmountScaled = deltas[batchedSwaps.assets.indexOf(tokenOut.toLowerCase())] ?? '0';
    } catch (err) {
      console.log(`queryBatchSwapTokensIn error: `, err);
    }

    const tokenOutAmount = formatFixed(
      tokenOutAmountScaled,
      this.getTokenDecimals(tokenOut, tokens),
    );

    return {
      tokenOutAmount,
      swaps: batchedSwaps.swaps,
      assets: batchedSwaps.assets,
    };
  }

  private batchSwaps(
    assetArray: string[][],
    swaps: SwapV2[][],
  ): { swaps: SwapV2[]; assets: string[] } {
    // assest addresses without duplicates
    const newAssetArray = [...new Set(assetArray.flat())];

    // Update indices of each swap to use new asset array
    swaps.forEach((swap, i) => {
      swap.forEach((poolSwap) => {
        poolSwap.assetInIndex = newAssetArray.indexOf(assetArray[i][poolSwap.assetInIndex]);
        poolSwap.assetOutIndex = newAssetArray.indexOf(assetArray[i][poolSwap.assetOutIndex]);
      });
    });

    // Join Swaps into a single batchSwap
    const batchedSwaps = swaps.flat();
    return { swaps: batchedSwaps, assets: newAssetArray };
  }

  private queryBatchSwap(
    swapType: SwapTypes,
    swaps: SwapV2[],
    assets: string[],
  ): Promise<string[]> {
    const vaultContract = this.contractService.getVault();
    const funds: FundManagement = {
      sender: ZERO_ADDRESS,
      recipient: ZERO_ADDRESS,
      fromInternalBalance: false,
      toInternalBalance: false,
    };

    return vaultContract.queryBatchSwap(swapType, swaps, assets, funds);
  }

  private getTokenDecimals(tokenAddress: string, tokens: PrismaToken[]): number {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18;
    }

    const match = tokens.find((token) => getAddress(token.address) === getAddress(tokenAddress));

    if (!match) {
      throw new Error('Unknown token: ' + tokenAddress);
    }

    return match.decimals;
  }

  private orderKindToSwapType(orderKind: GqlSorSwapType): SwapTypes {
    switch (orderKind) {
      case 'EXACT_IN':
        return SwapTypes.SwapExactIn;
      case 'EXACT_OUT':
        return SwapTypes.SwapExactOut;
      default:
        throw new Error(`invalid order kind ${orderKind}`);
    }
  }
}
