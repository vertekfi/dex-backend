import { Provider } from '@nestjs/common';
import { PoolAprService } from '../../pool-types';
import { VeGaugeAprService } from '../../../common/gauges/ve-bal-gauge-apr.service';

export const APR_SERVICES = 'APR_SERVICES';

export const AprServicesProvider: Provider = {
  provide: APR_SERVICES,
  useFactory: (gaugeAprs: VeGaugeAprService): PoolAprService[] => {
    return [gaugeAprs];
  },
  inject: [VeGaugeAprService],
};
