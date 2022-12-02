import * as moment from 'moment-timezone';

export const ONE_MINUTE_SECONDS = 60 * 1000;
export const FIVE_MINUTES_SECONDS = 5 * ONE_MINUTE_SECONDS;

export const ONE_DAY_SECONDS = 86400;

export function timestampRoundedUpToNearestHour(m: moment.Moment = moment()): number {
  const roundUp =
    m.second() || m.millisecond() || m.minute()
      ? m.add(1, 'hour').startOf('hour')
      : m.startOf('hour');

  return roundUp.unix();
}
