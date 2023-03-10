import { FundManagement } from '@balancer-labs/sdk';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import { BigNumber } from 'ethers';
import { getAddress, parseUnits } from 'ethers/lib/utils';
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
import {
  replaceEthWithWeth,
  replaceEthWithZeroAddress,
  replaceWethWithEth,
  replaceZeroAddressWithEth,
} from '../../utils/addresses';
import { oldBnum } from '../../utils/old-big-number';
import { GetSwapsInput, PoolFilter, SwapOptions, SwapTypes } from './types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { SorPriceService } from './api/sor-price.service';
import { SubgraphPoolDataService } from './api/subgraphPoolDataService';
import { SOR } from './impl/wrapper';
import { PrismaService } from 'nestjs-prisma';
import { SorConfig, SwapV2 } from './impl/types';
import { getWrappedInfo } from './impl/wrapInfo';

const SWAP_COST = process.env.APP_SWAP_COST || '100000';
const GAS_PRICE = process.env.APP_GAS_PRICE || '100000000000';

/**
 * Wraps the underlying work for providing pool data and prices to the Smart Order Router in this backend setup.
 * Pool data and pricing info are provided by database values, opposed to subgraph queries and third party pricing API's.
 * Data for pools and pricing are constantly synced from external sources into a database at regular intervals.
 * So we use this data to provide what is needed for the order router as well.
 */
@Injectable()
export class BalancerSorService {
  private readonly sor: SOR;
  private readonly config: SorConfig = {
    chainId: this.rpc.chainId,
    vault: CONTRACT_MAP.VAULT[this.rpc.chainId],
    weth: networkConfig.weth.address,
  };

  constructor(
    private readonly contractService: ContractService,
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly poolDataService: SubgraphPoolDataService,
    private readonly sorPriceService: SorPriceService,
    private readonly prisma: PrismaService,
    private readonly poolService: PoolService,
  ) {
    this.sor = new SOR(this.rpc.provider, this.config, this.poolDataService, this.sorPriceService);
  }

  async getSwaps({ tokenIn, tokenOut, swapType, swapOptions, swapAmount, tokens }: GetSwapsInput) {
    tokenIn = replaceEthWithZeroAddress(tokenIn);
    tokenOut = replaceEthWithZeroAddress(tokenOut);
    // tokenIn = replaceEthWithWeth(tokenIn);
    // tokenOut = replaceEthWithWeth(tokenOut);

    const isExactInSwap = swapType === 'EXACT_IN';

    const tokenDecimals = this.getTokenDecimals(isExactInSwap ? tokenIn : tokenOut, tokens);
    const swapAmountScaled = this.getSwapAmountScaled(swapAmount, tokenDecimals);

    // Using our own local pricing setup from database
    // and manually setting `setNativeAssetPriceInToken` before continuing on
    await this.setSwapNativeInfo(tokenIn, tokenOut);
    const sorSwapType = this.orderKindToSwapType(swapType);

    // Cache pools and then get swaps
    await this.cacheSubgraphPools();

    const swapInfo = await this.sor.getSwaps(
      tokenIn,
      tokenOut,
      sorSwapType,
      swapAmountScaled,
      this.getSwapOptions(swapOptions),
    );
    // console.log('SorService: swapInfo result =');
    // console.log(swapInfo);

    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      this.getTokenDecimals(isExactInSwap ? tokenOut : tokenIn, tokens),
    );
    const tokenInAmount = isExactInSwap ? swapAmount : returnAmount;
    const tokenOutAmount = isExactInSwap ? returnAmount : swapAmount;
    const effectivePrice = oldBnum(tokenInAmount).div(tokenOutAmount);
    const effectivePriceReversed = oldBnum(tokenOutAmount).div(tokenInAmount);
    const priceImpact = effectivePrice.div(swapInfo.marketSp).minus(1);

    const routes = await this.getSwapResultPoolHops(
      swapInfo.swaps,
      tokenIn,
      tokenOut,
      tokenInAmount,
      tokenOutAmount,
    );

