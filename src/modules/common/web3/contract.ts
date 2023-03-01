import { getAddress } from 'ethers/lib/utils';
import { Contract, ethers } from 'ethers';
import { networkConfig } from 'src/modules/config/network-config';
import { getChainId, getCurrentRpcProvider, getProviderOrDefault } from './rpc.provider';
import * as vaultAbi from '../../abis/Vault.json';
import { CONTRACT_MAP } from 'src/modules/data/contracts';
import { TOKENS } from 'src/modules/data/tokens';
import * as controllerABI from '../../abis/GaugeController.json';

export function returnChecksum() {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);
      return getAddress(result);
    };
    return descriptor;
  };
}

export const jsonRpcProvider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

export function getContractAt<T extends Contract>(address: string, abi: any): T {
  return new Contract(address, abi, jsonRpcProvider) as T;
}

export async function getGaugeController(chainId?: number) {
  return new Contract(
    getContractAddress('GaugeController'),
    controllerABI,
    await getProviderOrDefault(chainId),
  );
}

export async function getVault() {
  return new Contract(getContractAddress('VAULT'), vaultAbi, await getCurrentRpcProvider());
}

export function getVaultAbi() {
  return vaultAbi;
}

/**
 * Will throw if wrong lookup key is provided
 * @param mappingKey
 */
export function getContractAddress(mappingKey: string) {
  const address = CONTRACT_MAP[mappingKey][getChainId()];
  if (!address) throw new Error(`Address for key "${mappingKey}" not found`);
  return address;
}

/**
 * Will throw if wrong lookup key is provided
 * @param symbol key in /data/tokens.ts
 */
export function getTokenAddress(symbol: string) {
  const address = TOKENS[symbol][getChainId()];
  if (!address) throw new Error(`Address for key "${symbol}" not found`);
  return address;
}
