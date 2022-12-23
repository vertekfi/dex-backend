import { BigNumber, ethers, ContractTransaction } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

export const ZERO_ADDRESS = ethers.constants.AddressZero;
export const MAX_UINT256 = ethers.constants.MaxUint256;

export async function doTransaction(txResponse: ContractTransaction) {
  try {
    return awaitTransactionComplete(txResponse);
  } catch (error) {
    throw error;
  }
}

export async function awaitTransactionComplete(txResponse: ContractTransaction, confirmations = 2) {
  try {
    console.log(`- Starting transaction: ${txResponse.hash}`);
    console.log(`- Awaiting transaction receipt... - ` + new Date().toLocaleString());
    const txReceipt = await txResponse.wait(confirmations);
    console.log('- TransactionReceipt received - ' + new Date().toLocaleString());
    if (txReceipt.status === 1) {
      // success
      console.log(`Transaction successful`);
    }
    return txReceipt;
  } catch (error) {
    throw error; // Throw and try to let this be handled back in the call stack as needed
  }
}

export function convertToFormatEthNumber(val: BigNumber) {
  return Number(formatEther(val));
}
