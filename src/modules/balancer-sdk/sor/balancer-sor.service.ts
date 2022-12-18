import { FundManagement, SwapType } from '@balancer-labs/sdk';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import { BigNumber } from 'ethers';
import { getAddress, parseUnits } from 'ethers/lib/utils';
import { GqlSorGetSwapsResponse, GqlSorSwapOptionsInput } from 'src/gql-addons';
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

@Injectable()
export class BalancerSorService {
  private readonly sor: SOR;

  constructor(
    private readonly contractService: ContractService,
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly tokenService: TokenService,
    private readonly poolDataService: SubgraphPoolDataService,
    private readonly sorPriceService: SorPriceService,
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

    const isExactInSwap = swapType === SwapTypes.SwapExactIn;

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

    // TODO: replace locally
    // const { data } = await axios.post<{ swapInfo: SwapInfo }>(
    //   networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].url,
    //   {
    //     swapType,
    //     tokenIn,
    //     tokenOut,
    //     swapAmountScaled,
    //     swapOptions: {
    //       maxPools:
    //         swapOptions.maxPools || networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].maxPools,
    //       forceRefresh:
    //         swapOptions.forceRefresh ||
    //         networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].forceRefresh,
    //     },
    //   },
    // );

    // const swapInfo = data.swapInfo;

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

    // const order: Order = {
    //   sellToken: tokenIn,
    //   buyToken: tokenOut,
    //   orderKind: swapType,
    //   amount: swapAmountScaled, // TODO: Should this be swapAmountScaled using formatEther?
    //   // Believe gas items are required looking at sor code
    //   gasPrice: parseUnits('5', 'gwei'),
    // };

    await this.sor.fetchPools();

    const deez = await this.sor.getPools();
    // console.log(deez);

    // const swapInfo = await this.sor.getSwaps(tokenIn, tokenOut, swapType, swapAmount, {
    //   forceRefresh: swapOptions.forceRefresh || networkConfig.sor.forceRefresh,
    //   maxPools: swapOptions.maxPools || networkConfig.sor.maxPools,
    //   poolTypeFilter: PoolFilter.All,
    //   gasPrice: parseUnits('5', 'gwei'),
    // });

    const swapInfo = await this.sor.getSwaps(tokenIn, tokenOut, swapType, swapAmount, {
      forceRefresh: true,
      maxPools: 8,
      poolTypeFilter: PoolFilter.All,
      gasPrice: parseUnits('5', 'gwei'),
    });

    // console.log('SorService: swapInfo');
    // console.log(swapInfo);

    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      this.getTokenDecimals(isExactInSwap ? tokenOut : tokenIn, tokens),
    );

    // const pools = await this.poolService.getGqlPools({
    //   where: { idIn: swapInfo.routes.map((route) => route.hops.map((hop) => hop.poolId)).flat() },
    // });

    const tokenInAmount = isExactInSwap ? swapAmount : returnAmount;
    const tokenOutAmount = isExactInSwap ? returnAmount : swapAmount;

    // console.log('tokenInAmount: ' + tokenInAmount);
    // console.log('tokenOutAmount: ' + tokenOutAmount);

    const effectivePrice = oldBnum(tokenInAmount).div(tokenOutAmount);
    const effectivePriceReversed = oldBnum(tokenOutAmount).div(tokenInAmount);
    const priceImpact = effectivePrice.div(swapInfo.marketSp).minus(1);

    const routes = swapInfo.swaps.length ? [] : [];

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
      routes: [],
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
        swapType: SwapTypes.SwapExactIn,
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

  private async mapSwapRoutes() {
    //
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
}
