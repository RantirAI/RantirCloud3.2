import { create } from 'zustand';

interface AppBuilderSidebarState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useAppBuilderSidebarStore = create<AppBuilderSidebarState>((set) => ({
  activeTab: 'components',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
