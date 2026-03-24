import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PlacedComponent, Wire } from '../types/circuit';

interface CircuitStore {
  components: PlacedComponent[];
  wires: Wire[];

  // Component actions
  addComponent: (componentId: string, x: number, y: number) => string;
  moveComponent: (instanceId: string, x: number, y: number) => void;
  rotateComponent: (instanceId: string) => void;
  removeComponent: (instanceId: string) => void;
  bringToFront: (instanceId: string) => void;

  // Wire actions
  addWire: (fromComponentId: string, fromPinId: string, toComponentId: string, toPinId: string) => string;
  removeWire: (wireId: string) => void;

  // Bulk actions
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
