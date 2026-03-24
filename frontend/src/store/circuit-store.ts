/**
 * Circuit Store — Single source of truth for the circuit graph (components + wires).
 *
 * Every placed component and wire lives here. Mutations trigger React
 * re-renders which in turn trigger auto-simulation (see CircuitCanvas).
 *
 * Phase 0 fixes implemented here:
 * - Bug #1 (z-index): `addComponent` assigns `zIndex = maxZ + 1` so new
 *   components always render on top of existing ones.
 * - Bug #2 (bring-to-front): `bringToFront` sets the target's zIndex above
 *   the current maximum so it renders last (on top) in the sorted layer.
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PlacedComponent, Wire } from '../types/circuit';

interface CircuitStore {
  /** All components currently placed on the canvas. */
  components: PlacedComponent[];
  /** All wires connecting component pins. */
  wires: Wire[];

  // --- Component actions ---
  /** Place a new component at (x, y). Returns the generated instanceId. */
  addComponent: (componentId: string, x: number, y: number) => string;
  /** Move an existing component to a new position. */
  moveComponent: (instanceId: string, x: number, y: number) => void;
  /** Rotate a component by 90 degrees clockwise. */
  rotateComponent: (instanceId: string) => void;
  /** Remove a component and all wires connected to it. */
  removeComponent: (instanceId: string) => void;
  /** Set a component's zIndex above all others so it renders on top. */
  bringToFront: (instanceId: string) => void;

  // --- Wire actions ---
  /** Create a wire between two pins. Returns the generated wire id. */
  addWire: (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => string;
  /** Remove a wire by id. */
  removeWire: (wireId: string) => void;

  // --- Bulk actions ---
  /** Remove all components and wires from the circuit. */
  clearCircuit: () => void;
}

export const useCircuitStore = create<CircuitStore>((set) => ({
  components: [],
  wires: [],

  addComponent: (componentId, x, y) => {
    const instanceId = uuidv4();
    set((state) => {
      const maxZ = state.components.length > 0
        ? Math.max(...state.components.map(c => c.zIndex))
        : 0;
      return {
        components: [
          ...state.components,
          { instanceId, componentId, x, y, rotation: 0, zIndex: maxZ + 1 },
        ],
      };
    });
    return instanceId;
  },

  moveComponent: (instanceId, x, y) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.instanceId === instanceId ? { ...c, x, y } : c
      ),
    }));
  },

  rotateComponent: (instanceId) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.instanceId === instanceId
          ? { ...c, rotation: (c.rotation + 90) % 360 }
          : c
      ),
    }));
  },

  removeComponent: (instanceId) => {
    set((state) => ({
      components: state.components.filter((c) => c.instanceId !== instanceId),
      wires: state.wires.filter(
        (w) => w.fromComponentId !== instanceId && w.toComponentId !== instanceId
      ),
    }));
  },

  bringToFront: (instanceId) => {
    set((state) => {
      const maxZ = Math.max(...state.components.map(c => c.zIndex), 0);
      return {
        components: state.components.map((c) =>
          c.instanceId === instanceId ? { ...c, zIndex: maxZ + 1 } : c
        ),
      };
    });
  },

  addWire: (fromComponentId, fromPinId, toComponentId, toPinId) => {
    const id = uuidv4();
    set((state) => ({
      wires: [
        ...state.wires,
        { id, fromComponentId, fromPinId, toComponentId, toPinId, points: [] },
      ],
    }));
    return id;
  },

  removeWire: (wireId) => {
    set((state) => ({
      wires: state.wires.filter((w) => w.id !== wireId),
    }));
  },

  clearCircuit: () => {
    set({ components: [], wires: [] });
  },
}));
