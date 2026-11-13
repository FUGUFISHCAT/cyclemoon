export type Period = { id: string; start: string; end: string | null };
export type Entry = {
  date: string;
  flow: "none" | "light" | "medium" | "heavy";
  spotting: boolean;
  pain: number;
  fatigue: number;
  mood: string;
  note: string;
};
export type Profile = {
  cycleDays: number;
  periodDays: number;
  irregular: boolean;
};
export type ReminderKind =
  | "period"
  | "prepare"
  | "period-check"
  | "record-check";
export type Reminders = {
  hour: number;
  minute: number;
  privacy: boolean;
  enabled: Record<ReminderKind, boolean>;
};
export type CycleData = {
  profile: Profile | null;
  periods: Period[];
  entries: Entry[];
  reminders: Reminders;
};
export type Snapshot = { schemaVersion: 2; revision: number; data: CycleData };
export const defaultReminders = (): Reminders => ({
  hour: 9,
  minute: 0,
  privacy: true,
  enabled: {
    period: true,
    prepare: true,
    "period-check": true,
    "record-check": true,
  },
});
export const emptyData = (): CycleData => ({
  profile: null,
  periods: [],
  entries: [],
  reminders: defaultReminders(),
});
