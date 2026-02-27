import { create } from 'zustand';

interface DatabaseStore {
  documentsRefreshTrigger: number;
  tablesRefreshTrigger: number;
  triggerDocumentsRefresh: () => void;
  triggerTablesRefresh: () => void;
}

export const useDatabaseStore = create<DatabaseStore>((set) => ({
  documentsRefreshTrigger: 0,
  tablesRefreshTrigger: 0,
  triggerDocumentsRefresh: () => set((state) => ({ 
    documentsRefreshTrigger: state.documentsRefreshTrigger + 1 
  })),
  triggerTablesRefresh: () => set((state) => ({ 
    tablesRefreshTrigger: state.tablesRefreshTrigger + 1 
  })),
}));
