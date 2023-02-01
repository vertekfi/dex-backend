import * as moment from 'moment-timezone';

export const ONE_MINUTE_SECONDS = 60 * 1000;
export const THIRTY_SECONDS_SECONDS = 60 * 1000;
export const FIVE_MINUTES_SECONDS = ONE_MINUTE_SECONDS * 5;
export const THIRTY_MINUTES_SECONDS = ONE_MINUTE_SECONDS * 30;

export const ONE_DAY_SECONDS = 86400;
export const ONE_YEAR_SECONDS = ONE_DAY_SECONDS * 365;
export const ONE_DAY_MINUTES = 60 * 24;
export const ONE_SECOND_MS = 1000;

export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

export function getTimestampStartOfDaysAgoUTC(numDays: number): number {
  return moment().subtract(numDays, 'day').startOf('day').utc().unix();
}

export function timestampRoundedUpToNearestHour(m: moment.Moment = moment()): number {
  const roundUp =
    m.second() || m.millisecond() || m.minute()
      ? m.add(1, 'hour').startOf('hour')
      : m.startOf('hour');

  return roundUp.unix();
}

export function getDailyTimestampsForDays(numDays: number): number[] {
  const timestamps: number[] = [];

  const endTime = moment.tz('GMT').subtract(numDays, 'days').startOf('day');
  let current = moment.tz('GMT').startOf('day');

  while (current.isAfter(endTime)) {
    timestamps.push(current.unix());

    current = current.subtract(1, 'day');
  }

  return timestamps;
}

export function getDailyTimestampsWithBuffer(numDays: number): number[] {
  let timestamps: number[] = [];

  const endTime = moment.tz('GMT').subtract(numDays, 'days').startOf('day');
  let current = moment.tz('GMT').startOf('day');

  while (current.isAfter(endTime)) {
    timestamps = [
      ...timestamps,
      // we create a buffer of 20 seconds to match on to ensure we get at least one block for this hour
      current.clone().subtract(10, 'second').unix(),
      current.clone().subtract(9, 'second').unix(),
      current.clone().subtract(8, 'second').unix(),
      current.clone().subtract(7, 'second').unix(),
      current.clone().subtract(6, 'second').unix(),
      current.clone().subtract(5, 'second').unix(),
      current.clone().subtract(4, 'second').unix(),
      current.clone().subtract(3, 'second').unix(),
      current.clone().subtract(2, 'second').unix(),
      current.clone().subtract(1, 'second').unix(),
      current.unix(),
      current.clone().add(1, 'second').unix(),
      current.clone().add(2, 'second').unix(),
      current.clone().add(3, 'second').unix(),
      current.clone().add(4, 'second').unix(),
      current.clone().add(5, 'second').unix(),
      current.clone().add(6, 'second').unix(),
      current.clone().add(7, 'second').unix(),
      current.clone().add(8, 'second').unix(),
      current.clone().add(9, 'second').unix(),
      current.clone().add(10, 'second').unix(),
    ];

    current = current.subtract(1, 'day');
  }

  return timestamps;
}

export function toUnixTimestamp(jsTimestamp: number): number {
  return Math.round(jsTimestamp / ONE_SECOND_MS);
}

export function toJsTimestamp(unixTimestamp: number): number {
  return unixTimestamp * 1000;
}
