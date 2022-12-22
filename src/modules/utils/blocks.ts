export const BSC_BLOCKS_PER_DAY = 86400 / 3; // 28800
export const GOERLI_BLOCKS_PER_DAY = 86400 / 12; // 7200 (Need to ~4x reward rates for goerli)

export const BLOCKS_PER_DAY = {
  5: GOERLI_BLOCKS_PER_DAY,
  56: BSC_BLOCKS_PER_DAY,
};
