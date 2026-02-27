import { create } from 'zustand';

interface DashboardLayoutState {
  sidebarsVisible: boolean;
  headerVisible: boolean;
  toggleSidebars: () => void;
  toggleHeader: () => void;
  toggleAll: () => void;
  showAll: () => void;
  hideAll: () => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutState>((set) => ({
  sidebarsVisible: true,
  headerVisible: true,
  toggleSidebars: () => set((state) => ({ sidebarsVisible: !state.sidebarsVisible })),
  toggleHeader: () => set((state) => ({ headerVisible: !state.headerVisible })),
  toggleAll: () => set((state) => ({ 
    sidebarsVisible: !state.sidebarsVisible, 
    headerVisible: !state.headerVisible 
  })),
  showAll: () => set({ sidebarsVisible: true, headerVisible: true }),
  hideAll: () => set({ sidebarsVisible: false, headerVisible: false }),
}));
