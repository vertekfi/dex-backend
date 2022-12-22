import { BigNumber, ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

export const ZERO_ADDRESS = ethers.constants.AddressZero;

export function convertToFormatEthNumber(val: BigNumber) {
  return Number(formatEther(val));
}
