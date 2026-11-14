import type { CycleData, Period } from "./model.ts";
import { addDays, daysBetween, dayNumber, isDateKey } from "./dates.ts";

function median(values: number[]): number {
  const a = [...values].sort((a, b) => a - b),
    n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
export type Prediction = {
  next: string;
  earliest: string;
  latest: string;
  cycleDays: number;
  periodDays: number;
  cycleDay: number;
  phase: string;
  ovulationFrom: string;
  ovulationTo: string;
  basis: string;
  excluded: number;
  overdue: boolean;
};
export function predict(data: CycleData, today: string): Prediction | null {
  dayNumber(today);
  const periods = data.periods
    .filter((p) => p.start <= today)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (!periods.length) return null;
  const intervals = periods
    .slice(1)
    .map((p, i) => daysBetween(periods[i].start, p.start));
  const valid = intervals.filter((n) => n >= 15 && n <= 90).slice(-6);
  if (!valid.length && !data.profile) return null;
  const cycleDays = Math.round(
    valid.length ? median(valid) : data.profile!.cycleDays,
  );
  const durations = periods
    .filter((p): p is Period & { end: string } => p.end !== null)
    .map((p) => daysBetween(p.start, p.end) + 1)
    .filter((n) => n <= 20)
    .slice(-6);
  const periodDays = Math.round(
    durations.length ? median(durations) : (data.profile?.periodDays ?? 5),
  );
  const anchor = periods[periods.length - 1],
    next = addDays(anchor.start, cycleDays);
  if (!isDateKey(next)) return null;
  const spread =
    valid.length > 1
      ? Math.max(...valid.map((n) => Math.abs(n - cycleDays)))
      : 0;
  // Heuristic display range, NOT a statistical confidence interval.
  const margin = Math.max(data.profile?.irregular ? 7 : 3, Math.ceil(spread));
  const earliest = addDays(anchor.start, Math.max(15, cycleDays - margin));
  const latest = addDays(next, margin);
  const ovulationFrom = addDays(earliest, -18), ovulationTo = addDays(latest, -12);
  if (![earliest, latest, ovulationFrom, ovulationTo].every(isDateKey)) return null;
  const cycleDay = daysBetween(anchor.start, today) + 1,
    remaining = daysBetween(today, next);
  const confirmed = periods.some(
    (p) =>
      p.start <= today &&
      (p.end === null ? today === p.start : today <= p.end),
  );
  let phase = confirmed
    ? "经期记录内"
    : remaining < 0
      ? "周期延长，阶段不确定"
      : remaining <= 12
        ? "估计黄体期"
        : remaining <= 18
          ? "估计排卵附近"
          : "估计卵泡期";
  if (anchor.end === null && cycleDay > 1)
    phase = "经期尚未确认结束，阶段不确定";
  return {
    next,
    earliest,
    latest,
    cycleDays,
    periodDays,
    cycleDay,
    phase,
    ovulationFrom,
    ovulationTo,
    basis: valid.length
      ? "最近 " +
        valid.length +
        " 个有效间隔的中位数；范围为经验展示，不是置信区间"
      : "仅根据手动周期参数；历史不足，范围为经验展示",
    excluded: intervals.filter((n) => n < 15 || n > 90).length,
    overdue: remaining < 0,
  };
}
