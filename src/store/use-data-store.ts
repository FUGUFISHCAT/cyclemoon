import { create } from "zustand";
import { createRepository } from "@/data/create-repository";
import type { CycleRepository } from "@/data/repository";
import { dataState } from "./data-controller";
let repository: CycleRepository | undefined;
export const useDataStore = create(dataState(() => repository ??= createRepository(), () => {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("cyclemoon-revision");
    try { channel.postMessage("changed"); } finally { channel.close(); }
  }
}));
