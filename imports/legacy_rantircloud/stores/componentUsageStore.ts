import { create } from 'zustand';

interface ComponentUsage {
  [componentType: string]: number;
}

interface ComponentUsageState {
  usage: ComponentUsage;
  incrementUsage: (componentType: string) => void;
  getTopUsedComponents: (limit?: number) => Array<{type: string, count: number}>;
  clearUsage: () => void;
}

export const useComponentUsageStore = create<ComponentUsageState>((set, get) => ({
  usage: (() => {
    try {
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('component-usage-storage') || '{}');
      }
    } catch {
      // Ignore localStorage errors
    }
    return {};
  })(),
  
  incrementUsage: (componentType: string) => {
    set((state) => {
      const newUsage = {
        ...state.usage,
        [componentType]: (state.usage[componentType] || 0) + 1
      };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('component-usage-storage', JSON.stringify(newUsage));
        }
      } catch {
        // Ignore localStorage errors
      }
      return { usage: newUsage };
    });
  },
  
  getTopUsedComponents: (limit = 10) => {
    const { usage } = get();
    return Object.entries(usage)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
  
  clearUsage: () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('component-usage-storage');
      }
    } catch {
      // Ignore localStorage errors
    }
    set({ usage: {} });
  }
}));