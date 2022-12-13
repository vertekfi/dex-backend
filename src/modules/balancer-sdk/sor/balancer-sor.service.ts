import { FundManagement } from '@balancer-labs/sdk';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Injectable } from '@nestjs/common';
import { PrismaToken } from '@prisma/client';
import axios from 'axios';
import { BigNumber } from 'ethers';
import { env } from 'process';
import { GqlSorGetSwapsResponse, GqlSorSwapOptionsInput } from 'src/gql-addons';
import { TokenAmountHumanReadable } from 'src/modules/common/types';
import { ContractService } from 'src/modules/common/web3/contract.service';
import { ZERO_ADDRESS } from 'src/modules/common/web3/utils';
import { PoolService } from 'src/modules/pool/pool.service';
import { networkConfig, DeploymentEnv } from '../../config/network-config';
import { replaceEthWithZeroAddress, replaceZeroAddressWithEth } from '../../utils/addresses';
import { oldBnum } from '../../utils/old-big-number';
import { GetSwapsInput, SwapInfo, SwapTypes, SwapV2 } from './type';

@Injectable()
export class BalancerSorService {
  constructor(
    private readonly poolService: PoolService,
    private readonly contractService: ContractService,
  ) {}

  async getSwaps({
    tokenIn,
    tokenOut,
    swapType,
    swapOptions,
    swapAmount,
    tokens,
  }: GetSwapsInput): Promise<GqlSorGetSwapsResponse> {
    tokenIn = replaceEthWithZeroAddress(tokenIn);
    tokenOut = replaceEthWithZeroAddress(tokenOut);

    const tokenDecimals = this.getTokenDecimals(
      swapType === 'EXACT_IN' ? tokenIn : tokenOut,
      tokens,
    );
    const swapAmountScaled = parseFixed(swapAmount, tokenDecimals);

    const { data } = await axios.post<{ swapInfo: SwapInfo }>(
      networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].url,
      {
        swapType,
        tokenIn,
        tokenOut,
        swapAmountScaled,
        swapOptions: {
          maxPools:
            swapOptions.maxPools || networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].maxPools,
          forceRefresh:
            swapOptions.forceRefresh ||
            networkConfig.sor[env.DEPLOYMENT_ENV as DeploymentEnv].forceRefresh,
        },
      },
    );
    const swapInfo = data.swapInfo;

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

    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      this.getTokenDecimals(swapType === 'EXACT_IN' ? tokenOut : tokenIn, tokens),
    );

    const pools = await this.poolService.getGqlPools({
      where: { idIn: swapInfo.routes.map((route) => route.hops.map((hop) => hop.poolId)).flat() },
    });

    const tokenInAmount = swapType === 'EXACT_IN' ? swapAmount : returnAmount;
    const tokenOutAmount = swapType === 'EXACT_IN' ? returnAmount : swapAmount;

    const effectivePrice = oldBnum(tokenInAmount).div(tokenOutAmount);
    const effectivePriceReversed = oldBnum(tokenOutAmount).div(tokenInAmount);
    const priceImpact = effectivePrice.div(swapInfo.marketSp).minus(1);

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
      routes: swapInfo.routes.map((route) => ({
        ...route,
        hops: route.hops.map((hop) => ({
          ...hop,
          pool: pools.find((pool) => pool.id === hop.poolId)!,
        })),
      })),
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

    tokenAddress = tokenAddress.toLowerCase();
    const match = tokens.find((token) => token.address === tokenAddress);

    if (!match) {
      throw new Error('Unknown token: ' + tokenAddress);
    }

    return match.decimals;
  }
}
