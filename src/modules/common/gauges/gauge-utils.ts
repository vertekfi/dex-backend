import { ProtocolConfigData } from 'src/modules/protocol/types';

export function getGaugeAddresses(data: ProtocolConfigData) {
  return data.gauges.map((g) => g.address);
}

export function getGaugePoolIds(data: ProtocolConfigData) {
  return data.gauges.map((g) => g.poolId);
}
