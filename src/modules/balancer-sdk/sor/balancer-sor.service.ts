import { FundManagement, SwapType } from '@balancer-labs/sdk';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import { BigNumber } from 'ethers';
import { getAddress, parseUnits } from 'ethers/lib/utils';
import {
  GqlSorGetSwapsResponse,
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
import { SorApiService } from './api/sor-api.service';
import { GetSwapsInput, Order, PoolFilter, SwapTypes, SwapV2 } from './types';
import { TokenService } from 'src/modules/common/token/token.service';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { SorPriceService } from './api/sor-price.service';
import { SubgraphPoolDataService } from './api/subgraphPoolDataService';
import { SOR } from './impl/wrapper';
import { PrismaService } from 'nestjs-prisma';
import { getDexPriceFromPair } from 'src/modules/common/token/dexscreener';

const SWAP_COST = process.env.APP_SWAP_COST || '100000';
const GAS_PRICE = process.env.APP_GAS_PRICE || '100000000000';

@Injectable()
export class BalancerSorService {
  private readonly sor: SOR;

  constructor(
    private readonly contractService: ContractService,
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly tokenService: TokenService,
    private readonly poolDataService: SubgraphPoolDataService,
    private readonly sorPriceService: SorPriceService,
    private readonly prisma: PrismaService,
    private readonly poolService: PoolService,
  ) {
    this.sor = new SOR(
      this.rpc.provider,
      {
        chainId: this.rpc.chainId,
        vault: CONTRACT_MAP.VAULT[this.rpc.chainId],
        weth: networkConfig.weth.address,
      },
      this.poolDataService,
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

    /*const swapInfo = await balancerSdk.sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType === 'EXACT_IN' ? SwapTypes.SwapExactIn : SwapTypes.SwapExactOut,
        swapAmountScaled,
        {
            timestamp: swapOptions.timestamp || Math.floor(Date.now() / 1000),
            //TODO: move this to env
            maxPools: swapOptions.maxPools || 8,
            forceRefresh: swapOptions.forceRefresh || false,
            boostedPools,
            //TODO: support gas price and swap gas
        },
    );*/

    // console.log(tokenIn);
    // console.log(tokenOut);

    const [tokenInfoIn, tokenInfoOut] = await Promise.all([
      this.getToken(tokenIn),
      this.getToken(tokenOut),
    ]);

    // console.log(tokenInfoIn);
    // console.log(tokenInfoOut);

    const priceOfNativeAssetInBuyToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenInfoIn.price, 36)), 36),
    );

    const priceOfNativeAssetInSellToken = Number(
      formatFixed(parseFixed('1', 72).div(parseFixed(tokenInfoOut.price, 36)), 36),
    );
    // 0x3416cF6C708Da44DB2624D63ea0AAef7113527C6
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

    const swapInfo = await this.sor.getSwaps(
      tokenIn,
      tokenOut,
      sorSwapType,
      swapAmountScaled,
      options,
    );

    console.log('SorService: swapInfo result =');
    console.log(swapInfo);

    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      this.getTokenDecimals(isExactInSwap ? tokenOut : tokenIn, tokens),
    );

    const tokenInAmount = isExactInSwap ? swapAmount : returnAmount;
    const tokenOutAmount = isExactInSwap ? returnAmount : swapAmount;

    const effectivePrice = oldBnum(tokenInAmount).div(tokenOutAmount);
    const effectivePriceReversed = oldBnum(tokenOutAmount).div(tokenInAmount);
    const priceImpact = effectivePrice.div(swapInfo.marketSp).minus(1);

    // Will be cached at this point
    // const pools = await this.sor.getPools();
    const hops: GqlSorSwapRouteHop[] = [];

    const poolIds = swapInfo.swaps.map((path) => path.poolId);

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

    // TODO: Probably already a method on the sor to extract the routing/hop info for a given swap

    const routes = swapInfo.swaps.map((path): GqlSorSwapRoute => {
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

  private async getToken(address: string) {
    const token = await this.prisma.prismaToken.findUniqueOrThrow({
      where: {
        address,
      },
    });
    if (!token) {
      throw new Error('Unknown token: ' + address);
    }

    console.log(token);

    if (token.useDexscreener) {
      if (address === '0xb269a278e427478712e2af0eba728021157a2114') {
        return {
          // TODO: testing
          ...token,
          price: '9',
        };
      }
      const info = await getDexPriceFromPair('bsc', token.dexscreenPairAddress);
      return {
        ...token,
        price: String(info.priceNum),
      };
    } else {
      throw new Error('Dexscreener not set');
    }
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