    const swapResults = {
      ...swapInfo,
      tokenIn: replaceZeroAddressWithEth(swapInfo.tokenIn),
      tokenOut: replaceZeroAddressWithEth(swapInfo.tokenOut),
      swapType,
      tokenInAmount,
      tokenOutAmount,
      swapAmount,
      swapAmountScaled: BigNumber.from(swapInfo.swapAmount).toString(),
      swapAmountForSwaps: swapInfo.swapAmountForSwaps
        ? BigNumber.from(swapInfo.swapAmountForSwaps).toString()
        : undefined,
      returnAmount,
      returnAmountScaled: BigNumber.from(swapInfo.returnAmount).toString(),
      returnAmountConsideringFees: BigNumber.from(swapInfo.returnAmountConsideringFees).toString(),
      returnAmountFromSwaps: swapInfo.returnAmountFromSwaps
        ? BigNumber.from(swapInfo.returnAmountFromSwaps).toString()
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

    // console.log(swapResults);

    return swapResults;
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

      console.log('getBatchSwapForTokensIn:');
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

  private async cacheSubgraphPools() {
    console.time('[Sor] fetchPools');
    await this.sor.fetchPools();
    console.timeEnd(`[Sor] fetchPools`);
  }

  private getSwapAmountScaled(swapAmount: string, tokenDecimals: number) {
    try {
      return parseFixed(swapAmount, tokenDecimals);
    } catch (e) {
      console.log(
        `Invalid input: Could not parse swapAmount ${swapAmount} with decimals ${tokenDecimals}`,
      );
      throw new Error('SOR: invalid swap amount input');
    }
  }

  private async setSwapNativeInfo(tokenIn: string, tokenOut: string) {
    // Using our own local pricing setup from database
    // and manually setting `setNativeAssetPriceInToken` before continuing on
    const [tokenInfoIn, tokenInfoOut] = await Promise.all([
      this.getToken(replaceZeroAddressWithEth(tokenIn)),
      this.getToken(replaceZeroAddressWithEth(tokenOut)),
    ]);

    const priceOfNativeAssetInBuyToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenInfoIn.price, 36)), 36),
    );
    const priceOfNativeAssetInSellToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenInfoOut.price, 36)), 36),
    );

    // Needs to be set before convertGasCostToToken is called
    this.sor.swapCostCalculator.setNativeAssetPriceInToken(
      tokenIn,
      priceOfNativeAssetInBuyToken.toString(),
    );
    this.sor.swapCostCalculator.setNativeAssetPriceInToken(
      tokenOut,
      priceOfNativeAssetInSellToken.toString(),
    );
  }

  private getSwapOptions(incomingOptions: GqlSorSwapOptionsInput): SwapOptions {
    const gasPrice = BigNumber.from(GAS_PRICE);
    const swapGas = BigNumber.from(SWAP_COST);
    const defaultSwapOptions = {
      forceRefresh: true,
      maxPools: 4,
      poolTypeFilter: PoolFilter.All,
      gasPrice,
      swapGas,
      timestamp: Math.floor(Date.now() / 1000),
    };

    return {
      ...defaultSwapOptions,
      ...incomingOptions,
    };
  }

  private async getSwapResultPoolHops(
    swaps: SwapV2[],
    tokenIn: string,
    tokenOut: string,
    tokenInAmount: string,
    tokenOutAmount: string,
  ) {
    // Using local pool data from database instead
    // const pools = await this.sor.getPools();
    const poolIds = swaps.map((path) => path.poolId);
    //  console.log(swaps);
    //  const gqlPoolsProms = poolIds.map((id) => this.poolService.getGqlPool(id));
    // const gqlPools = await Promise.all(gqlPoolsProms);
    const gqlPools = [];
    for (const id of poolIds) {
      gqlPools.push(await this.poolService.getGqlPool(id));
    }

    // TODO: Probably already a method on the sor to extract the routing/hop info for a given swap
    const hops: GqlSorSwapRouteHop[] = [];
    gqlPools.forEach((pool) => {
      if (!hops.find((p) => p.poolId === pool.id)) {
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
      }
    });

    const routes = swaps.map((path): GqlSorSwapRoute => {
      return {
        tokenIn,
        tokenOut,
        tokenInAmount,
        tokenOutAmount: path.returnAmount,
        share: 0,
        hops,
      };
    });

    // routes: swapInfo.routes.map((route) => ({
    //   ...route,
    //   hops: route.hops.map((hop) => ({
    //     ...hop,
    //     pool: pools.find((pool) => pool.id === hop.poolId)!,
    //   })),
    // })),

    // console.log(routes);

    return routes;
  }

  private async getToken(address: string) {
    address = replaceEthWithWeth(address);
    const token = await this.prisma.prismaToken.findUniqueOrThrow({
      where: {
        address,
      },
      include: {
        currentPrice: true,
      },
    });

    if (!token) {
      throw new Error('Unknown token: ' + address);
    }

    const result = {
      ...token,
      price: String(token.currentPrice.price),
    };
    // let price: string;
    // if (token.useDexscreener) {
    //   if (!token.dexscreenPairAddress) {
    //     throw new Error(`Missing dexscreenPairAddress for token ${token.address}`);
    //   }
    //   const info = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
    //   price = String(info.priceNum);
    // } else if (token.coingeckoTokenId) {
    //   if (!token.coingeckoPlatformId || !token.coingeckoContractAddress) {
    //     throw new Error(`Missing coingecko data for token ${token.address}`);
    //   }

    //   price = await this.sorPriceService.getTokenPrice(token as unknown as TokenDefinition);
    // } else if (token.usePoolPricing) {
    //   price = String(await this.poolPricing.getTokenPrice(token as unknown as TokenDefinition));
    // } else {
    //   throw new Error(`Token ${token.address} has no price provider...?`);
    // }

    return result;
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

    const match = tokens.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
    );

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
