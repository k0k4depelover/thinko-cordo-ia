/**
 * UI Store — Manages transient UI state (selection, panels, wire drafting).
 *
 * This store holds state that is purely visual / interaction-related and has
 * no effect on the circuit's electrical model. It is consumed by canvas and
 * panel components to drive selection highlights, sidebar visibility, and the
 * two-click wire-drawing flow.
 *
 * Phase 0 note (bug #6): `wireDraft` is typed as `| null` (not `| undefined`)
 * and every setter consistently assigns `null` when clearing. This prevents
 * subtle null-vs-undefined comparison bugs in consuming components.
 */
import { create } from 'zustand';

interface UIStore {
  /** instanceId of the currently selected placed component, or null. */
  selectedComponentId: string | null;
  /** Current sidebar search text (filters component library). */
  searchQuery: string;
  /** Whether the component-library sidebar is visible. */
  showSidebar: boolean;
  /** Whether the property panel (right side) is visible. */
  showPropertyPanel: boolean;
  /** True while the user is in "wire drawing" mode (first pin clicked). */
  wireMode: boolean;
  /**
   * Tracks the origin pin of a wire currently being drawn.
   * Set to `null` (never `undefined`) when no wire is in progress.
   */
  wireDraft: {
    fromComponentId: string;
    fromPinId: string;
  } | null;

  selectComponent: (instanceId: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  togglePropertyPanel: () => void;
  startWire: (fromComponentId: string, fromPinId: string) => void;
  cancelWire: () => void;
  setWireMode: (mode: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedComponentId: null,
  searchQuery: '',
  showSidebar: true,
  showPropertyPanel: true,
  wireMode: false,
  wireDraft: null,

  selectComponent: (instanceId) => set({ selectedComponentId: instanceId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  togglePropertyPanel: () => set((s) => ({ showPropertyPanel: !s.showPropertyPanel })),
  startWire: (fromComponentId, fromPinId) =>
    set({ wireMode: true, wireDraft: { fromComponentId, fromPinId } }),
  cancelWire: () => set({ wireMode: false, wireDraft: null }),
  setWireMode: (mode) => set({ wireMode: mode, wireDraft: null }),
}));
