/**
 * Simulation Store — Holds the latest MNA simulation result.
 *
 * The simulation is triggered automatically (when `autoSimulate` is true)
 * by CircuitCanvas's useEffect whenever components or wires change.
 * The result drives visual feedback (LED glow, burned state) and the
 * property/warnings panels.
 */
import { create } from 'zustand';
import type { SimulationResult } from '../types/simulation';

interface SimulationStore {
  /** True while simulation is actively running (reserved for async solvers). */
  isRunning: boolean;
  /** Latest simulation result, or null if no simulation has run yet. */
  result: SimulationResult | null;
  /** When true, simulation runs automatically on every circuit change. */
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
