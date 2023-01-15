import { BigNumber } from 'ethers';

export type DeploymentEnv = 'canary' | 'main';

export interface NetworkConfig {
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
    gauge?: string;
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
    yieldProtocolFeePercentage: number;
    swapProtocolFeePercentage: number;
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
}

const AllNetworkConfigs: { [chainId: string]: NetworkConfig } = {
  '56': {
    chain: {
      slug: 'bsc',
      id: 56,
      nativeAssetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      wrappedNativeAssetAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    },
    subgraphs: {
      startDate: '2021-12-02',
      balancer: 'https://api.thegraph.com/subgraphs/name/0xbriz/aequinox-bsc',
      blocks: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/fantom-blocks',
      userBalances: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/user-bpt-balances-fantom',
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
      platformId: 'bsc',
    },
    rpcUrl: 'https://bsc-dataseed.binance.org',
    beetsPriceProviderRpcUrl: 'https://bsc-dataseed.binance.org',
    beets: {
      address: '0x0dDef12012eD645f12AEb1B845Cb5ad61C7423F5',
    },
    bal: {
      address: '',
    },
    balancer: {
      vault: '0xEE1c8DbfBf958484c6a4571F5FB7b99B74A54AA7',
      composableStablePoolFactories: [],
      weightedPoolV2Factories: [],
      weightedPoolFactories: ['0x7aFB1Fff22D2EAbC5d256187472bF1989CDE2f97'],
      swapProtocolFeePercentage: 0.25,
      yieldProtocolFeePercentage: 0.25,
    },
    multicall: '0xa4746ea7B23d91b7e73bAE42BaDbF786211fcA38',
    avgBlockSpeed: 3,
    sor: {
      url: 'https://seb3bxrechp46fx7h3d2ksmjce0minwk.lambda-url.ca-central-1.on.aws/',
      maxPools: 8,
      forceRefresh: false,
      gasPrice: BigNumber.from(10),
      swapGas: BigNumber.from('1000000'),
    },
  },
  '5': {
    chain: {
      slug: 'goerli',
      id: 5,
      nativeAssetAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      wrappedNativeAssetAddress: '0xe4E96Cf369D4d604Bedc4d7962F94D53E4B5e3C6',
    },
    subgraphs: {
      startDate: '2021-12-02',
      balancer: 'https://api.thegraph.com/subgraphs/name/aequinoxfi/vertek-subgraph-goerli',
      blocks: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/fantom-blocks',
      userBalances: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/user-bpt-balances-fantom',
      gauge: 'https://api.thegraph.com/subgraphs/name/aequinoxfi/gauges-goerli',
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
      nativeAssetId: 'binancecoin',
      platformId: 'binance-smart-chain',
    },
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/cK2OOgcOIjM2enbLpRfinpxq8hdY9aGU',
    beetsPriceProviderRpcUrl:
      'https://eth-goerli.g.alchemy.com/v2/cK2OOgcOIjM2enbLpRfinpxq8hdY9aGU',
    beets: {
      address: '0xaFbf7fB9Fa206089041218dF93c8B3A1Bb9F4497',
    },
    bal: {
      address: '',
    },
    balancer: {
      vault: '0x4b93431a1942A0F3Be0a082834200FFd9BE54FD4',
      composableStablePoolFactories: [],
      weightedPoolV2Factories: [],
      weightedPoolFactories: ['0x274B157a7b312175936Dc16fCA5209ee9DE8422e'],
      swapProtocolFeePercentage: 0.25,
      yieldProtocolFeePercentage: 0.25,
    },
    multicall: '0xFDec6c30306F84eCC4196FA689974721fE863Dfc',
    avgBlockSpeed: 3,
    sor: {
      url: 'https://dex-frontend-v2.vercel.app/',
      maxPools: 8,
      forceRefresh: false,
      gasPrice: BigNumber.from(10),
      swapGas: BigNumber.from('1000000'),
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
