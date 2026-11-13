import type { CycleData, Snapshot } from "../domain/model.ts";

export interface CycleRepository {
  load(): Promise<Snapshot>;
  commit(data: CycleData, expectedRevision: number): Promise<Snapshot>;
}
export class RevisionConflict extends Error {
  constructor() {
    super("其他窗口已修改数据。请重新加载后再操作；当前输入仍保留。");
  }
}
