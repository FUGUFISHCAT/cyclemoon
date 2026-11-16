import type { Snapshot } from "../domain/model.ts";
import { emptyData } from "../domain/model.ts";
import { decodeSnapshot, validateData } from "../domain/backup.ts";
import { RevisionConflict } from "./repository.ts";
import type { CycleRepository } from "./repository.ts";

export const DB_NAME = "cyclemoon-local";
export const DB_VERSION = 3;
export function createIndexedRepository(
  factory: IDBFactory,
  name = DB_NAME,
): CycleRepository {
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = factory.open(name, DB_VERSION);
      let abandoned = false;
      request.onupgradeneeded = (event) => {
        // Additive migration only. Never delete a store or recreate the database.
        if (!request.result.objectStoreNames.contains("state") && event.oldVersion !== 0) {
          request.transaction?.abort();
          return;
        }
        if (!request.result.objectStoreNames.contains("state"))
          request.result.createObjectStore("state");
      };
      request.onerror = () =>
        reject(
          new Error(
            "无法打开本地数据库：" +
              (request.error?.name ?? "未知错误") +
              "。请勿清除数据，先导出备份或使用兼容版本。",
          ),
        );
      request.onblocked = () => {
        abandoned = true;
        reject(
          new Error("数据库升级被其他窗口阻止，请关闭其他月相窗口后重试。"),
        );
      };
      request.onsuccess = () => {
        if (abandoned) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => request.result.close();
        if (!request.result.objectStoreNames.contains("state")) {
          request.result.close();
          reject(new Error("本地数据库结构不兼容；已保留原数据，请使用兼容版本。"));
          return;
        }
        resolve(request.result);
      };
    });
  }
  return {
    async load() {
      const db = await open();
      return new Promise<Snapshot>((resolve, reject) => {
        const tx = db.transaction("state", "readonly");
        let value: Snapshot | undefined, error: unknown;
        const request = tx.objectStore("state").get("root");
        request.onsuccess = () => {
          try {
            value =
              request.result === undefined
                ? { schemaVersion: 3, revision: 0, data: emptyData() }
                : decodeSnapshot(request.result);
          } catch (e) {
            error = e;
          }
        };
        tx.oncomplete = () => {
          db.close();
          if (error) reject(error);
          else if (value) resolve(value);
          else reject(new Error("数据库读取失败"));
        };
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(new Error("本地读取失败，未修改数据"));
        };
      });
    },
    async commit(input, expectedRevision) {
      const data = validateData(input),
        db = await open();
      return new Promise<Snapshot>((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        let value: Snapshot | undefined, reason: unknown;
        const request = tx.objectStore("state").get("root");
        request.onsuccess = () => {
          try {
            const previous =
              request.result === undefined
                ? { revision: 0 }
                : decodeSnapshot(request.result);
            if (previous.revision !== expectedRevision)
              throw new RevisionConflict();
            value = { schemaVersion: 3, revision: expectedRevision + 1, data };
            tx.objectStore("state").put(value, "root");
          } catch (e) {
            reason = e;
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          db.close();
          resolve(value!);
        };
        tx.onabort = () => {
          db.close();
          reject(
            reason ??
              new Error(
                "写入失败（可能存储空间不足）；原数据未更改，请备份后重试",
              ),
          );
        };
        tx.onerror = () => {
          /* onabort is the single error completion path */
        };
      });
    },
  };
}
