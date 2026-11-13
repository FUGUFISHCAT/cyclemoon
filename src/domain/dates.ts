const DAY = 86400000;
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value))
    return false;
  const time = Date.parse(value + "T00:00:00Z");
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}
export function dayNumber(date: string): number {
  if (!isDateKey(date))
    throw new Error("日期必须是真实有效的 YYYY-MM-DD（1900–2199 年）");
  return Date.parse(date + "T00:00:00Z") / DAY;
}
export function addDays(date: string, count: number): string {
  return new Date((dayNumber(date) + count) * DAY).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}
export function localToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
