import React, { createContext, useContext } from 'react';
import { useTabManager, Tab } from '@/hooks/useTabManager';

interface TabContextType {
  openTabs: Tab[];
  openTab: (tab: Omit<Tab, 'isActive'>) => Promise<void>;
  closeTab: (tabId: string, e?: React.MouseEvent) => void;
  setActiveTab: (tabId: string) => void;
  closeAllTabs: () => void;
  updateTabName: (tabId: string, newName: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const tabManager = useTabManager();

  return (
    <TabContext.Provider value={tabManager}>
      {children}
    </TabContext.Provider>
  );
}

export function useTab() {
  const context = useContext(TabContext);
  if (context === undefined) {
    // Return a safe fallback instead of throwing during initial render
    return {
      openTabs: [],
      openTab: async () => {},
      closeTab: () => {},
      setActiveTab: () => {},
      closeAllTabs: () => {},
      updateTabName: () => {},
    } as TabContextType;
  }
  return context;
}