// Called only when a user submits a new period; persisted IDs never change.
export function createPeriodId(): string {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}
