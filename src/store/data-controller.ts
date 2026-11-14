import type { StateCreator } from "zustand";
import type { CycleRepository } from "../data/repository.ts";
import type { CycleData, Snapshot } from "../domain/model.ts";
import { emptyData } from "../domain/model.ts";
type State = {
  snapshot: Snapshot;
  ready: boolean;
  busy: boolean;
  error: string | null;
  privacyEpoch: number;
  discardDrafts: () => void;
  load: () => Promise<void>;
  save: (data: CycleData, expectedRevision?: number) => Promise<boolean>;
};
function message(e: unknown) {
  if (e instanceof Error && e.name === "QuotaExceededError") return "存储空间不足，保存失败；原记录已保留。请导出备份后释放其他空间再重试，勿清除本站数据。";
  if (e instanceof Error && ["SecurityError", "InvalidStateError"].includes(e.name)) return "浏览器存储不可用，记录尚未保存。请检查浏览器设置并重试，勿清除已有数据。";
  return e instanceof Error ? e.message : "本地数据操作失败";
}
export function dataState(repo: () => CycleRepository, notify: () => void = () => {}): StateCreator<State> { return (set, get) => ({
  snapshot: { schemaVersion: 2, revision: 0, data: emptyData() },
  ready: false,
  busy: false,
  error: null,
  privacyEpoch: 0,
  discardDrafts: () => set({privacyEpoch: get().privacyEpoch + 1}),
  load: async () => {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const snapshot = await repo().load();
      if (get().ready && snapshot.revision !== get().snapshot.revision && !snapshot.data.periods.length && !snapshot.data.entries.length && snapshot.data.profile === null) get().discardDrafts();
      set({ snapshot, ready: true, busy: false });
    } catch (e) {
      set({ busy: false, error: message(e) });
    }
  },
  save: async (data, expectedRevision) => {
    if (!get().ready || get().busy) return false;
    set({ busy: true, error: null });
    try {
      const snapshot = await repo().commit(data, expectedRevision ?? get().snapshot.revision);
      set({ snapshot, busy: false });
      try { notify(); } catch { /* Notification cannot undo a committed write. */ }
      return true;
    } catch (e) {
      set({ busy: false, error: message(e) });
      return false;
    }
  },
}); }
