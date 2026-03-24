import { create } from 'zustand';

interface UIStore {
  selectedComponentId: string | null; // instanceId of selected placed component
  searchQuery: string;
  showSidebar: boolean;
  showPropertyPanel: boolean;
  wireMode: boolean; // true when user is drawing a wire
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
