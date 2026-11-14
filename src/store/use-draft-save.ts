import { useState } from "react";
import { useDataStore } from "./use-data-store";
import type { CycleData } from "@/domain/model";

// A draft is tied to the revision it was opened against. A background refresh
// must not silently rebase an old form onto newly saved records.
export function useDraftSave() {
  const [revision, setRevision] = useState(() => useDataStore.getState().snapshot.revision);
  return async (data: CycleData) => {
    const ok = await useDataStore.getState().save(data, revision);
    if (ok) setRevision(useDataStore.getState().snapshot.revision);
    return ok;
  };
}
