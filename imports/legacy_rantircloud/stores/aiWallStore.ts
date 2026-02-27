import { create } from 'zustand';
import { AIWallPreset } from '@/lib/aiWallPresets';

export interface AIWallVariant {
  id: string;
  name: string;
  description: string;
  layoutType: 'standard' | 'wide' | 'compact' | 'creative';
  components: any[];
  thumbnail?: string;
  createdAt: Date;
}

export interface AIWallGeneration {
  id: string;
  prompt: string;
  presetId: string;
  model: string;
  variants: AIWallVariant[];
  selectedVariantIndex: number;
  createdAt: Date;
}

// ── Style Memory ──
export interface SavedDesignStyle {
  tokens: {
    colors: Record<string, string>;
    typography: {
      headingFont?: string;
      bodyFont?: string;
      headingWeight?: string;
      headingSize?: string;
    };
    spacing: {
      sectionPadding?: string;
      elementGap?: string;
      cardPadding?: string;
    };
    borderRadius?: string;
  };
  sourceVariantId: string;
  sourceVariantName: string;
}

// ── Chat Message Types ──
export interface ChatMessageMetadata {
  agentName?: string;
  generationId?: string;
  intent?: {
    industry?: string;
    mood?: string;
    keywords?: string[];
    componentTypes?: string[];
  };
  tokens?: {
    colors?: Record<string, string>;
    fonts?: string[];
  };
  agentResults?: {
    agent: string;
    status: 'success' | 'failed';
    layout?: string;
    sectionCount?: number;
  }[];
  successCount?: number;
  totalCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system' | 'generation' | 'error';
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

// ── Style Extraction Utility ──
function findMostCommon(values: string[]): string | undefined {
  if (values.length === 0) return undefined;
  const counts: Record<string, number> = {};
  for (const v of values) {
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  let max = 0;
  let result: string | undefined;
  for (const [k, c] of Object.entries(counts)) {
    if (c > max) { max = c; result = k; }
  }
  return result;
}

function walkComponents(component: any, collector: (c: any) => void) {
  if (!component || typeof component !== 'object') return;
  collector(component);
  if (Array.isArray(component.children)) {
    component.children.forEach((child: any) => walkComponents(child, collector));
  }
}

export function extractStyleFromVariant(variant: AIWallVariant): SavedDesignStyle {
  const backgrounds: string[] = [];
  const textColors: string[] = [];
  const accentColors: string[] = [];
  const surfaceColors: string[] = [];
  const headingFonts: string[] = [];
  const bodyFonts: string[] = [];
  const headingWeights: string[] = [];
  const headingSizes: string[] = [];
  const borderRadii: string[] = [];
  const paddings: string[] = [];
  const gaps: string[] = [];

  for (const comp of variant.components) {
    walkComponents(comp, (c: any) => {
      const p = c.props || {};
      const type = c.type || '';

      if (type === 'section' && p.backgroundColor) backgrounds.push(p.backgroundColor);
      if (['div', 'card'].includes(type) && p.backgroundColor) surfaceColors.push(p.backgroundColor);
      if (type === 'button' && p.backgroundColor) accentColors.push(p.backgroundColor);
      if (['heading', 'text'].includes(type) && p.color) textColors.push(p.color);
      if (type === 'heading') {
        if (p.fontFamily) headingFonts.push(p.fontFamily);
        if (p.fontWeight) headingWeights.push(String(p.fontWeight));
        if (p.fontSize) headingSizes.push(String(p.fontSize));
      }
      if (type === 'text' && p.fontFamily) bodyFonts.push(p.fontFamily);
      if (['button', 'card', 'div'].includes(type) && p.borderRadius) borderRadii.push(String(p.borderRadius));
      if (type === 'section' && p.padding) paddings.push(String(p.padding));
      if (p.gap) gaps.push(String(p.gap));
    });
  }

  return {
    tokens: {
      colors: {
        background: findMostCommon(backgrounds) || '#ffffff',
        surface: findMostCommon(surfaceColors) || '#f8f9fa',
        text: findMostCommon(textColors) || '#111827',
        accent: findMostCommon(accentColors) || '#6366f1',
        primary: findMostCommon(accentColors) || '#6366f1',
        muted: '#9ca3af',
      },
      typography: {
        headingFont: findMostCommon(headingFonts),
        bodyFont: findMostCommon(bodyFonts),
        headingWeight: findMostCommon(headingWeights),
        headingSize: findMostCommon(headingSizes),
      },
      spacing: {
        sectionPadding: findMostCommon(paddings),
        elementGap: findMostCommon(gaps),
        cardPadding: undefined,
      },
      borderRadius: findMostCommon(borderRadii),
    },
    sourceVariantId: variant.id,
    sourceVariantName: variant.name,
  };
}

interface AIWallState {
  // Selected preset
  selectedPreset: AIWallPreset | null;
  setSelectedPreset: (preset: AIWallPreset | null) => void;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  
  // Current prompt
  prompt: string;
  setPrompt: (prompt: string) => void;
  
  // Model selection (deprecated)
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Generations history
  generations: AIWallGeneration[];
  currentGeneration: AIWallGeneration | null;
  addGeneration: (generation: AIWallGeneration) => void;
  updateGenerationVariants: (variants: AIWallVariant[]) => void;
  setCurrentGeneration: (generation: AIWallGeneration | null) => void;
  selectVariant: (generationId: string, variantIndex: number) => void;
  deleteVariant: (generationId: string, variantIndex: number) => void;

  // Inline preview
  previewingVariant: AIWallVariant | null;
  setPreviewingVariant: (variant: AIWallVariant | null) => void;
  appendSectionsToVariant: (variantId: string, newComponents: any[]) => void;

  // Active tab
  activeTab: 'chat' | 'wall' | 'history';
  setActiveTab: (tab: 'chat' | 'wall' | 'history') => void;

  // Component section for regeneration
  selectedSection: string | null;
  setSelectedSection: (sectionId: string | null) => void;

  // Uploaded design reference
  uploadedDesignImage: string | null;
  setUploadedDesignImage: (image: string | null) => void;

  // Chat messages
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  hasStartedChat: boolean;
  clearChat: () => void;

  // Style memory
  savedStyle: SavedDesignStyle | null;
  setSavedStyle: (style: SavedDesignStyle | null) => void;
  clearSavedStyle: () => void;

  // Reset
  reset: () => void;
}

export const useAIWallStore = create<AIWallState>((set, get) => ({
  // Selected preset
  selectedPreset: null,
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),

  // Generation state
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  // Current prompt
  prompt: '',
  setPrompt: (prompt) => set({ prompt }),

  // Model selection (deprecated)
  selectedModel: 'multi-agent',
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Generations
  generations: [],
  currentGeneration: null,
  addGeneration: (generation) => set((state) => ({
    generations: [generation, ...state.generations],
    currentGeneration: generation,
  })),
  updateGenerationVariants: (variants) => set((state) => {
    if (!state.currentGeneration) {
      const tempGeneration: AIWallGeneration = {
        id: 'temp-' + Date.now(),
        prompt: state.prompt,
        presetId: state.selectedPreset?.id || 'none',
        model: 'multi-agent',
        variants,
        selectedVariantIndex: 0,
        createdAt: new Date(),
      };
      return { currentGeneration: tempGeneration };
    }
    return {
      currentGeneration: { ...state.currentGeneration, variants }
    };
  }),
  setCurrentGeneration: (generation) => set({ currentGeneration: generation }),
  selectVariant: (generationId, variantIndex) => set((state) => {
    const generations = state.generations.map((gen) =>
      gen.id === generationId ? { ...gen, selectedVariantIndex: variantIndex } : gen
    );
    const currentGeneration = state.currentGeneration?.id === generationId
      ? { ...state.currentGeneration, selectedVariantIndex: variantIndex }
      : state.currentGeneration;
    return { generations, currentGeneration };
  }),
  deleteVariant: (generationId, variantIndex) => set((state) => {
    const updateGen = (gen: AIWallGeneration) => {
      if (gen.id !== generationId) return gen;
      const newVariants = gen.variants.filter((_, i) => i !== variantIndex);
      const newSelected = gen.selectedVariantIndex >= newVariants.length
        ? Math.max(0, newVariants.length - 1)
        : gen.selectedVariantIndex;
      return { ...gen, variants: newVariants, selectedVariantIndex: newSelected };
    };
    return {
      generations: state.generations.map(updateGen),
      currentGeneration: state.currentGeneration ? updateGen(state.currentGeneration) : null,
    };
  }),

  // Inline preview
  previewingVariant: null,
  setPreviewingVariant: (variant) => set({ previewingVariant: variant }),
  appendSectionsToVariant: (variantId, newComponents) => set((state) => {
    const updateVariant = (v: AIWallVariant) =>
      v.id === variantId ? { ...v, components: [...v.components, ...newComponents] } : v;
    const updatedGenerations = state.generations.map(gen => ({
      ...gen,
      variants: gen.variants.map(updateVariant),
    }));
    const updatedCurrent = state.currentGeneration
      ? { ...state.currentGeneration, variants: state.currentGeneration.variants.map(updateVariant) }
      : null;
    const updatedPreviewing = state.previewingVariant?.id === variantId
      ? { ...state.previewingVariant, components: [...state.previewingVariant.components, ...newComponents] }
      : state.previewingVariant;
    return {
      generations: updatedGenerations,
      currentGeneration: updatedCurrent,
      previewingVariant: updatedPreviewing,
    };
  }),

  // Active tab
  activeTab: 'wall',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Section for regeneration
  selectedSection: null,
  setSelectedSection: (sectionId) => set({ selectedSection: sectionId }),

  // Uploaded design reference
  uploadedDesignImage: null,
  setUploadedDesignImage: (image) => set({ uploadedDesignImage: image }),

  // Chat messages
  chatMessages: [],
  hasStartedChat: false,
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [
      ...state.chatMessages,
      {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(),
      },
    ],
    hasStartedChat: true,
  })),
  clearChat: () => set({ chatMessages: [], hasStartedChat: false }),

  // Style memory
  savedStyle: null,
  setSavedStyle: (style) => set({ savedStyle: style }),
  clearSavedStyle: () => set({ savedStyle: null }),

  // Reset
  reset: () => set({
    selectedPreset: null,
    isGenerating: false,
    prompt: '',
    generations: [],
    currentGeneration: null,
    previewingVariant: null,
    activeTab: 'wall',
    selectedSection: null,
    uploadedDesignImage: null,
    chatMessages: [],
    hasStartedChat: false,
    savedStyle: null,
  }),
}));
