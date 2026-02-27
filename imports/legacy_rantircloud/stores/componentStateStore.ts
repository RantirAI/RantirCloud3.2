import { create } from 'zustand';

type ComponentState = 'normal' | 'hover' | 'pressed' | 'focused' | 'focus-visible' | 'focus-within';

interface ComponentStateStore {
  // Current active state for editing
  activeEditingState: ComponentState;
  
  // Component-specific states
  componentStates: Record<string, ComponentState>;
  
  // Actions
  setActiveEditingState: (state: ComponentState) => void;
  setComponentState: (componentId: string, state: ComponentState) => void;
  getComponentState: (componentId: string) => ComponentState;
  resetComponentState: (componentId: string) => void;
  resetAllStates: () => void;
}

export const useComponentStateStore = create<ComponentStateStore>((set, get) => ({
  activeEditingState: 'normal',
  componentStates: {},

  setActiveEditingState: (state: ComponentState) => {
    set({ activeEditingState: state });
  },

  setComponentState: (componentId: string, state: ComponentState) => {
    set((prev) => ({
      componentStates: {
        ...prev.componentStates,
        [componentId]: state
      }
    }));
  },

  getComponentState: (componentId: string): ComponentState => {
    return get().componentStates[componentId] || 'normal';
  },

  resetComponentState: (componentId: string) => {
    set((prev) => {
      const newStates = { ...prev.componentStates };
      delete newStates[componentId];
      return { componentStates: newStates };
    });
  },

  resetAllStates: () => {
    set({ 
      componentStates: {},
      activeEditingState: 'normal'
    });
  }
}));

export { type ComponentState };