import { create } from "zustand";
import { createRepository } from "@/data/create-repository";
import type { CycleRepository } from "@/data/repository";
import type { CycleData, Snapshot } from "@/domain/model";
import { emptyData } from "@/domain/model";

type State = {
  snapshot: Snapshot;
  ready: boolean;
  busy: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (data: CycleData) => Promise<boolean>;
};
let repository: CycleRepository | undefined;
function repo() {
  return (repository ??= createRepository());
}
function message(e: unknown) {
  return e instanceof Error ? e.message : "本地数据操作失败";
}
export const useDataStore = create<State>((set, get) => ({
  snapshot: { schemaVersion: 2, revision: 0, data: emptyData() },
  ready: false,
  busy: false,
  error: null,
  load: async () => {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const snapshot = await repo().load();
      set({ snapshot, ready: true, busy: false });
    } catch (e) {
      set({ busy: false, ready: false, error: message(e) });
    }
  },
  save: async (data) => {
    if (!get().ready || get().busy) return false;
    set({ busy: true, error: null });
    try {
      const snapshot = await repo().commit(data, get().snapshot.revision);
      set({ snapshot, busy: false });
      // Only a local revision signal; health data never leaves the database.
      if (typeof BroadcastChannel !== "undefined") {
        const c = new BroadcastChannel("cyclemoon-revision");
        c.postMessage("changed");
        c.close();
      }
      return true;
    } catch (e) {
      set({ busy: false, error: message(e) });
      return false;
    }
  },
}));
