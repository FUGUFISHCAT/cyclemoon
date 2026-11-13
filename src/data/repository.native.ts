import type { CycleRepository } from "./repository";
// Reserved for the real expo-sqlite adapter. No in-memory success fallback.
export function createRepository(): CycleRepository {
  const unavailable = async () => {
    throw new Error(
      "原生 SQLite 适配尚未接入。本版本请使用 Safari PWA；不会假装保存健康记录。",
    );
  };
  return { load: unavailable, commit: unavailable };
}
