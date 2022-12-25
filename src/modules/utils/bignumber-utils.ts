import BigNumber from 'bignumber.js';

export function bnum(val: string | number | BigNumber): BigNumber {
  const number = typeof val === 'string' ? val : val ? val.toString() : '0';
  return new BigNumber(number);
}

/**
 * Sums and array of string numbers and returns as BigNumber
 */
export function bnSum(amounts: string[]): BigNumber {
  return amounts.reduce((a, b) => bnum(a).plus(b), bnum(0));
}
