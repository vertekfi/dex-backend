import { BalancerSDK } from '@balancer-labs/sdk';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { Inject, Injectable } from '@nestjs/common';
import { TokenService } from 'src/modules/common/token/token.service';
import { AccountWeb3 } from 'src/modules/common/types';
import { RPC } from 'src/modules/common/web3/rpc.provider';
import { Order, SerializedSwapInfo, SwapOptions, SwapTypes } from '../types';
import { serializeSwapInfo } from '../utils/function-utils';
import { SOR } from '@balancer-labs/sor';
import { SubgraphPoolDataService } from './subgraphPoolDataService';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { networkConfig } from 'src/modules/config/network-config';
import { SorPriceService } from './sor-price.service';

// import { SorApiUtils } from './sor-api-utils.service';

let log = console.log;

@Injectable()
export class SorApiService {
  constructor(
    @Inject(RPC) private rpc: AccountWeb3,
    private readonly tokenService: TokenService,
    private readonly poolDataService: SubgraphPoolDataService,
    private readonly sorPriceService: SorPriceService,
  ) {}

  async getSorSwap(order: Order, options: SwapOptions): Promise<SerializedSwapInfo> {
    log(`Getting swap: ${JSON.stringify(order)}`);
    // SDK/SOR will use this to retrieve pool list from db (default uses onchain call which will be slow)
    // const dbPoolDataService = new DatabasePoolDataService({
    //   chainId: chainId,
    // });
    // dbPoolDataService doesn't work for swaps through the boosted pools, which
    // seems to be caused by incorrect priceRates. Needs further investigation.

    // const balancer = new BalancerSDK({
    //   network: 56,
    //   rpcUrl: this.rpc.rpcUrl,
    //   // sor: {
    //   //   poolDataService: dbPoolDataService
    //   // },
    // });

    const sor = new SOR(
      this.rpc.provider,
      {
        chainId: this.rpc.chainId,
        vault: CONTRACT_MAP.VAULT[this.rpc.chainId],
        weth: networkConfig.weth.address,
      },
      this.poolDataService,
      this.sorPriceService,
    );

    const { sellToken, buyToken, orderKind, amount, gasPrice } = order;

    const [sellTokenDetails, buyTokenDetails] = await Promise.all([
      this.tokenService.getToken(sellToken),
      this.tokenService.getToken(buyToken),
    ]);

    log(
      `Sell token details for token ${this.rpc.chainId} ${sellToken}: ${JSON.stringify(
        sellTokenDetails,
      )}`,
    );
    log(
      `Buy token details for token ${this.rpc.chainId} ${buyToken}: ${JSON.stringify(
        buyTokenDetails,
      )}`,
    );

    // const nativeAssetPriceSymbol = this.sorUtils.getNativeAssetPriceSymbol(chainId);
    // let priceOfNativeAssetInSellToken = 0;
    // if (sellTokenDetails && sellTokenDetails.currentPrice.price) {
    //   if (typeof sellTokenDetails.currentPrice.price !== 'object') {
    //     priceOfNativeAssetInSellToken = sellTokenDetails.currentPrice.price;
    //   } else if (sellTokenDetails.currentPrice.price[nativeAssetPriceSymbol]) {
    //     priceOfNativeAssetInSellToken = Number(
    //       formatFixed(
    //         parseFixed('1', 72).div(parseFixed(sellTokenDetails.price[nativeAssetPriceSymbol], 36)),
    //         36,
    //       ),
    //     );
    //   }
    // }

    const priceOfNativeAssetInSellToken = Number(
      formatFixed(
        parseFixed('1', 72).div(parseFixed(sellTokenDetails.currentPrice?.price.toString(), 36)),
        36,
      ),
    );

    log(`Price of sell token ${sellToken}: `, priceOfNativeAssetInSellToken);
    sor.swapCostCalculator.setNativeAssetPriceInToken(
      sellToken,
      priceOfNativeAssetInSellToken.toString(),
    );

    // let priceOfNativeAssetInBuyToken = 0;
    // if (buyTokenDetails && buyTokenDetails.price) {
    //   if (typeof buyTokenDetails.price !== 'object') {
    //     priceOfNativeAssetInBuyToken = buyTokenDetails.price;
    //   } else if (buyTokenDetails.price[nativeAssetPriceSymbol]) {
    //     priceOfNativeAssetInBuyToken = Number(
    //       formatFixed(
    //         parseFixed('1', 72).div(parseFixed(buyTokenDetails.price[nativeAssetPriceSymbol], 36)),
    //         36,
    //       ),
    //     );
    //   }
    // }

    const priceOfNativeAssetInBuyToken = Number(
      formatFixed(
        parseFixed('1', 72).div(parseFixed(buyTokenDetails.currentPrice?.price.toString(), 36)),
        36,
      ),
    );
    log(`Price of buy token ${buyToken}: `, priceOfNativeAssetInBuyToken);
    sor.swapCostCalculator.setNativeAssetPriceInToken(
      buyToken,
      priceOfNativeAssetInBuyToken.toString(),
    );

    const tokenIn = sellToken;
    const tokenOut = buyToken;
    const swapType = this.orderKindToSwapType(orderKind);

    await sor.fetchPools();

    const buyTokenSymbol = buyTokenDetails ? buyTokenDetails.symbol : buyToken;
    const sellTokenSymbol = sellTokenDetails ? sellTokenDetails.symbol : sellToken;

    log(`${orderKind}ing ${amount} ${sellTokenSymbol}` + ` for ${buyTokenSymbol}`);
    log(orderKind);
    log(`Token In: ${tokenIn}`);
    log(`Token Out: ${tokenOut}`);
    log(`Amount: ${amount}`);
    const swapInfo = await sor.getSwaps(sellToken, buyToken, swapType, amount, options);

    log(`SwapInfo: ${JSON.stringify(swapInfo)}`);
    log(swapInfo.swaps);
    log(swapInfo.tokenAddresses);
    log(swapInfo.returnAmount.toString());

    const serializedSwapInfo = serializeSwapInfo(swapInfo);
    log(`Serialized SwapInfo: ${JSON.stringify(swapInfo)}`);

    return serializedSwapInfo;
  }

  orderKindToSwapType(orderKind: string): SwapTypes {
    switch (orderKind) {
      case 'sell':
        return SwapTypes.SwapExactIn;
      case 'buy':
        return SwapTypes.SwapExactOut;
      default:
        throw new Error(`invalid order kind ${orderKind}`);
    }
  }
}
