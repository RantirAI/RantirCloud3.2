import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIComponentState {
  isGenerating: boolean;
  currentComponent: any | null;
  history: AIGenerationHistory[];
  availableComponents: ComponentDefinition[];
  error: string | null;
}

interface AIGenerationHistory {
  id: string;
  prompt: string;
  component: any;
  timestamp: Date;
  status: 'accepted' | 'rejected' | 'pending';
  feedback?: string;
}

interface ComponentDefinition {
  type: string;
  name: string;
  description: string;
  props: Record<string, any>;
  category: string;
  examples?: any[];
}

type AIComponentAction =
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_COMPONENT'; payload: any }
  | { type: 'ADD_HISTORY'; payload: AIGenerationHistory }
  | { type: 'UPDATE_HISTORY'; payload: { id: string; updates: Partial<AIGenerationHistory> } }
  | { type: 'SET_AVAILABLE_COMPONENTS'; payload: ComponentDefinition[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CURRENT_COMPONENT' };

const initialState: AIComponentState = {
  isGenerating: false,
  currentComponent: null,
  history: [],
  availableComponents: [],
  error: null
};

function aiComponentReducer(state: AIComponentState, action: AIComponentAction): AIComponentState {
  switch (action.type) {
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_COMPONENT':
      return { ...state, currentComponent: action.payload };
    case 'ADD_HISTORY':
      return { ...state, history: [...state.history, action.payload] };
    case 'UPDATE_HISTORY':
      return {
        ...state,
        history: state.history.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        )
      };
    case 'SET_AVAILABLE_COMPONENTS':
      return { ...state, availableComponents: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_CURRENT_COMPONENT':
      return { ...state, currentComponent: null };
    default:
      return state;
  }
}

const AIComponentContext = createContext<{
  state: AIComponentState;
  dispatch: React.Dispatch<AIComponentAction>;
  generateComponent: (prompt: string, context?: any) => Promise<void>;
  regenerateComponent: (historyId: string, feedback: string) => Promise<void>;
  acceptComponent: (historyId: string) => void;
  rejectComponent: (historyId: string) => void;
} | null>(null);

export function AIComponentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiComponentReducer, initialState);

  // Load available components from your app's component library
  useEffect(() => {
    const loadAvailableComponents = () => {
      const components: ComponentDefinition[] = [
        {
          type: 'container',
          name: 'Container',
          description: 'A responsive container for layout',
          props: { className: 'string', children: 'ReactNode' },
          category: 'layout'
        },
        {
          type: 'card',
          name: 'Card',
          description: 'A card component for displaying content',
          props: { title: 'string', content: 'string', className: 'string' },
          category: 'display'
        },
        {
          type: 'button',
          name: 'Button',
          description: 'An interactive button component',
          props: { text: 'string', variant: 'string', onClick: 'function' },
          category: 'interactive'
        },
        {
          type: 'form',
          name: 'Form',
          description: 'A form component with validation',
          props: { fields: 'array', onSubmit: 'function' },
          category: 'forms'
        },
        {
          type: 'table',
          name: 'Data Table',
          description: 'A data table with sorting and filtering',
          props: { columns: 'array', data: 'array', searchable: 'boolean' },
          category: 'data'
        },
        {
          type: 'navigation',
          name: 'Navigation',
          description: 'Navigation menu component',
          props: { items: 'array', orientation: 'string' },
          category: 'navigation'
        }
      ];
      
      dispatch({ type: 'SET_AVAILABLE_COMPONENTS', payload: components });
    };

    loadAvailableComponents();
  }, []);

  const generateComponent = async (prompt: string, context?: any) => {
    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { data, error } = await supabase.functions.invoke('generate-app-component', {
        body: {
          prompt,
          context: {
            ...context,
            availableComponents: state.availableComponents,
            existingComponents: state.history.filter(h => h.status === 'accepted').map(h => h.component)
          }
        }
      });

      if (error) throw error;

      const component = data.component;
      const historyItem: AIGenerationHistory = {
        id: `gen-${Date.now()}`,
        prompt,
        component,
        timestamp: new Date(),
        status: 'pending'
      };

      dispatch({ type: 'SET_COMPONENT', payload: component });
      dispatch({ type: 'ADD_HISTORY', payload: historyItem });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  };

  const regenerateComponent = async (historyId: string, feedback: string) => {
    const historyItem = state.history.find(h => h.id === historyId);
    if (!historyItem) return;

    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const enhancedPrompt = `${historyItem.prompt}\n\nFeedback: ${feedback}`;
      
      const { data, error } = await supabase.functions.invoke('generate-app-component', {
        body: {
          prompt: enhancedPrompt,
          context: {
            previousComponent: historyItem.component,
            feedback,
            availableComponents: state.availableComponents
          }
        }
      });

      if (error) throw error;

      const component = data.component;
      const newHistoryItem: AIGenerationHistory = {
        id: `gen-${Date.now()}`,
        prompt: enhancedPrompt,
        component,
        timestamp: new Date(),
        status: 'pending',
        feedback
      };

      dispatch({ type: 'SET_COMPONENT', payload: component });
      dispatch({ type: 'ADD_HISTORY', payload: newHistoryItem });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  };

  const acceptComponent = (historyId: string) => {
    dispatch({ 
      type: 'UPDATE_HISTORY', 
      payload: { id: historyId, updates: { status: 'accepted' } } 
    });
    dispatch({ type: 'CLEAR_CURRENT_COMPONENT' });
  };

  const rejectComponent = (historyId: string) => {
    dispatch({ 
      type: 'UPDATE_HISTORY', 
      payload: { id: historyId, updates: { status: 'rejected' } } 
    });
    dispatch({ type: 'CLEAR_CURRENT_COMPONENT' });
  };

  return (
    <AIComponentContext.Provider value={{
      state,
      dispatch,
      generateComponent,
      regenerateComponent,
      acceptComponent,
      rejectComponent
    }}>
      {children}
    </AIComponentContext.Provider>
  );
}

export function useAIComponent() {
  const context = useContext(AIComponentContext);
  if (!context) {
    throw new Error('useAIComponent must be used within an AIComponentProvider');
  }
  return context;
}