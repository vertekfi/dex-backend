import { BigNumber } from 'ethers';

export type DeploymentEnv = 'canary' | 'main';

export interface NetworkConfig {
  startBlock: number;
  chain: {
    slug: string;
    id: number;
    nativeAssetAddress: string;
    wrappedNativeAssetAddress: string;
  };
  eth: {
    address: string;
    addressFormatted: string;
    symbol: string;
    name: string;
  };
  weth: {
    address: string;
    addressFormatted: string;
  };
  rpcUrl: string;
  beetsPriceProviderRpcUrl: string;
  coingecko: {
    nativeAssetId: string;
    platformId: string;
  };
  subgraphs: {
    startDate: string;
    balancer: string;
    blocks: string;
    gauges: string;
    userBalances: string;
  };
  beets: {
    address: string;
  };
  bal: {
    address: string;
  };
  balancer: {
    vault: string;
    weightedPoolV2Factories: string[];
    weightedPoolFactories: string[];
    composableStablePoolFactories: string[];
    poolsInRecoveryMode: string[];
    yieldProtocolFeePercentage: number;
    swapProtocolFeePercentage: number;
    votingEscrow: {
      veAddress: string;
      gaugeController: string;
      veBALHelpers: string;
      tokenAdmin: string;
      lockablePoolId: string;
      lockPoolAddress: string;
    };
  };
  multicall: string;
  overnight?: {
    aprEndpoint: string;
  };
  avgBlockSpeed: number;
  sor: {
    url: string;
    maxPools: number;
    forceRefresh: boolean;
    gasPrice: BigNumber;
    swapGas: BigNumber;
  };
  protocol: {
    tokenListUrl: string;
    tokenListMappingKey: string;
    poolDataUrl: string;
  };
}

const AllNetworkConfigs: { [chainId: string]: NetworkConfig } = {
  '56': {
    startBlock: 25100959, // vault deploy block
    chain: {
      slug: 'bsc',
      id: 56,
      nativeAssetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
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
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
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
      tokenListMappingKey:
        'https://raw.githubusercontent.com/vertekfi/token-list/dev/tokenlist.json',
      poolDataUrl: 'https://raw.githubusercontent.com/vertekfi/pool-data-config/dev/pool-data.json',
    },
  },
  '5': {
    startBlock: 8370137,
    chain: {
      slug: 'goerli',
      id: 5,
      nativeAssetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      wrappedNativeAssetAddress: '0xe4E96Cf369D4d604Bedc4d7962F94D53E4B5e3C6',
    },
    subgraphs: {
      startDate: '2024-01-24',
      balancer: 'https://api.thegraph.com/subgraphs/name/vertekfi/vertek-v2-goerli',
      blocks: '',
      userBalances: '',
      gauges: 'https://api.thegraph.com/subgraphs/name/vertekfi/goerli-gauges-v2',
    },
    eth: {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      addressFormatted: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      symbol: 'BNB',
      name: 'BNB',
    },
    weth: {
      address: '0xe4E96Cf369D4d604Bedc4d7962F94D53E4B5e3C6',
      addressFormatted: '0xe4E96Cf369D4d604Bedc4d7962F94D53E4B5e3C6',
    },
    coingecko: {
      nativeAssetId: 'wbnb',
      platformId: 'binance-smart-chain',
    },
    rpcUrl: '',
    beetsPriceProviderRpcUrl: '',
    beets: {
      address: '0x5E1D334E7CFF8436bA39E24d452eB6E8451B5F9b',
    },
    bal: {
      address: '',
    },
    balancer: {
      vault: '0xBA5CE8dFcB1E077B4537aCaD17400D843842c520',
      composableStablePoolFactories: [],
      weightedPoolV2Factories: ['0x94b67Ee1359A26E0527BFafD9C37aD84D9ABda77'],
      weightedPoolFactories: [],
      swapProtocolFeePercentage: 0.25,
      yieldProtocolFeePercentage: 0.5,
      poolsInRecoveryMode: [],
      votingEscrow: {
        veAddress: '0x76B64524071b3e56EE8EFBc125a53BBbF04D41aB',
        gaugeController: '0x7bC6C2bF0c730E03285f673806586C60AC0B3205',
        veBALHelpers: '0xf2Ac25c69b05C1a7560dECc7363c5150B24eD974',
        tokenAdmin: '0xf4f37A6F5D836AB19f4C7Caf65c780108dB68e12',
        lockablePoolId: '0xd0f30b415c65b99904caf716abc3da23f57d3cdd000200000000000000000000',
        lockPoolAddress: '0xD0F30B415C65B99904caF716ABc3da23f57d3cdd',
      },
    },
    multicall: '0x4Ba82B21658CAE1975Fa26097d87bd48FF270124',
    avgBlockSpeed: 10,
    sor: {
      url: '',
      maxPools: 4,
      forceRefresh: false,
      gasPrice: BigNumber.from(10),
      swapGas: BigNumber.from('1000000'),
    },
    protocol: {
      tokenListUrl: 'https://raw.githubusercontent.com/vertekfi/token-list/dev/tokenlist.json',
      tokenListMappingKey:
        'https://raw.githubusercontent.com/vertekfi/token-list/dev/tokenlist.json',
      poolDataUrl: 'https://raw.githubusercontent.com/vertekfi/pool-data-config/dev/pool-data.json',
    },
  },
};

export const networkConfig = AllNetworkConfigs[process.env.CHAIN_ID];

export function isBscNetwork() {
  return process.env.CHAIN_ID === '56';
}

export function isTestnet() {
  return process.env.CHAIN_ID === '5';
}
