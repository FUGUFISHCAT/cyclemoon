import { create } from "zustand";

// UI-only memory state, never the health-record source of truth.
type SessionState = {
  selectedDate: string | null;
  selectDate: (date: string) => void;
  demoEnabled: boolean;
  setDemoEnabled: (enabled: boolean) => void;
};
export const useSessionStore = create<SessionState>((set) => ({
  selectedDate: null,
  selectDate: (selectedDate) => set({ selectedDate }),
  demoEnabled: false,
  setDemoEnabled: (demoEnabled) => set({ demoEnabled }),
}));
