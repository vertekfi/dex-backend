import { BigNumber } from '@ethersproject/bignumber';

export const hardhatConfig = {
  startBlock: 25100959, // vault deploy block
  chain: {
    slug: 'bsc',
    id: 31337,
    nativeAssetAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    wrappedNativeAssetAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  subgraphs: {
    startDate: '2024-01-28',
    balancer: 'https://api.thegraph.com/subgraphs/name/vertekfi/vertek-subgraph',
    gauges: 'https://api.thegraph.com/subgraphs/name/vertekfi/vertek-gauges-subgraph',
    blocks: 'https://api.thegraph.com/subgraphs/name/vertekfi/bsc-blocks',
    userBalances: '',
  },
  eth: {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    addressFormatted: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    symbol: 'BNB',
    name: 'BNB',
  },
  weth: {
    address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    addressFormatted: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  coingecko: {
    nativeAssetId: 'binancecoin',
    platformId: 'binance-smart-chain',
  },
  rpcUrl: 'https://bsc-dataseed.binance.org',
  beetsPriceProviderRpcUrl: 'https://bsc-dataseed.binance.org',
  beets: {
    address: '0xeD236c32f695c83Efde232c288701d6f9C23E60E',
  },
  bal: {
    address: '',
  },
  balancer: {
    vault: '0x719488F4E859953967eFE963c6Bed059BaAab60c',
    composableStablePoolFactories: [],
    weightedPoolV2Factories: ['0xDE8993Bf9D6Eb1e0d752fe56ccB85Ef76538ABb6'],
    weightedPoolFactories: [],
    swapProtocolFeePercentage: 0.25,
    yieldProtocolFeePercentage: 0.5,
    poolsInRecoveryMode: [],
    votingEscrow: {
      veAddress: '0x98A73443fb00EDC2EFF0520a00C53633226BF9ED',
      gaugeController: '0x99bFf5953843A211792BF3715b1b3b4CBeE34CE6',
      veBALHelpers: '0xab31C0E1019a8e08748235a76f94497AF9d8718E',
      tokenAdmin: '0x8A935a7c86CA749aD1C6fD7dAA0A916A0ACF8bF8',
      lockablePoolId: '0xdd64e2ec144571b4320f7bfb14a56b2b2cbf37ad000200000000000000000000',
      lockPoolAddress: '0xDD64E2EC144571b4320f7BFB14a56b2b2cBF37ad',
    },
  },
  multicall: '0x4Ba82B21658CAE1975Fa26097d87bd48FF270124',
  avgBlockSpeed: 3,
  sor: {
    url: '',
    maxPools: 4,
    forceRefresh: false,
    gasPrice: BigNumber.from(10),
    swapGas: BigNumber.from('1000000'),
  },
  protocol: {
    tokenListUrl: 'https://raw.githubusercontent.com/vertekfi/token-list/dev/tokenlist.json',
    tokenListMappingKey: 'https://raw.githubusercontent.com/vertekfi/token-list/dev/tokenlist.json',
    poolDataUrl: 'https://raw.githubusercontent.com/vertekfi/pool-data-config/main/pool-data.json',
  },
};
