import { emptyData } from "../src/domain/model.ts";
export function fixture() {
  const data = emptyData();
  data.profile = { cycleDays: 30, periodDays: 5, irregular: true };
  data.periods = [
    { id: "synthetic-period", start: "2026-11-05", end: "2026-11-09" },
  ];
  data.entries = [
    {
      date: "2026-11-06",
      flow: "medium",
      spotting: false,
      pain: 1,
      fatigue: 2,
      mood: "平静",
      note: "仅用于测试，非真实健康数据 🌓\n多行;逗号,",
    },
  ];
  return data;
}
