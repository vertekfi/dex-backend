import { TOKENS } from 'src/modules/data/tokens';
import { toLowerCase } from 'src/modules/utils/general.utils';
import { getChainId } from '../web3/rpc.provider';

export function getTokenAddress(tokenMappingKey: string) {
  const address = TOKENS[tokenMappingKey][getChainId()];
  if (!address) throw new Error(`Token key "${tokenMappingKey}" not found in tokens mapping`);

  // addresses are stored lower case in db from subgraphs
  return toLowerCase(address);
}
