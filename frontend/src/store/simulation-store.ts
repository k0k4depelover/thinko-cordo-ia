import { create } from 'zustand';
import type { SimulationResult } from '../types/simulation';

interface SimulationStore {
  isRunning: boolean;
  result: SimulationResult | null;
  autoSimulate: boolean;

  setResult: (result: SimulationResult | null) => void;
  setRunning: (running: boolean) => void;
  toggleAutoSimulate: () => void;
  clearResults: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  isRunning: false,
  result: null,
  autoSimulate: true,

  setResult: (result) => set({ result }),
  setRunning: (running) => set({ isRunning: running }),
  toggleAutoSimulate: () => set((s) => ({ autoSimulate: !s.autoSimulate })),
  clearResults: () => set({ result: null }),
}));
