import { SwapInfo } from '@balancer-labs/sdk';
import { SerializedSwapInfo } from '../types';

export function serializeSwapInfo(swapInfo: SwapInfo): SerializedSwapInfo {
  const serializedSwapInfo: SerializedSwapInfo = {
    tokenAddresses: swapInfo.tokenAddresses,
    swaps: swapInfo.swaps,
    swapAmount: swapInfo.swapAmount.toString(),
    swapAmountForSwaps: swapInfo.swapAmountForSwaps ? swapInfo.swapAmountForSwaps.toString() : '',
    returnAmount: swapInfo.returnAmount.toString(),
    returnAmountFromSwaps: swapInfo.returnAmountFromSwaps
      ? swapInfo.returnAmountFromSwaps.toString()
      : '',
    returnAmountConsideringFees: swapInfo.returnAmountConsideringFees.toString(),
    tokenIn: swapInfo.tokenIn,
    tokenOut: swapInfo.tokenOut,
    marketSp: swapInfo.marketSp,
    // routes: swapInfo.routes,
  };

  return serializedSwapInfo;
}
