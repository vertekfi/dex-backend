import { sub } from 'date-fns';

export function getPreviousEpoch(weeksToGoBack = 0): Date {
  const now = new Date();
  const todayAtMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let daysSinceThursday = now.getDay() - 4;
  if (daysSinceThursday < 0) daysSinceThursday += 7;

  daysSinceThursday = daysSinceThursday + weeksToGoBack * 7;

  return sub(todayAtMidnightUTC, {
    days: daysSinceThursday,
  });
}
