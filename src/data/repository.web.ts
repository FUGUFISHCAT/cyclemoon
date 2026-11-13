import { createIndexedRepository } from "./indexeddb";
import type { CycleRepository } from "./repository";
export function createRepository(): CycleRepository {
  if (typeof indexedDB === "undefined")
    throw new Error(
      "浏览器不支持 IndexedDB；无法安全保存记录，请勿使用隐私浏览模式。",
    );
  return createIndexedRepository(indexedDB);
}
