import { create } from 'zustand';
import { AppBuilderState, AppProject, AppPage, AppComponent, DragItem } from '@/types/appBuilder';
import { appBuilderService } from '@/services/appBuilderService';
import { getDefaultPropsForComponent } from '@/lib/componentPropertyConfig';
import { getIsApplyingClass, setEditorComponentId } from '@/lib/autoClassState';
import { 
  extractStyleProperties, 
  shouldUpdateAutoClass,
  generateAutoClassName,
  findExistingClassByStyles,
  registerStyleHash
} from '@/lib/autoClassSystem';
import { useClassStore } from './classStore';
import { lockProperty, LockedProperties } from '@/lib/propertyLockTracker';
import { extractEditedProperties, trackEditedProperties, mergeEditedPropertiesIntoClass, filterByLockedProps } from '@/lib/propertyDiffTracker';
import { useUserComponentStore } from './userComponentStore';
import { repairProjectFeatureCards } from '@/lib/layoutRepairs/repairFeatureCards';
import { repairProjectProductCards } from '@/lib/layoutRepairs/repairProductCards';
import { generateInitialDSTokenRefs } from '@/lib/componentDSDefaults';

// Debounce timers for auto-class updates
const autoClassUpdateTimers = new Map<string, NodeJS.Timeout>();

interface AppBuilderStore extends AppBuilderState {
  // UI State
  showComponentsPalette: boolean;
  showPropertiesPanel: boolean;
  showPageManager: boolean;
  showVariablesPanel: boolean;
  showDesignPanel: boolean;
  showImportPanel: boolean;
  showPageSettingsPanel: boolean;
  isCommentMode: boolean;
  pendingCommentElementId: string | null;
  showCommentsPanel: boolean;
  highlightedCommentElement: string | null;
  unresolvedCommentsCount: number;
  pageSettingsPageId: string | null;
  selectedDatabaseId: string | undefined;
  selectedDatabaseName: string | undefined;
  viewport: 'desktop' | 'tablet' | 'mobile';
  customCanvasWidth: number | null; // Custom width when user manually resizes, null means use viewport default
  canvasOffset: { x: number; y: number };
  snapToGrid: boolean;
  scrollLockX: boolean;
  scrollLockY: boolean;
  isFullscreenPreview: boolean;
  editorMode: 'single' | 'multi';
  isHeaderDocked: boolean;
  _sidebarsBeforePreview: boolean;
  connectedGitHubs: Array<{ id: string; repo: string }>;
  connectedSupabases: Array<{ id: string; projectName: string }>;
  connectedFlows: Array<{ id: string; name: string }>;
  addConnectedGitHub: (data: { id: string; repo: string }) => void;
  removeConnectedGitHub: (id: string) => void;
  addConnectedSupabase: (data: { id: string; projectName: string }) => void;
  removeConnectedSupabase: (id: string) => void;
  addConnectedFlow: (data: { id: string; name: string }) => void;
  removeConnectedFlow: (id: string) => void;
  // Legacy single-connection aliases
  connectedGitHub: { repo: string; connected: boolean } | null;
  connectedSupabase: { projectName: string; connected: boolean } | null;
  connectedFlow: { id: string; name: string; connected: boolean } | null;
  setConnectedGitHub: (data: { repo: string; connected: boolean } | null) => void;
  setConnectedSupabase: (data: { projectName: string; connected: boolean } | null) => void;
  setConnectedFlow: (data: { id: string; name: string; connected: boolean } | null) => void;
  dismissedEmptyCanvasPages: Set<string>; // Track per-page dismissal
  setEmptyCanvasDismissed: (pageId: string, dismissed: boolean) => void;
  isEmptyCanvasDismissed: (pageId: string) => boolean;
  
  // Enhanced Editor State
  selectedComponents: string[];
  multiSelectMode: boolean;
  isSelectionLocked: boolean;
  hoveredComponent: string | undefined;
  
  // Actions
  setCurrentProject: (project: AppProject | undefined) => void;
  setCurrentPage: (pageId: string | undefined) => void;
  setSelectedComponent: (componentId: string | undefined) => void;
  selectComponent: (componentId: string | undefined, addToSelection?: boolean) => void;
  setDraggedItem: (item: DragItem | undefined) => void;
  setHoveredZone: (zoneId: string | undefined) => void;
  setHoveredComponent: (componentId: string | undefined) => void;
  setMode: (mode: 'design' | 'preview' | 'code' | 'variables') => void;
  toggleGrid: () => void;
  setZoom: (zoom: number) => void;
  toggleComponentsPalette: () => void;
  togglePropertiesPanel: () => void;
  setSidebarsVisible: (visible: boolean) => void;
  togglePageManager: () => void;
  toggleVariablesPanel: () => void;
  toggleDesignPanel: () => void;
  toggleImportPanel: () => void;
  setPageSettingsPanel: (pageId: string | null) => void;
  toggleCommentMode: () => void;
  setPendingCommentElement: (elementId: string | null) => void;
  toggleCommentsPanel: () => void;
  setShowCommentsPanel: (show: boolean) => void;
  setHighlightedCommentElement: (elementId: string | null) => void;
  setUnresolvedCommentsCount: (count: number) => void;
  setViewport: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  setCustomCanvasWidth: (width: number | null) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  toggleSnapToGrid: () => void;
  toggleScrollLockX: () => void;
  toggleScrollLockY: () => void;
  setFullscreenPreview: (enabled: boolean) => void;
  toggleFullscreenPreview: () => void;
  toggleHeaderDocked: () => void;
  setEditorMode: (mode: 'single' | 'multi') => void;
  
  // Enhanced Selection Actions
  selectMultipleComponents: (componentIds: string[]) => void;
  toggleComponentSelection: (componentId: string) => void;
  clearSelection: () => void;
  selectAllComponents: () => void;
  setMultiSelectMode: (enabled: boolean) => void;
  lockSelection: () => void;
  unlockSelection: () => void;
  
  // Enhanced Editor Actions
  undoAction: () => void;
  redoAction: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  copySelectedComponents: () => void;
  cutSelectedComponents: () => void;
  pasteComponents: (parentId?: string, index?: number) => void;
  duplicateSelectedComponents: () => void;
  deleteSelectedComponents: () => void;
  groupSelectedComponents: () => void;
  ungroupSelectedComponents: () => void;
  alignComponents: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeComponents: (direction: 'horizontal' | 'vertical') => void;
  
  // Project Actions
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  updateProject: (projectId: string, updates: Partial<AppProject>) => Promise<void>;
  createNewProject: (name: string, description?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // Page Actions
  addPage: (page: Omit<AppPage, 'id'>) => void;
  updatePage: (pageId: string, updates: Partial<AppPage>) => void;
  updatePageBodyProperties: (pageId: string, bodyProperties: Record<string, any>) => void;
  deletePage: (pageId: string) => void;
  removePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  
  // Component Actions
  addComponent: (component: AppComponent, parentId?: string, index?: number) => void;
  addComponentsBatch: (components: AppComponent[], clearExisting?: boolean) => void;
  replaceComponentAtIndex: (pageId: string, index: number, newComponent: AppComponent) => void;
  updateComponent: (componentId: string, updates: Partial<AppComponent>) => void;
  deleteComponent: (componentId: string) => Promise<void>;
  removeComponent: (componentId: string) => Promise<void>;
  moveComponent: (componentId: string, newParentId?: string, newIndex?: number) => void;
  moveComponentUp: (componentId: string) => void;
  moveComponentDown: (componentId: string) => void;
  duplicateComponent: (componentId: string) => void;
  
  // AI Actions
  generateComponent: (prompt: string, context?: any) => Promise<AppComponent | null>;
  
  // Data Binding Actions
  configureDataBinding: (componentId: string, dataSource: any) => void;
  setSelectedDatabase: (databaseId: string | undefined, databaseName: string | undefined) => void;
  
  // Global Header Actions
  setGlobalHeader: (componentId: string, sourcePageId: string, type: 'nav-horizontal' | 'nav-vertical') => void;
  removeGlobalHeader: (componentId: string) => void;
  togglePageGlobalHeaderExclusion: (pageId: string, headerId: string) => void;
  
  // Context Menu Actions
  contextMenuComponent: AppComponent | null;
  contextMenuPosition: { x: number; y: number } | null;
  showContextMenu: boolean;
  setContextMenu: (component: AppComponent | null, position: { x: number; y: number } | null) => void;
  hideContextMenu: () => void;
  
  // AI Context Actions
  aiContextComponent: AppComponent | null;
  setAIContext: (component: AppComponent | null) => void;
  
  // Action Flow Execution
  executeComponentFlow: (componentId: string, trigger: string) => Promise<void>;
  
  // History Management
  setHistoryHandlers: (handlers: {
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  }) => void;
}

export const useAppBuilderStore = create<AppBuilderStore>((set, get) => ({
    // Initial State
    currentProject: undefined,
    currentPage: undefined,
    selectedComponent: undefined,
    draggedItem: undefined,
    hoveredZone: undefined,
    mode: 'design',
    showGrid: true,
    zoom: 1,
    showComponentsPalette: true,
    showPropertiesPanel: true,
    showPageManager: false,
    showVariablesPanel: false,
  showDesignPanel: false,
  showImportPanel: false,
    showPageSettingsPanel: false,
    pageSettingsPageId: null,
    selectedDatabaseId: undefined,
    selectedDatabaseName: undefined,
    viewport: 'desktop',
    customCanvasWidth: null,
    canvasOffset: { x: 0, y: 0 },
    snapToGrid: true,
    scrollLockX: false,
    scrollLockY: false,
    isFullscreenPreview: false,
    editorMode: 'single' as 'single' | 'multi',
    isHeaderDocked: false,
    _sidebarsBeforePreview: true,
    connectedGitHubs: [],
    connectedSupabases: [],
    connectedFlows: [],
    addConnectedGitHub: (data) => set((s) => ({ connectedGitHubs: s.connectedGitHubs.some(g => g.id === data.id) ? s.connectedGitHubs : [...s.connectedGitHubs, data] })),
    removeConnectedGitHub: (id) => set((s) => ({ connectedGitHubs: s.connectedGitHubs.filter(g => g.id !== id) })),
    addConnectedSupabase: (data) => set((s) => ({ connectedSupabases: s.connectedSupabases.some(g => g.id === data.id) ? s.connectedSupabases : [...s.connectedSupabases, data] })),
    removeConnectedSupabase: (id) => set((s) => ({ connectedSupabases: s.connectedSupabases.filter(g => g.id !== id) })),
    addConnectedFlow: (data) => set((s) => ({ connectedFlows: s.connectedFlows.some(g => g.id === data.id) ? s.connectedFlows : [...s.connectedFlows, data] })),
    removeConnectedFlow: (id) => set((s) => ({ connectedFlows: s.connectedFlows.filter(g => g.id !== id) })),
    // Legacy aliases
    connectedGitHub: null,
    connectedSupabase: null,
    connectedFlow: null,
    setConnectedGitHub: (data) => set({ connectedGitHub: data }),
    setConnectedSupabase: (data) => set({ connectedSupabase: data }),
    setConnectedFlow: (data) => set({ connectedFlow: data }),
    isCommentMode: false,
    pendingCommentElementId: null,
    showCommentsPanel: false,
    highlightedCommentElement: null,
    unresolvedCommentsCount: 0,
    dismissedEmptyCanvasPages: new Set<string>(),
    setEmptyCanvasDismissed: (pageId, dismissed) => set((state) => {
      const newSet = new Set(state.dismissedEmptyCanvasPages);
      if (dismissed) {
        newSet.add(pageId);
      } else {
        newSet.delete(pageId);
      }
      return { dismissedEmptyCanvasPages: newSet };
    }),
    isEmptyCanvasDismissed: (pageId) => get().dismissedEmptyCanvasPages.has(pageId),
    
    // Enhanced Editor State
    selectedComponents: [],
    multiSelectMode: false,
    isSelectionLocked: false,
    hoveredComponent: undefined,
  
  // Context Menu State
  contextMenuComponent: null,
  contextMenuPosition: null,
  showContextMenu: false,
  
  // AI Context State
  aiContextComponent: null,

  // Basic Setters
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentPage: (pageId) => set({ currentPage: pageId }),
  setSelectedComponent: (componentId) => set({ selectedComponent: componentId }),
  selectComponent: (componentId, addToSelection = false) => {
    const state = get();
    if (state.isSelectionLocked) return;
    
    if (addToSelection && componentId) {
      const newSelection = state.selectedComponents.includes(componentId) 
        ? state.selectedComponents.filter(id => id !== componentId)
        : [...state.selectedComponents, componentId];
      set({ 
        selectedComponents: newSelection,
        selectedComponent: newSelection[newSelection.length - 1] || undefined,
        showPropertiesPanel: newSelection.length > 0 ? true : state.showPropertiesPanel 
      });
    } else {
      set({ 
        selectedComponent: componentId, 
        selectedComponents: componentId ? [componentId] : [],
        showPropertiesPanel: componentId ? true : state.showPropertiesPanel 
      });
    }
  },
  setDraggedItem: (item) => set({ draggedItem: item }),
  setHoveredZone: (zoneId) => set({ hoveredZone: zoneId }),
  setHoveredComponent: (componentId) => set({ hoveredComponent: componentId }),
  setMode: (mode) => set((state) => ({ 
    mode,
    // Don't trigger fullscreen preview - use in-canvas preview instead
    // Keep sidebars visible in preview mode (they'll be disabled) for stable layout
    // Only hide sidebars in code mode
    showComponentsPalette: mode === 'code' ? false : true,
    showPropertiesPanel: mode === 'code' ? false : true,
    showPageManager: mode === 'code' ? false : state.showPageManager,
  })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setZoom: (zoom) => set({ zoom }),
  toggleComponentsPalette: () => set((state) => ({ 
    showComponentsPalette: !state.showComponentsPalette
  })),
  togglePropertiesPanel: () => set((state) => ({ 
    showPropertiesPanel: !state.showPropertiesPanel
  })),
  setSidebarsVisible: (visible: boolean) => set({ 
    showComponentsPalette: visible,
    showPropertiesPanel: visible
  }),
  togglePageManager: () => set((state) => ({ showPageManager: !state.showPageManager })),
  toggleVariablesPanel: () => set((state) => ({ showVariablesPanel: !state.showVariablesPanel })),
  toggleDesignPanel: () => set((state) => ({ showDesignPanel: !state.showDesignPanel })),
  toggleImportPanel: () => set((state) => ({ showImportPanel: !state.showImportPanel })),
  setPageSettingsPanel: (pageId) => set({ showPageSettingsPanel: !!pageId, pageSettingsPageId: pageId }),
  toggleCommentMode: () => set((state) => ({ isCommentMode: !state.isCommentMode })),
  setPendingCommentElement: (elementId) => set({ pendingCommentElementId: elementId, isCommentMode: true }),
  toggleCommentsPanel: () => set((state) => ({ showCommentsPanel: !state.showCommentsPanel })),
  setShowCommentsPanel: (show) => set({ showCommentsPanel: show }),
  setHighlightedCommentElement: (elementId) => set({ highlightedCommentElement: elementId }),
  setUnresolvedCommentsCount: (count) => set({ unresolvedCommentsCount: count }),
  setViewport: (viewport) => set({ viewport, customCanvasWidth: null }), // Reset custom width when viewport changes
  setCustomCanvasWidth: (customCanvasWidth) => set({ customCanvasWidth }),
  setCanvasOffset: (canvasOffset) => set({ canvasOffset }),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  toggleScrollLockX: () => set((state) => ({ scrollLockX: !state.scrollLockX })),
  toggleScrollLockY: () => set((state) => ({ scrollLockY: !state.scrollLockY })),
    setFullscreenPreview: (enabled) => {
      if (enabled) {
        const state = get();
        // Store current sidebar state and hide them
        set({
          isFullscreenPreview: true,
          _sidebarsBeforePreview: state.showComponentsPalette || state.showPropertiesPanel,
          showComponentsPalette: false,
          showPropertiesPanel: false,
        });
      } else {
        const state = get();
        // Restore sidebar state
        const restore = state._sidebarsBeforePreview ?? true;
        set({
          isFullscreenPreview: false,
          showComponentsPalette: restore,
          showPropertiesPanel: restore,
        });
      }
    },
    toggleFullscreenPreview: () => set((state) => ({ isFullscreenPreview: !state.isFullscreenPreview })),
    toggleHeaderDocked: () => set((state) => ({ isHeaderDocked: !state.isHeaderDocked })),
    setEditorMode: (mode) => set({ editorMode: mode }),
  
  // Context Menu Actions
  setContextMenu: (component, position) => set({ 
    contextMenuComponent: component, 
    contextMenuPosition: position, 
    showContextMenu: true 
  }),
  hideContextMenu: () => set({ 
    contextMenuComponent: null, 
    contextMenuPosition: null, 
    showContextMenu: false 
  }),
  
  // AI Context Actions
  setAIContext: (component) => set({ aiContextComponent: component }),

  // Project Actions
  loadProject: async (projectId: string) => {
    try {
      const project = await appBuilderService.getAppProject(projectId);
      if (project) {
        // Sanitize component data to ensure children are always arrays
        const sanitizeComponents = (components: AppComponent[]): AppComponent[] => {
          return components.map(comp => ({
            ...comp,
            children: Array.isArray(comp.children) ? sanitizeComponents(comp.children) : []
          }));
        };

        const sanitizedProject = {
          ...project,
          pages: project.pages.map(page => ({
            ...page,
            components: sanitizeComponents(page.components || [])
          }))
        };

        // Apply layout repairs to fix feature cards with incorrect grid layouts
        let layoutRepaired = repairProjectFeatureCards(sanitizedProject.pages);
        
        // Apply product and testimonial card repairs (add missing images, fix shadows)
        const productRepaired = repairProjectProductCards(sanitizedProject.pages);
        layoutRepaired = layoutRepaired || productRepaired;
        
        if (layoutRepaired) {
          console.log('[App Builder] Applied layout repairs to project');
          // Save the repaired project back to the database (debounced via autosave)
          appBuilderService.updateAppProject(projectId, sanitizedProject).catch(err => {
            console.error('Failed to save layout repairs:', err);
          });
        }

        set({ 
          currentProject: sanitizedProject,
          currentPage: sanitizedProject.pages[0]?.id,
          selectedComponent: undefined,
          selectedDatabaseId: sanitizedProject.settings?.database?.selectedId,
          selectedDatabaseName: sanitizedProject.settings?.database?.selectedName
        });
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  },

  saveProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const updatedProject = await appBuilderService.updateAppProject(
        currentProject.id,
        currentProject
      );
      set({ currentProject: updatedProject });
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  },

  updateProject: async (projectId: string, updates: Partial<AppProject>) => {
    try {
      const updatedProject = await appBuilderService.updateAppProject(projectId, updates);
      set({ currentProject: updatedProject });
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  },

  createNewProject: async (name: string, description?: string) => {
    try {
      const userId = 'authenticated-user';
      
      const defaultPage: AppPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Home',
        route: '/',
        components: [],
        layout: { type: 'free', config: {} },
        settings: {
          title: name,
          description: description || ''
        }
      };

      const newProject = await appBuilderService.createAppProject({
        user_id: userId,
        name,
        description,
        pages: [defaultPage],
        global_styles: {},
        settings: {
          theme: 'light',
          primaryColor: '#3B82F6',
          fontFamily: 'Inter'
        }
      });

      set({ 
        currentProject: newProject,
        currentPage: defaultPage.id,
        selectedComponent: undefined 
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      await appBuilderService.deleteAppProject(projectId);
      const { currentProject } = get();
      if (currentProject?.id === projectId) {
        set({ 
          currentProject: undefined,
          currentPage: undefined,
          selectedComponent: undefined 
        });
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  },

  // Page Actions
  addPage: (page) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const newPage: AppPage = {
      ...page,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedProject = {
      ...currentProject,
      pages: [...currentProject.pages, newPage]
    };

    set({ currentProject: updatedProject });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after adding page:', error);
    });
  },

  updatePage: (pageId, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.map(page =>
      page.id === pageId ? { ...page, ...updates } : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after updating page:', error);
    });
  },

  updatePageBodyProperties: (pageId, bodyProperties) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.map(page =>
      page.id === pageId ? { ...page, bodyProperties } : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after updating page body properties:', error);
    });
  },

  deletePage: (pageId) => {
    const { currentProject, currentPage } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.filter(page => page.id !== pageId);
    const newCurrentPage = currentPage === pageId 
      ? (updatedPages[0]?.id || undefined)
      : currentPage;

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject,
      currentPage: newCurrentPage,
      selectedComponent: undefined
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after deleting page:', error);
    });
  },

  duplicatePage: (pageId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const originalPage = currentProject.pages.find(page => page.id === pageId);
    if (!originalPage) return;

    const duplicatedPage: AppPage = {
      ...originalPage,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${originalPage.name} Copy`,
      route: `${originalPage.route}-copy`
    };

    const updatedProject = {
      ...currentProject,
      pages: [...currentProject.pages, duplicatedPage]
    };

    set({
      currentProject: updatedProject
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after duplicating page:', error);
    });
  },

  // Component Actions  
  addComponent: (component, parentId, index) => {
    const { currentProject, currentPage } = get();

    // Get class store for generating unique auto-class names for ALL nested children
    const classStore = useClassStore.getState();
    const usedClassNames = new Set(classStore.classes.map(c => c.name));
    
    // Track used names in this batch to avoid duplicates
    const batchUsedNames = new Set<string>();
    
    // Generate unique auto-class name that doesn't conflict
    const getUniqueAutoClassName = (type: string): string => {
      const baseName = type.toLowerCase();
      let number = 1;
      let candidateName = `${baseName}-${number}`;
      
      while (usedClassNames.has(candidateName) || batchUsedNames.has(candidateName)) {
        number++;
        candidateName = `${baseName}-${number}`;
      }
      
      batchUsedNames.add(candidateName);
      return candidateName;
    };

    // Style properties to extract from AI-generated components for auto-classes
    const stylePropertyKeys = [
      'backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder',
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign', 'letterSpacing',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'spacingControl',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'gap', 'rowGap', 'columnGap',
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignContent', 'flexWrap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
      'borderRadius', 'border', 'borderWidth', 'borderColor', 'borderStyle',
      'boxShadows', 'boxShadow', 'opacity', 'backdropFilter',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'overflow', 'overflowX', 'overflowY',
      'transform', 'transition'
    ];
    
    // Helper to extract AI styles from component props and nested style object
    const extractAIStyles = (compNode: any): Record<string, any> => {
      const extractedStyles: Record<string, any> = {};
      
      // Extract from flat props
      for (const key of stylePropertyKeys) {
        if (compNode?.props?.[key] !== undefined) {
          extractedStyles[key] = compNode.props[key];
        }
      }
      
      // Also extract nested style object if present and flatten it
      const nodeStyle = compNode?.style;
      if (nodeStyle && typeof nodeStyle === 'object') {
        // Flatten layout properties
        if (nodeStyle.layout) {
          Object.assign(extractedStyles, nodeStyle.layout);
        }
        // Flatten sizing properties
        if (nodeStyle.sizing) {
          Object.assign(extractedStyles, nodeStyle.sizing);
        }
        // Handle spacing -> spacingControl conversion
        if (nodeStyle.spacing) {
          extractedStyles.spacingControl = nodeStyle.spacing;
        }
        // Flatten typography
        if (nodeStyle.typography) {
          Object.assign(extractedStyles, nodeStyle.typography);
        }
        // Handle background
        if (nodeStyle.background) {
          if (nodeStyle.background.color) extractedStyles.backgroundColor = nodeStyle.background.color;
          if (nodeStyle.background.gradient) {
            extractedStyles.backgroundGradient = nodeStyle.background.gradient;
            extractedStyles.backgroundLayerOrder = ['gradient', 'fill'];
          }
          if (nodeStyle.background.image) extractedStyles.backgroundImage = nodeStyle.background.image;
        }
        // Handle border
        if (nodeStyle.border) {
          extractedStyles.border = {
            width: nodeStyle.border.width ?? 1,
            style: nodeStyle.border.style || 'solid',
            color: nodeStyle.border.color || 'hsl(var(--border))',
            unit: 'px',
            sides: { top: true, right: true, bottom: true, left: true }
          };
          if (nodeStyle.border.radius !== undefined) {
            const radius = typeof nodeStyle.border.radius === 'number' 
              ? nodeStyle.border.radius 
              : parseInt(nodeStyle.border.radius) || 0;
            extractedStyles.borderRadius = {
              topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius, unit: 'px'
            };
          }
        }
        // Handle shadow
        if (nodeStyle.shadow) {
          const s = nodeStyle.shadow;
          extractedStyles.boxShadows = [{
            id: 'shadow-1',
            enabled: true,
            type: 'drop-shadow',
            x: s.x || s.offsetX || 0,
            y: s.y || s.offsetY || 0,
            blur: s.blur || 0,
            spread: s.spread || 0,
            color: s.color || 'rgba(0,0,0,0.1)'
          }];
        }
        // Handle backdropFilter
        if (nodeStyle.backdropFilter) {
          extractedStyles.backdropFilter = nodeStyle.backdropFilter;
        }
        // Copy any flat style properties
        for (const key of stylePropertyKeys) {
          if (nodeStyle[key] !== undefined && extractedStyles[key] === undefined) {
            extractedStyles[key] = nodeStyle[key];
          }
        }
      }
      
      return extractedStyles;
    };
    
    // SYNCHRONOUS class registration - called during normalization
    // CRITICAL FIX: Always create a class for new components, even with empty styles
    // This ensures every component has a class reference right from the start
    const registerAutoClassSync = (compId: string, autoClassName: string, extractedStyles: Record<string, any>) => {
      const existingClass = classStore.classes.find(c => c.name === autoClassName);
      const hasStyles = Object.keys(extractedStyles).length > 0;
      
      if (!existingClass) {
        // Create class even with empty styles - this ensures the component has a class reference
        const newClassId = `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newClass = {
          id: newClassId,
          name: autoClassName,
          styles: extractedStyles,
          stateStyles: { none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {} },
          appliedTo: [compId],
          inheritsFrom: [],
          isAutoClass: true,
          dependentClasses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Immediate synchronous state update
        useClassStore.setState((state) => ({
          classes: [...state.classes, newClass]
        }));
      } else {
        // IMPROVED: Update auto-classes when they're stale/incomplete
        // Conditions to allow update:
        // 1. It's an auto-class (not user-created)
        // 2. Has no dependent classes (not locked as a primary)
        // 3. Either empty OR we have richer styles to apply
        const existingHasStyles = existingClass.styles && Object.keys(existingClass.styles).length > 0;
        const isAutoClass = existingClass.isAutoClass === true;
        const hasNoDependents = !existingClass.dependentClasses || existingClass.dependentClasses.length === 0;
        
        // Check if new styles have critical layout properties the existing class is missing
        const hasCriticalNewStyles = hasStyles && (
          extractedStyles.display || 
          extractedStyles.gridTemplateColumns || 
          extractedStyles.backgroundGradient ||
          extractedStyles.backgroundColor ||
          (extractedStyles.sizing && (extractedStyles.sizing.width || extractedStyles.sizing.height))
        );
        
        const shouldUpdate = isAutoClass && hasNoDependents && hasStyles && (!existingHasStyles || hasCriticalNewStyles);
        
        if (shouldUpdate) {
          console.log('[registerAutoClassSync] Updating stale auto-class:', autoClassName, {
            existingHasStyles,
            hasCriticalNewStyles,
            extractedStyles
          });
          useClassStore.setState((state) => ({
            classes: state.classes.map(cls => 
              cls.id === existingClass.id 
                ? { ...cls, styles: { ...cls.styles, ...extractedStyles }, updatedAt: new Date() }
                : cls
            )
          }));
        }
        
        // Update appliedTo if needed
        if (!existingClass.appliedTo.includes(compId)) {
          useClassStore.setState((state) => ({
            classes: state.classes.map(cls => 
              cls.id === existingClass.id && !cls.appliedTo.includes(compId)
                ? { ...cls, appliedTo: [...cls.appliedTo, compId] }
                : cls
            )
          }));
        }
      }
    };

    // Ensure nested components always have UNIQUE IDs and UNIQUE auto-classes
    // CRITICAL FIX: Preserve AI-provided class references instead of always overwriting
    let seq = 0;
    const normalizeComponentTree = (node: any): AppComponent => {
      const nodeType = node?.type || 'component';
      const id = node?.id || `${nodeType}-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`;
      const defaultProps = getDefaultPropsForComponent(nodeType);
      
      // Check if AI already provided class references that we should preserve
      const aiProvidedClasses = node?.props?.appliedClasses;
      const aiProvidedActiveClass = node?.props?.activeClass;
      const aiProvidedAutoClass = node?.props?._autoClass;
      
      // Determine if we should preserve AI classes or generate new ones
      const hasValidAIClasses = Array.isArray(aiProvidedClasses) && aiProvidedClasses.length > 0;
      const hasValidAIAutoClass = typeof aiProvidedAutoClass === 'string' && aiProvidedAutoClass.length > 0;
      
      // Use AI-provided class name if available, otherwise generate new one
      const autoClassName = hasValidAIAutoClass 
        ? aiProvidedAutoClass 
        : (hasValidAIClasses ? aiProvidedClasses[0] : getUniqueAutoClassName(nodeType));
      
      // Build final appliedClasses: preserve AI classes if valid, otherwise use generated
      const finalAppliedClasses = hasValidAIClasses 
        ? aiProvidedClasses 
        : [autoClassName];
      
      // Active class: preserve AI active class if valid, otherwise use first applied class
      const finalActiveClass = aiProvidedActiveClass || finalAppliedClasses[0] || autoClassName;
      
      // Extract AI styles DURING normalization
      const extractedStyles = extractAIStyles(node);
      
      // Register class SYNCHRONOUSLY with extracted styles
      // Use the primary class name for registration (first in appliedClasses or autoClassName)
      const primaryClassName = finalAppliedClasses[0] || autoClassName;
      registerAutoClassSync(id, primaryClassName, extractedStyles);
      
      // If AI provided multiple classes, register all of them
      if (hasValidAIClasses && aiProvidedClasses.length > 1) {
        for (let i = 1; i < aiProvidedClasses.length; i++) {
          const additionalClassName = aiProvidedClasses[i];
          // Register additional classes with empty styles (they may be shared utility classes)
          const additionalClass = classStore.classes.find(c => c.name === additionalClassName);
          if (!additionalClass) {
            registerAutoClassSync(id, additionalClassName, {});
          }
        }
      }
      
      // Auto-generate children for accordion, tabs, and carousel if they don't have any
      let generatedChildren: AppComponent[] = [];
      if (!node?.children || node.children.length === 0) {
        if (nodeType === 'accordion') {
          generatedChildren = [1, 2, 3].map((num) => ({
            id: `accordion-item-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'accordion-item' as const,
            props: { title: `Section ${num}`, _autoClass: getUniqueAutoClassName('accordion-item'), appliedClasses: [], activeClass: '' },
            style: {},
            children: [
              { id: `accordion-header-${Date.now()}-${seq++}`, type: 'accordion-header' as const, props: { content: `Section ${num}`, _autoClass: getUniqueAutoClassName('accordion-header'), appliedClasses: [], activeClass: '' }, style: {}, children: [] },
              { id: `accordion-content-${Date.now()}-${seq++}`, type: 'accordion-content' as const, props: { content: `Content for section ${num}`, _autoClass: getUniqueAutoClassName('accordion-content'), appliedClasses: [], activeClass: '' }, style: {}, children: [] }
            ]
          }));
        } else if (nodeType === 'tabs') {
          generatedChildren = [1, 2, 3].map((num) => ({
            id: `tab-item-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'tab-item' as const,
            props: { label: `Tab ${num}`, _autoClass: getUniqueAutoClassName('tab-item'), appliedClasses: [], activeClass: '' },
            style: {},
            children: [
              { id: `tab-trigger-${Date.now()}-${seq++}`, type: 'tab-trigger' as const, props: { content: `Tab ${num}`, _autoClass: getUniqueAutoClassName('tab-trigger'), appliedClasses: [], activeClass: '' }, style: {}, children: [] },
              { id: `tab-content-${Date.now()}-${seq++}`, type: 'tab-content' as const, props: { content: `Content for tab ${num}`, _autoClass: getUniqueAutoClassName('tab-content'), appliedClasses: [], activeClass: '' }, style: {}, children: [] }
            ]
          }));
        } else if (nodeType === 'carousel') {
          // Generate 3 carousel slides by default
          generatedChildren = [1, 2, 3].map((num) => ({
            id: `carousel-slide-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'carousel-slide' as const,
            props: { label: `Slide ${num}`, _autoClass: getUniqueAutoClassName('carousel-slide'), appliedClasses: [], activeClass: '' },
            style: {},
            children: [
              { 
                id: `carousel-slide-content-${Date.now()}-${seq++}`, 
                type: 'carousel-slide-content' as const, 
                props: { content: `Content for slide ${num}`, _autoClass: getUniqueAutoClassName('carousel-slide-content'), appliedClasses: [], activeClass: '' }, 
                style: {}, 
                children: [] 
              }
            ]
          }));
        }
      }
      
      const existingChildren = Array.isArray(node?.children) ? node.children.map(normalizeComponentTree) : [];
      
      // Merge props with defaults, but preserve intentionally empty strings from AI
      const mergedProps: Record<string, any> = {
        ...defaultProps,
        ...node?.props,
        _autoClass: autoClassName,
        appliedClasses: finalAppliedClasses,
        activeClass: finalActiveClass,
        // CRITICAL: Preserve _aiGenerated flag for proper rendering and persistence
        _aiGenerated: node?.props?._aiGenerated === true ? true : undefined,
      };
      
      // Inject Design System token refs for supported component types
      // Only inject if the component doesn't already have DS refs (e.g., from AI generation)
      if (!mergedProps._dsTokenRefs) {
        const dsRefs = generateInitialDSTokenRefs(nodeType);
        if (dsRefs) {
          mergedProps._dsTokenRefs = dsRefs;
        }
      }
      
      // Preserve AI-set empty strings for content props (they should override defaults)
      const contentProps = ['text', 'content', 'label', 'placeholder'];
      contentProps.forEach(prop => {
        if (node?.props && prop in node.props && node.props[prop] === '') {
          mergedProps[prop] = '';
        }
      });

      return {
        ...node,
        id,
        type: nodeType,
        props: mergedProps,
        style: node?.style || {},
        classNames: node?.classNames,
        styleOverrides: node?.styleOverrides,
        children: existingChildren.length > 0 ? existingChildren : generatedChildren.map(normalizeComponentTree),
      } as AppComponent;
    };
    const normalizedInput = normalizeComponentTree(component);
    
    // Check if we're in component editing mode
    const userComponentState = useUserComponentStore.getState();
    if (userComponentState.isEditingMode && userComponentState.editingDefinition) {
      // Add to the editing definition instead of the page
      const editingDef = userComponentState.editingDefinition;
      
      // The component already has auto-class from normalizeComponentTree
      const newComponentId = normalizedInput.id;
      const autoClassName = normalizedInput.props?._autoClass;
      
      const newComponent: AppComponent = {
        ...normalizedInput,
        id: newComponentId,
        children: Array.isArray(normalizedInput.children) ? normalizedInput.children : [],
      };

      console.log(`[EditingMode] Adding component ${newComponent.type} with auto-class:`, autoClassName);
      
      // Classes are now registered synchronously during normalizeComponentTree
      // No need for separate registerAllAutoClasses call here

      // Helper function to add component to the editing definition tree
      const addToEditingDefinition = (def: AppComponent): AppComponent => {
        if (!parentId || parentId === 'root' || parentId === editingDef.id) {
          // Add to root level (inside the main editing container)
          const children = def.children || [];
          if (index !== undefined) {
            const newChildren = [...children];
            newChildren.splice(index, 0, newComponent);
            return { ...def, children: newChildren };
          }
          return { ...def, children: [...children, newComponent] };
        }

        // Add to a nested parent
        const addToChildren = (comp: AppComponent): AppComponent => {
          if (comp.id === parentId) {
            const children = comp.children || [];
            if (index !== undefined) {
              const newChildren = [...children];
              newChildren.splice(index, 0, newComponent);
              return { ...comp, children: newChildren };
            }
            return { ...comp, children: [...children, newComponent] };
          }
          if (comp.children) {
            return { ...comp, children: comp.children.map(addToChildren) };
          }
          return comp;
        };

        return {
          ...def,
          children: def.children?.map(addToChildren) || []
        };
      };

      const updatedDefinition = addToEditingDefinition(editingDef);
      userComponentState.updateEditingDefinition(updatedDefinition);
      
      // Select the new component
      set({ selectedComponent: newComponent.id });
      return;
    }
    
    // Normal page editing flow
    if (!currentProject || !currentPage) {
      console.warn('[addComponent] Aborted: currentProject or currentPage missing', { 
        hasProject: !!currentProject, 
        hasPage: !!currentPage,
        componentType: normalizedInput?.type 
      });
      return;
    }

    const currentPageData = currentProject.pages.find(page => page.id === currentPage);
    if (!currentPageData) return;

    // The normalized input already has unique IDs and auto-classes for all nested children
    const newComponentId = normalizedInput.id;
    const autoClassName = normalizedInput.props?._autoClass;
    
    const newComponent: AppComponent = {
      ...normalizedInput,
      id: newComponentId,
      children: Array.isArray(normalizedInput.children) ? normalizedInput.children : [],
    };

    console.log(`Adding component ${newComponent.type} with auto-class:`, autoClassName);
    
    // Classes are now registered synchronously during normalizeComponentTree
    // No need for separate registerAllAutoClasses call here

    // Helper function to add component to the tree
    const addToComponents = (components: AppComponent[]): AppComponent[] => {
      if (!parentId) {
        if (index !== undefined) {
          const newComponents = [...components];
          newComponents.splice(index, 0, newComponent);
          return newComponents;
        }
        return [...components, newComponent];
      }

      return components.map(comp => {
        if (comp.id === parentId) {
          const children = comp.children || [];
          if (index !== undefined) {
            const newChildren = [...children];
            newChildren.splice(index, 0, newComponent);
            return { ...comp, children: newChildren };
          }
          return { ...comp, children: [...children, newComponent] };
        }
        if (comp.children) {
          return { ...comp, children: addToComponents(comp.children) };
        }
        return comp;
      });
    };

    const updatedComponents = addToComponents(currentPageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject,
      selectedComponent: newComponent.id
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after adding component:', error);
    });
  },

  replaceComponentAtIndex: (pageId, index, newComponent) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.map(page => {
      if (page.id !== pageId) return page;
      const updatedComponents = [...page.components];
      if (index < 0 || index >= updatedComponents.length) {
        console.warn(`[replaceComponentAtIndex] Index ${index} out of bounds (length ${updatedComponents.length})`);
        return page;
      }
      console.log(`[replaceComponentAtIndex] Replacing component at index ${index}: "${updatedComponents[index]?.id}" → "${newComponent.id}"`);
      updatedComponents[index] = newComponent;
      return { ...page, components: updatedComponents };
    });

    const updatedProject = { ...currentProject, pages: updatedPages };
    set({ currentProject: updatedProject });

    // Save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after replacing component:', error);
    });
  },

  addComponentsBatch: (components, clearExisting = false) => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;

    const currentPageData = currentProject.pages.find(page => page.id === currentPage);
    if (!currentPageData) return;

    // Get class store for generating unique auto-class names
    const classStore = useClassStore.getState();
    const usedClassNames = new Set(classStore.classes.map(c => c.name));
    const batchUsedNames = new Set<string>();
    
    // Helper to generate unique auto-class name
    const getUniqueAutoClassName = (componentType: string): string => {
      const baseName = componentType.toLowerCase().replace(/[^a-z0-9]/g, '-');
      let number = 1;
      let candidateName = `${baseName}-${number}`;
      
      while (usedClassNames.has(candidateName) || batchUsedNames.has(candidateName)) {
        number++;
        candidateName = `${baseName}-${number}`;
      }
      
      batchUsedNames.add(candidateName);
      return candidateName;
    };
    
    // Style properties to extract
    const stylePropertyKeys = [
      'backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder',
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign', 'letterSpacing',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'spacingControl',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'gap', 'rowGap', 'columnGap',
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'alignContent', 'flexWrap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
      'borderRadius', 'border', 'borderWidth', 'borderColor', 'borderStyle',
      'boxShadows', 'boxShadow', 'opacity', 'backdropFilter',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'overflow', 'overflowX', 'overflowY',
      'transform', 'transition'
    ];
    
    // Helper to extract AI styles
    const extractAIStyles = (compNode: any): Record<string, any> => {
      const extractedStyles: Record<string, any> = {};
      
      for (const key of stylePropertyKeys) {
        if (compNode?.props?.[key] !== undefined) {
          extractedStyles[key] = compNode.props[key];
        }
      }
      
      const nodeStyle = compNode?.style;
      if (nodeStyle && typeof nodeStyle === 'object') {
        if (nodeStyle.layout) Object.assign(extractedStyles, nodeStyle.layout);
        if (nodeStyle.sizing) Object.assign(extractedStyles, nodeStyle.sizing);
        if (nodeStyle.spacing) extractedStyles.spacingControl = nodeStyle.spacing;
        if (nodeStyle.typography) Object.assign(extractedStyles, nodeStyle.typography);
        if (nodeStyle.background) {
          if (nodeStyle.background.color) extractedStyles.backgroundColor = nodeStyle.background.color;
          if (nodeStyle.background.gradient) {
            extractedStyles.backgroundGradient = nodeStyle.background.gradient;
            extractedStyles.backgroundLayerOrder = ['gradient', 'fill'];
          }
        }
        for (const key of stylePropertyKeys) {
          if (nodeStyle[key] !== undefined && extractedStyles[key] === undefined) {
            extractedStyles[key] = nodeStyle[key];
          }
        }
      }
      
      return extractedStyles;
    };
    
    // Synchronous class registration
    const registerAutoClassSync = (compId: string, autoClassName: string, extractedStyles: Record<string, any>) => {
      const existingClass = classStore.classes.find(c => c.name === autoClassName);
      
      if (!existingClass) {
        const newClassId = `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newClass = {
          id: newClassId,
          name: autoClassName,
          styles: extractedStyles,
          stateStyles: { none: {}, hover: {}, pressed: {}, focused: {}, 'focus-visible': {}, 'focus-within': {} },
          appliedTo: [compId],
          inheritsFrom: [],
          isAutoClass: true,
          dependentClasses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        useClassStore.setState((state) => ({
          classes: [...state.classes, newClass]
        }));
      }
    };
    
    // Normalize component tree
    let seq = 0;
    const normalizeComponentTree = (node: any, forceNewIds = false): AppComponent => {
      const nodeType = node?.type || 'component';
      const id = forceNewIds
        ? `${nodeType}-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`
        : (node?.id || `${nodeType}-${Date.now()}-${seq++}-${Math.random().toString(36).slice(2, 6)}`);
      const defaultProps = getDefaultPropsForComponent(nodeType);
      
      const aiProvidedClasses = node?.props?.appliedClasses;
      const aiProvidedActiveClass = node?.props?.activeClass;
      const aiProvidedAutoClass = node?.props?._autoClass;
      
      const hasValidAIClasses = Array.isArray(aiProvidedClasses) && aiProvidedClasses.length > 0;
      const hasValidAIAutoClass = typeof aiProvidedAutoClass === 'string' && aiProvidedAutoClass.length > 0;
      
      const autoClassName = hasValidAIAutoClass 
        ? aiProvidedAutoClass 
        : (hasValidAIClasses ? aiProvidedClasses[0] : getUniqueAutoClassName(nodeType));
      
      const finalAppliedClasses = hasValidAIClasses ? aiProvidedClasses : [autoClassName];
      const finalActiveClass = aiProvidedActiveClass || finalAppliedClasses[0] || autoClassName;
      
      const extractedStyles = extractAIStyles(node);
      const primaryClassName = finalAppliedClasses[0] || autoClassName;
      registerAutoClassSync(id, primaryClassName, extractedStyles);
      
      const existingChildren = Array.isArray(node?.children) ? node.children.map((c: any) => normalizeComponentTree(c, forceNewIds)) : [];
      
      const mergedProps: Record<string, any> = {
        ...defaultProps,
        ...node?.props,
        _autoClass: autoClassName,
        appliedClasses: finalAppliedClasses,
        activeClass: finalActiveClass,
        _aiGenerated: node?.props?._aiGenerated === true ? true : undefined,
      };
      
      // Inject Design System token refs for supported component types
      if (!mergedProps._dsTokenRefs) {
        const dsRefs = generateInitialDSTokenRefs(nodeType);
        if (dsRefs) {
          mergedProps._dsTokenRefs = dsRefs;
          // Remove DS-linked style properties from direct props so they don't
          // conflict with DS token detection (values are already in the auto-class).
          // Only remove if the property is NOT explicitly locked by the user.
          const lockedProps = mergedProps.__lockedProps || {};
          for (const propName of Object.keys(dsRefs)) {
            if (!lockedProps[propName] && mergedProps[propName] !== undefined) {
              delete mergedProps[propName];
            }
          }
        }
      }

      return {
        ...node,
        id,
        type: nodeType,
        props: mergedProps,
        style: node?.style || {},
        classNames: node?.classNames,
        styleOverrides: node?.styleOverrides,
        children: existingChildren,
      } as AppComponent;
    };

    // Normalize all components at once
    const shouldForceNewIds = !clearExisting;
    const normalizedComponents = components.map(component => normalizeComponentTree(component, shouldForceNewIds));

    // Either clear and replace, or append to existing
    const updatedComponents = clearExisting 
      ? normalizedComponents 
      : [...currentPageData.components, ...normalizedComponents];

    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject,
      selectedComponent: normalizedComponents[normalizedComponents.length - 1]?.id
    });

    // SINGLE save operation for entire batch - prevents race conditions
    appBuilderService.updateAppProject(currentProject.id, { pages: updatedPages }).catch(error => {
      console.error('Failed to save project after batch adding components:', error);
    });
    
    console.log(`[AppBuilder] Batch added ${normalizedComponents.length} components with single save`);
  },

  updateComponent: (componentId, updates) => {
    const { currentProject, currentPage } = get();
    
    // Check if we're in component editing mode
    const userComponentState = useUserComponentStore.getState();
    const isInComponentEditingMode = userComponentState.isEditingMode && userComponentState.editingDefinition;
    
    if (isInComponentEditingMode) {
      // Update within the editing definition
      const editingDef = userComponentState.editingDefinition!;
      
      const updateInDefinition = (comp: AppComponent): AppComponent => {
        if (comp.id === componentId) {
          let updatedComponent = { ...comp, ...updates } as AppComponent;
          
          if (updates.props) {
            const prevProps = comp.props || {};
            const nextProps = updates.props as Record<string, any>;
            
            const finalPropertySource = nextProps._propertySource !== undefined
              ? nextProps._propertySource
              : prevProps._propertySource;
            
            const finalLockedProps = nextProps.__lockedProps !== undefined
              ? nextProps.__lockedProps
              : prevProps.__lockedProps;
              
            const finalEditedProps = nextProps.__editedProps !== undefined
              ? nextProps.__editedProps
              : prevProps.__editedProps;

            const finalProps: Record<string, any> = {
              ...nextProps,
              _propertySource: finalPropertySource,
              __lockedProps: finalLockedProps,
              __editedProps: finalEditedProps,
              appliedClasses: nextProps.appliedClasses !== undefined 
                ? nextProps.appliedClasses 
                : prevProps.appliedClasses,
              _autoClass: nextProps._autoClass !== undefined
                ? nextProps._autoClass
                : prevProps._autoClass
            };

            updatedComponent = { ...updatedComponent, props: finalProps } as AppComponent;
          }
          
          return updatedComponent;
        }
        if (comp.children) {
          return { ...comp, children: comp.children.map(updateInDefinition) };
        }
        return comp;
      };

      const updatedDefinition = updateInDefinition(editingDef);
      userComponentState.updateEditingDefinition(updatedDefinition);
      
      // CRITICAL FIX: Also trigger class update logic for component editing mode
      // This ensures class changes propagate to all pages using that class
      if (updates.props && !getIsApplyingClass()) {
        // Find component in editing definition
        const findComponentInDef = (comp: AppComponent): AppComponent | null => {
          if (comp.id === componentId) return comp;
          if (comp.children) {
            for (const child of comp.children) {
              const found = findComponentInDef(child);
              if (found) return found;
            }
          }
          return null;
        };
        
        const currentComponent = findComponentInDef(updatedDefinition);
        
        if (currentComponent) {
          const editedStyleProps = extractEditedProperties(
            { ...currentComponent.props },
            currentComponent.type,
            currentComponent.props?.__editedProps
          );
          
          const incomingSources = (updates.props as any)?._propertySource || {};
          const hasUserEditedProps = Object.keys(editedStyleProps).length > 0 && 
            Object.keys(editedStyleProps).some(key => {
              const incoming = incomingSources[key];
              if (incoming && incoming.source === 'class') return false;
              return true;
            });
          
            if (Object.keys(editedStyleProps).length > 0 && hasUserEditedProps) {
              const appliedClassesRaw = currentComponent?.props?.appliedClasses;
              const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];

              const targetClassName = 
                currentComponent?.props?.activeClass || 
                currentComponent?.props?._autoClass ||
                (appliedClasses[0] || null);
            
            if (targetClassName) {
              // Debounce updates to existing class
              if (autoClassUpdateTimers.has(componentId)) {
                clearTimeout(autoClassUpdateTimers.get(componentId)!);
              }

              const freshLockedProps = { ...((updates.props as any)?.__lockedProps || currentComponent?.props?.__lockedProps || {}) };

              // Faster feedback for background edits (prevents BackgroundEditor from desyncing)
              const fastProps = [
                'backgroundColor', 'backgroundGradient', 'backgroundImage',
                'backgroundLayerOrder', 'backgroundSize', 'backgroundRepeat',
                'backgroundPosition', 'backgroundAttachment', 'background'
              ];
              const hasFastChange = Object.keys(editedStyleProps).some((k) => fastProps.includes(k));
              const debounceMs = hasFastChange ? 50 : 800;

              console.log('[Component Edit Mode - Class Update] Setting timer:', {
                targetClassName,
                componentId,
                editedStylePropsKeys: Object.keys(editedStyleProps),
                backgroundColor: editedStyleProps.backgroundColor,
                debounceMs,
              });

              const timer = setTimeout(async () => {
                try {
                  console.log('[Component Edit Mode - Class Update] Timer fired - updating class:', targetClassName);

                  // CRITICAL FIX: Set this component as the "editor" so updateClass
                  // knows which component triggered the update and preserves its locks
                  setEditorComponentId(componentId);

                  const classStore = useClassStore.getState();
                  const targetClass = classStore.classes.find((c: any) => c.name === targetClassName);

                  if (targetClass) {
                    const appliedClasses = currentComponent?.props?.appliedClasses || [];
                    const isSecondaryClass = appliedClasses.length > 1 && targetClassName !== appliedClasses[0];

                    let propsToMerge = editedStyleProps;
                    if (isSecondaryClass) {
                      propsToMerge = filterByLockedProps(editedStyleProps, freshLockedProps);
                    }

                    const updatedStyles = mergeEditedPropertiesIntoClass(targetClass.styles, propsToMerge);

                    console.log('[Component Edit Mode - Class Update] Updating shared class:', {
                      className: targetClassName,
                      previousStyles: targetClass.styles,
                      editedProperties: propsToMerge,
                      mergedStyles: updatedStyles,
                    });

                    await classStore.updateClass(targetClass.id, { styles: updatedStyles });
                    console.log('[Component Edit Mode - Class Update] Updated class:', targetClassName);

                    // Clear editor component ID after update completes
                    setEditorComponentId(null);
                  } else {
                    console.warn('[Component Edit Mode - Class Update] Target class not found:', targetClassName);
                  }

                  autoClassUpdateTimers.delete(componentId);
                } catch (error) {
                  console.error('[Component Edit Mode - Class Update] Failed:', error);
                  autoClassUpdateTimers.delete(componentId);
                }
              }, debounceMs);

              autoClassUpdateTimers.set(componentId, timer);
            }
          }
        }
      }
      
      return;
    }
    
    // Normal page editing flow
    if (!currentProject || !currentPage) return;

    const currentPageData = currentProject.pages.find(page => page.id === currentPage);
    if (!currentPageData) return;

    console.log(`Updating component ${componentId} with:`, updates);

      // Auto-class creation - immediate on first edit
      if (updates.props && !getIsApplyingClass()) {
        const findComponent = (components: AppComponent[]): AppComponent | null => {
          for (const comp of components) {
            if (comp.id === componentId) return comp;
            if (comp.children) {
              const found = findComponent(comp.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const currentComponent = findComponent(currentPageData.components);
        
        // Extract only properties that differ from component defaults
        // This prevents saving default/untouched values to classes
        const editedStyleProps = currentComponent 
          ? extractEditedProperties(
              { ...currentComponent.props, ...updates.props },
              currentComponent.type,
              currentComponent.props?.__editedProps
            )
          : {};
        
        console.log('[AutoClass] Edited properties extracted:', editedStyleProps);
        
        // Check if any of the changed properties are user edits (not class applications)
        // A property is a user edit if:
        // 1. The incoming update does NOT explicitly mark it as from a class (user is typing/changing it)
        // 2. Even if the property WAS previously from a class, changing its value = user edit
        const incomingSources = (updates.props as any)?._propertySource || {};
        const hasUserEditedProps = Object.keys(editedStyleProps).length > 0 && 
          Object.keys(editedStyleProps).some(key => {
            // If the incoming update explicitly marks this key as coming from a class application,
            // it's NOT a user edit - it's a class being applied
            const incoming = incomingSources[key];
            if (incoming && incoming.source === 'class') return false;
            // Otherwise, the user is actively editing this property - it IS a user edit
            // regardless of whether it was previously from a class
            return true;
          });
        
        console.log('[AutoClass] hasUserEditedProps:', hasUserEditedProps, 'editedStyleProps:', Object.keys(editedStyleProps));
        
        // Track locked properties and edited properties for user edits
        // CRITICAL: Capture lockedPropsForAutoClass OUTSIDE the if block so it's accessible to async auto-class code
        let lockedPropsForAutoClass: Record<string, any> = currentComponent?.props?.__lockedProps || {};
        
        if (hasUserEditedProps && currentComponent) {
          // CRITICAL: Set this component as the "editor" so updateClass preserves its locks
          setEditorComponentId(componentId);
          
          const existingLocked = currentComponent.props?.__lockedProps || {};
          let updatedLocked = { ...existingLocked };
          
          // Track edited properties metadata
          const editedPaths = trackEditedProperties(
            { ...currentComponent.props, ...updates.props },
            currentComponent.type
          );
          
          // Get class context for determining edit behavior
          const appliedClasses = currentComponent.props?.appliedClasses || [];
          const hasSecondaryClasses = appliedClasses.length > 1;
          
          // CRITICAL: Only lock properties that are ACTUALLY CHANGED (different from current value)
          // Compare updates.props with currentComponent.props to find real changes
          // IMPORTANT: Content properties (text, link, href, etc.) should NEVER be shared through classes
          // Each component instance keeps its own content even when sharing the same class
          const excludedKeys = [
            // Class system metadata
            'appliedClasses', 'activeClass', 'componentName', '_autoClass', '__lockedProps', '__editedProps', '_propertySource',
            // Content properties - these are per-component, not per-class
            'text', 'content', 'href', 'link', 'url', 'src', 'alt', 'title', 'label', 'placeholder', 'value',
            'description', 'tag', 'icon', 'iconName', 'options', 'items', 'data',
            // Action properties
            'clickActions', 'actions', 'actionFlows', 'onClick', 'onHover', 'onFocus', 'onBlur',
            // Form specific
            'name', 'validation', 'errorMessage', 'successMessage',
            // Data binding
            'dataSource', 'dataBinding', 'fieldBinding', 'dataField', '_dataContext', '_parentConnection'
          ];
          
          const actuallyChangedProps = Object.keys(updates.props || {}).filter(key => {
            if (key.startsWith('_') || excludedKeys.includes(key)) return false;
            
            const currentValue = currentComponent.props?.[key];
            const newValue = (updates.props as any)[key];
            
            // Deep compare for objects
            if (typeof newValue === 'object' && newValue !== null) {
              return JSON.stringify(currentValue) !== JSON.stringify(newValue);
            }
            
            return currentValue !== newValue;
          });
          
          console.log('[AppBuilder] Actually changed props:', actuallyChangedProps);
          
          // Background-related properties that should NOT be locked when editing primary class
          // This ensures background changes propagate through the class to all components using it
          const backgroundStyleProps = [
            'backgroundColor', 'backgroundGradient', 'backgroundImage', 
            'backgroundLayerOrder', 'backgroundSize', 'backgroundRepeat', 
            'backgroundPosition', 'backgroundAttachment', 'background'
          ];
          
          actuallyChangedProps.forEach(key => {
            const incoming = incomingSources[key];
            // Only lock if this is a user edit (not a class application)
            if (!incoming || incoming.source !== 'class') {
              // CRITICAL FIX: When only primary class exists (no secondary classes),
              // background edits should sync through the class.
              // HOWEVER: backgroundColor is often edited as an object ({type:'solid', value, opacity}).
              // If we don't lock it, the renderer may omit it (style props are only included when locked)
              // and the UI appears to "vanish" after selection.
              const isBackgroundProp = backgroundStyleProps.includes(key);

              // CRITICAL: When only a primary class exists, background edits should sync through the class
              // We skip locking so the edit flows to the shared class and all components get updated
              if (isBackgroundProp && !hasSecondaryClasses) {
                // Skip locking - this edit will update the shared class
                // and all components using the class will receive the update
                console.log(`[AppBuilder] Skipping lock for "${key}" (background prop, primary class only - will sync through class)`);
              } else {
                updatedLocked = lockProperty(updatedLocked, key);
                console.log(`[AppBuilder] Locking property "${key}" (user edit - value actually changed)`);
              }
            }
          });
          
          // Note: When only primary class exists, edits update the shared class
          // Background props are NOT locked so they sync across all components using the class
          if (!hasSecondaryClasses) {
            console.log('[AppBuilder] Primary class only - background edits will sync through shared class');
          }
          
          // Add locked properties and edited props metadata to the updates
          if (updates.props) {
            (updates.props as any).__lockedProps = updatedLocked;
            (updates.props as any).__editedProps = editedStyleProps;
          }
          
          // Update for async auto-class code to use
          lockedPropsForAutoClass = updatedLocked;
        }
        
        // Only proceed if there are edited style changes AND they're from user edits (not class applications)
        if (Object.keys(editedStyleProps).length > 0 && currentComponent && hasUserEditedProps) {
          const appliedClassesRaw = currentComponent?.props?.appliedClasses;
          const appliedClasses: string[] = Array.isArray(appliedClassesRaw) ? appliedClassesRaw : [];

          // Get the target class to update: prioritize activeClass, then _autoClass, then first applied class
          const targetClassName = 
            currentComponent?.props?.activeClass || 
            currentComponent?.props?._autoClass ||
            (appliedClasses[0] || null);
          
          // If no class exists, create a new auto-class
          if (!targetClassName) {
            // Create immediately (no debounce for first-time creation)
            (async () => {
              try {
                const { useClassStore } = await import('@/stores/classStore');
                const classStore = useClassStore.getState();
                
                // DEDUPE: Check if an auto-class with identical styles already exists
                const existingClass = findExistingClassByStyles(editedStyleProps, classStore.classes);
                
                if (existingClass) {
                  // IDEMPOTENT: Reuse existing class instead of creating duplicate
                  console.log('[AutoClass] Reusing existing class:', existingClass.name);
                  
                  // Check if already applied to this component (prevent duplicate application)
                  if (!existingClass.appliedTo.includes(componentId)) {
                    await classStore.applyClassToComponent(existingClass.id, componentId, lockedPropsForAutoClass);
                  }
                  
                  const propertySources = { ...(currentComponent.props?._propertySource || {}) };
                  Object.keys(editedStyleProps).forEach(key => {
                    propertySources[key] = { source: 'class', classId: existingClass.id, className: existingClass.name };
                  });
                  
                  // Update component with class reference and set as active
                  const { currentProject, currentPage } = get();
                  if (currentProject && currentPage) {
                    const pageData = currentProject.pages.find(p => p.id === currentPage);
                    if (pageData) {
                      const updateInComponents = (components: AppComponent[]): AppComponent[] => {
                        return components.map(comp => {
                          if (comp.id === componentId) {
                            return { 
                              ...comp, 
                              props: { 
                                ...comp.props, 
                                _autoClass: existingClass.name, 
                                activeClass: existingClass.name,
                                _propertySource: propertySources,
                                // CRITICAL: Use captured lockedPropsForAutoClass (not stale comp.props)
                                __lockedProps: lockedPropsForAutoClass
                              } 
                            };
                          }
                          if (comp.children) {
                            return { ...comp, children: updateInComponents(comp.children) };
                          }
                          return comp;
                        });
                      };
                      
                      const updatedPages = currentProject.pages.map(p => 
                        p.id === currentPage ? { ...p, components: updateInComponents(p.components) } : p
                      );
                      
                      set({ currentProject: { ...currentProject, pages: updatedPages } });
                    }
                  }
                } else {
                  // Create new auto-class with type-based sequential naming
                  const newAutoClassName = generateAutoClassName(
                    currentComponent.type, 
                    classStore.classes,
                    undefined, // Don't pass componentName for consistent naming
                    currentProject?.id
                  );
                  
                  // CRITICAL: If element already has classes, this is a SECONDARY class
                  // Only include properties that are LOCKED (user-edited on THIS element)
                  // This prevents storing inherited primary class values in the secondary class
                  const existingClasses = currentComponent.props?.appliedClasses || [];
                  const isSecondaryClass = existingClasses.length > 0;
                  
                  let stylesToSave = editedStyleProps;
                  if (isSecondaryClass) {
                    const lockedProps = currentComponent.props?.__lockedProps || {};
                    stylesToSave = filterByLockedProps(editedStyleProps, lockedProps);
                    console.log('[AutoClass] Creating SECONDARY class - filtering by locked props:', {
                      className: newAutoClassName,
                      originalProps: editedStyleProps,
                      lockedProps,
                      filteredProps: stylesToSave
                    });
                  }
                  
                  // Create new class with appropriate properties
                  const newClass = await classStore.addClass(newAutoClassName, stylesToSave, true);
                  if (newClass) {
                    // Register the style hash for future deduplication
                    registerStyleHash(editedStyleProps, newAutoClassName);
                    
                    await classStore.applyClassToComponent(newClass.id, componentId, lockedPropsForAutoClass);
                    const propertySources = { ...(currentComponent.props?._propertySource || {}) };
                    Object.keys(editedStyleProps).forEach(key => {
                      propertySources[key] = { source: 'class', classId: newClass.id, className: newAutoClassName };
                    });
                    
                    // Update component with auto-class reference and set as active
                    const { currentProject, currentPage } = get();
                    if (currentProject && currentPage) {
                      const pageData = currentProject.pages.find(p => p.id === currentPage);
                      if (pageData) {
                        const updateInComponents = (components: AppComponent[]): AppComponent[] => {
                          return components.map(comp => {
                            if (comp.id === componentId) {
                              return { 
                                ...comp, 
                                props: { 
                                  ...comp.props, 
                                  _autoClass: newAutoClassName, 
                                  activeClass: newAutoClassName,
                                  _propertySource: propertySources,
                                  // CRITICAL: Use captured lockedPropsForAutoClass (not stale comp.props)
                                  __lockedProps: lockedPropsForAutoClass
                                } 
                              };
                            }
                            if (comp.children) {
                              return { ...comp, children: updateInComponents(comp.children) };
                            }
                            return comp;
                          });
                        };
                        
                        const updatedPages = currentProject.pages.map(p => 
                          p.id === currentPage ? { ...p, components: updateInComponents(p.components) } : p
                        );
                        
                        set({ currentProject: { ...currentProject, pages: updatedPages } });
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('[AutoClass] Failed to create auto-class:', error);
              }
            })();
          } else {
            // Debounce updates to existing class (active, auto, or applied)
            if (autoClassUpdateTimers.has(componentId)) {
              clearTimeout(autoClassUpdateTimers.get(componentId)!);
            }

            // Capture fresh locked props BEFORE setting timer to avoid stale closure
            // Use updates.props.__lockedProps which contains the freshly computed locked props
            const freshLockedProps = { ...((updates.props as any)?.__lockedProps || currentComponent?.props?.__lockedProps || {}) };

            // Faster feedback for background edits (prevents BackgroundEditor from desyncing)
            const fastProps = [
              'backgroundColor', 'backgroundGradient', 'backgroundImage',
              'backgroundLayerOrder', 'backgroundSize', 'backgroundRepeat',
              'backgroundPosition', 'backgroundAttachment', 'background'
            ];
            const hasFastChange = Object.keys(editedStyleProps).some((k) => fastProps.includes(k));
            const debounceMs = hasFastChange ? 50 : 800;

            console.log('[Class Update] Setting timer for class update:', {
              targetClassName,
              componentId,
              editedStylePropsKeys: Object.keys(editedStyleProps),
              backgroundColor: editedStyleProps.backgroundColor,
              border: editedStyleProps.border,
              borderRadius: editedStyleProps.borderRadius,
              freshLockedProps,
              debounceMs,
            });

            const timer = setTimeout(async () => {
              try {
                console.log('[Class Update] Timer fired - updating class:', targetClassName);

                const { useClassStore } = await import('@/stores/classStore');
                const classStore = useClassStore.getState();

                const targetClass = classStore.classes.find((c: any) => c.name === targetClassName);
                if (targetClass) {
                  // Check if this is a SECONDARY class (not the primary/first class)
                  const appliedClasses = currentComponent?.props?.appliedClasses || [];
                  const isSecondaryClass = appliedClasses.length > 1 && targetClassName !== appliedClasses[0];

                  let propsToMerge = editedStyleProps;

                  // CRITICAL: For secondary classes, only include LOCKED (user-edited) properties
                  // This prevents secondary classes from storing inherited primary class values
                  if (isSecondaryClass) {
                    propsToMerge = filterByLockedProps(editedStyleProps, freshLockedProps);
                    console.log('[Class] Secondary class - filtering by locked props:', {
                      className: targetClassName,
                      originalProps: editedStyleProps,
                      lockedProps: freshLockedProps,
                      filteredProps: propsToMerge,
                    });
                  }

                  // Merge the appropriate properties into the class
                  const updatedStyles = mergeEditedPropertiesIntoClass(targetClass.styles, propsToMerge);

                  console.log('[Class] Updating shared class:', {
                    className: targetClassName,
                    isSecondaryClass,
                    previousStyles: targetClass.styles,
                    editedProperties: propsToMerge,
                    mergedStyles: updatedStyles,
                    backgroundColor: updatedStyles.backgroundColor,
                    border: updatedStyles.border,
                    borderRadius: updatedStyles.borderRadius,
                  });

                  await classStore.updateClass(targetClass.id, { styles: updatedStyles });
                  console.log('[Class] Updated existing class with properties:', targetClassName);
                } else {
                  console.warn('[Class Update] Target class not found:', targetClassName);
                }

                autoClassUpdateTimers.delete(componentId);
              } catch (error) {
                console.error('[AutoClass] Failed to update auto-class:', error);
                autoClassUpdateTimers.delete(componentId);
              }
            }, debounceMs);

            autoClassUpdateTimers.set(componentId, timer);
          }
        }
      }

    // Helper function to update component in the tree
    const updateInComponents = (components: AppComponent[]): AppComponent[] => {
      return components.map(comp => {
        if (comp.id === componentId) {
          let updatedComponent = { ...comp, ...updates } as AppComponent;

          // Handle props updates with proper property deletion support
          if (updates.props) {
            const prevProps = (comp as AppComponent).props || {};
            const nextProps = updates.props as Record<string, any>;
            
            // When _propertySource is provided in updates, it's the source of truth
            // Don't merge it - just use what's provided (this supports deletions)
            const finalPropertySource = nextProps._propertySource !== undefined
              ? nextProps._propertySource
              : prevProps._propertySource;
            
            // Preserve or merge locked properties and edited props
            const finalLockedProps = nextProps.__lockedProps !== undefined
              ? nextProps.__lockedProps
              : prevProps.__lockedProps;
              
            const finalEditedProps = nextProps.__editedProps !== undefined
              ? nextProps.__editedProps
              : prevProps.__editedProps;

            // Use nextProps as the base (supports deletions), but preserve special meta props if not explicitly set
            const finalProps: Record<string, any> = {
              ...nextProps,
              _propertySource: finalPropertySource,
              __lockedProps: finalLockedProps,
              __editedProps: finalEditedProps,
              // Preserve appliedClasses if not explicitly provided
              appliedClasses: nextProps.appliedClasses !== undefined 
                ? nextProps.appliedClasses 
                : prevProps.appliedClasses,
              // Preserve _autoClass if not explicitly provided  
              _autoClass: nextProps._autoClass !== undefined
                ? nextProps._autoClass
                : prevProps._autoClass
            };

            updatedComponent = {
              ...updatedComponent,
              props: finalProps
            } as AppComponent;
          }

          console.log(`Component ${componentId} updated:`, updatedComponent);
          return updatedComponent;
        }
        if (comp.children) {
          return { ...comp, children: updateInComponents(comp.children) };
        }
        return comp;
      });
    };

    const updatedComponents = updateInComponents(currentPageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject
    });

    // Save ONLY the pages payload to Supabase.
    // IMPORTANT: Do NOT send the entire project object here (it can overwrite concurrent
    // updates such as style_classes being saved by classStore).
    appBuilderService.updateAppProject(currentProject.id, { pages: updatedPages }).catch(error => {
      console.error('Failed to save project after updating component:', error);
    });
  },

  deleteComponent: async (componentId) => {
    const { currentProject, currentPage, selectedComponent } = get();
    
    // Check if we're in component editing mode
    const userComponentState = useUserComponentStore.getState();
    if (userComponentState.isEditingMode && userComponentState.editingDefinition) {
      // Delete from the editing definition
      const editingDef = userComponentState.editingDefinition;
      
      // Don't allow deleting the root container
      if (editingDef.id === componentId) {
        console.warn('[EditingMode] Cannot delete root container');
        return;
      }
      
      const removeFromDefinition = (comp: AppComponent): AppComponent => {
        if (comp.children) {
          return {
            ...comp,
            children: comp.children
              .filter(child => child.id !== componentId)
              .map(removeFromDefinition)
          };
        }
        return comp;
      };

      const updatedDefinition = removeFromDefinition(editingDef);
      userComponentState.updateEditingDefinition(updatedDefinition);
      
      // Clear selection if deleted component was selected
      if (selectedComponent === componentId) {
        set({ selectedComponent: undefined });
      }
      return;
    }
    
    // Normal page editing flow
    if (!currentProject || !currentPage) return;

    const currentPageData = currentProject.pages.find(page => page.id === currentPage);
    if (!currentPageData) return;

    // Helper function to find the component being deleted
    const findComponent = (components: AppComponent[]): AppComponent | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Helper to collect ALL component IDs and class names being deleted (including children)
    const collectAllComponentData = (component: AppComponent): { ids: string[], classNames: string[] } => {
      const ids = [component.id];
      const classNames = component.props?.appliedClasses ? [...component.props.appliedClasses] : [];
      
      if (component.children) {
        component.children.forEach(child => {
          const childData = collectAllComponentData(child);
          ids.push(...childData.ids);
          classNames.push(...childData.classNames);
        });
      }
      return { ids, classNames: [...new Set(classNames)] }; // Dedupe class names
    };

    // Find the component to check for orphaned classes
    const componentToDelete = findComponent(currentPageData.components);
    const orphanedClassIds: string[] = [];
    const allDeletedComponentIds: string[] = [];

    if (componentToDelete) {
      // Collect all component IDs and class names being deleted (parent + all children)
      const deletedData = collectAllComponentData(componentToDelete);
      allDeletedComponentIds.push(...deletedData.ids);
      
      const { classes } = useClassStore.getState();

      // Check each class name used by any deleted component
      for (const className of deletedData.classNames) {
        // Find ALL classes with this name
        const classesWithSameName = classes.filter(cls => cls.name === className);
        
        for (const classObj of classesWithSameName) {
          // Count how many components use this class BY NAME across all pages (excluding deleted ones)
          let usageCount = 0;
          
          for (const page of currentProject.pages) {
            const countInComponents = (components: AppComponent[]): number => {
              let count = 0;
              for (const comp of components) {
                // Don't count any component being deleted
                if (!allDeletedComponentIds.includes(comp.id) && 
                    comp.props?.appliedClasses?.includes(className)) {
                  count++;
                }
                if (comp.children) {
                  count += countInComponents(comp.children);
                }
              }
              return count;
            };
            usageCount += countInComponents(page.components);
          }

          // If no other component uses this class name, mark it for deletion
          if (usageCount === 0 && !orphanedClassIds.includes(classObj.id)) {
            orphanedClassIds.push(classObj.id);
            console.log('[AppBuilder] Marking orphaned class for deletion:', { 
              classId: classObj.id, 
              className: classObj.name,
              usageCount 
            });
          }
        }
      }
    }

    // Helper function to remove component from the tree
    const removeFromComponents = (components: AppComponent[]): AppComponent[] => {
      return components
        .filter(comp => comp.id !== componentId)
        .map(comp => {
          if (comp.children) {
            return { ...comp, children: removeFromComponents(comp.children) };
          }
          return comp;
        });
    };

    const updatedComponents = removeFromComponents(currentPageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject,
      selectedComponent: selectedComponent === componentId ? undefined : selectedComponent
    });

    // CRITICAL: Await class cleanup to ensure CSS is removed before save
    // Delete orphaned classes first
    if (orphanedClassIds.length > 0) {
      const { deleteClass } = useClassStore.getState();
      for (const classId of orphanedClassIds) {
        try {
          await deleteClass(classId);
        } catch (error) {
          console.error('Failed to delete orphaned class:', error);
        }
      }
    }

    // Clean up component references from all classes (including children)
    // MUST await to ensure cleanup completes before project save
    const { cleanupDeletedComponentReferences } = useClassStore.getState();
    for (const deletedId of allDeletedComponentIds) {
      try {
        await cleanupDeletedComponentReferences(deletedId);
      } catch (error) {
        console.error('Failed to cleanup class references for', deletedId, error);
      }
    }

    // Immediately save to Supabase (now that class cleanup is complete)
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after deleting component:', error);
    });
  },

  // Alias methods for backwards compatibility
  removePage: (pageId) => get().deletePage(pageId),
  removeComponent: async (componentId) => get().deleteComponent(componentId),

  moveComponent: (componentId, newParentId, newIndex) => {
    const { currentProject, currentPage } = get();
    
    // Check if we're in component editing mode
    const userComponentState = useUserComponentStore.getState();
    if (userComponentState.isEditingMode && userComponentState.editingDefinition) {
      const editingDef = userComponentState.editingDefinition;
      
      // Helper to find component in tree
      const findComponent = (comp: AppComponent): AppComponent | null => {
        if (comp.id === componentId) return comp;
        for (const child of comp.children || []) {
          const found = findComponent(child);
          if (found) return found;
        }
        return null;
      };
      
      const componentToMove = findComponent(editingDef);
      if (!componentToMove) return;
      
      // Remove from current location
      const removeComponent = (comp: AppComponent): AppComponent => {
        if (comp.children) {
          return {
            ...comp,
            children: comp.children
              .filter(child => child.id !== componentId)
              .map(removeComponent)
          };
        }
        return comp;
      };
      
      // Add to new location
      const addToNewLocation = (comp: AppComponent): AppComponent => {
        const targetId = newParentId === 'root' ? editingDef.id : newParentId;
        if (comp.id === targetId) {
          const children = [...(comp.children || [])];
          const insertIndex = newIndex !== undefined ? Math.min(newIndex, children.length) : children.length;
          children.splice(insertIndex, 0, componentToMove);
          return { ...comp, children };
        }
        if (comp.children) {
          return { ...comp, children: comp.children.map(addToNewLocation) };
        }
        return comp;
      };
      
      let updatedDefinition = removeComponent(editingDef);
      updatedDefinition = addToNewLocation(updatedDefinition);
      userComponentState.updateEditingDefinition(updatedDefinition);
      return;
    }
    
    // Normal page editing flow
    if (!currentProject || !currentPage) return;

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    // Helper function to find component and its parent
    const findComponentAndParent = (components: AppComponent[], targetId: string, parentId?: string): { component: AppComponent, parent: AppComponent | null, index: number } | null => {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (component.id === targetId) {
          return { component, parent: parentId ? components.find(c => c.id === parentId) || null : null, index: i };
        }
        if (component.children) {
          const found = findComponentAndParent(component.children, targetId, component.id);
          if (found) return found;
        }
      }
      return null;
    };

    // Helper function to remove component from its current location
    const removeFromParent = (components: AppComponent[], targetId: string): AppComponent[] => {
      return components.filter(component => {
        if (component.id === targetId) {
          return false;
        }
        if (component.children) {
          component.children = removeFromParent(component.children, targetId);
        }
        return true;
      });
    };

    // Helper function to add component to new location
    const addToParent = (components: AppComponent[], component: AppComponent, parentId?: string, index?: number): AppComponent[] => {
      if (!parentId || parentId === 'root') {
        const newComponents = [...components];
        const insertIndex = index !== undefined ? Math.min(index, newComponents.length) : newComponents.length;
        newComponents.splice(insertIndex, 0, component);
        return newComponents;
      } else {
        return components.map(comp => {
          if (comp.id === parentId) {
            const newChildren = [...(comp.children || [])];
            const insertIndex = index !== undefined ? Math.min(index, newChildren.length) : newChildren.length;
            newChildren.splice(insertIndex, 0, component);
            return { ...comp, children: newChildren };
          }
          if (comp.children) {
            return { ...comp, children: addToParent(comp.children, component, parentId, index) };
          }
          return comp;
        });
      }
    };

    // Find the component to move
    const result = findComponentAndParent(pageData.components, componentId);
    if (!result) return;

    const { component } = result;

    // Remove component from its current location
    let updatedComponents = removeFromParent(pageData.components, componentId);

    // Add component to new location
    updatedComponents = addToParent(updatedComponents, component, newParentId, newIndex);

    // Update the project
    const updatedPages = currentProject.pages.map(page => 
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after moving component:', error);
    });
  },

  moveComponentUp: (componentId) => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    // Helper function to find component and its parent
    const findComponentInParent = (components: AppComponent[], targetId: string): { index: number, parent: AppComponent[] } | null => {
      for (let i = 0; i < components.length; i++) {
        if (components[i].id === targetId) {
          return { index: i, parent: components };
        }
        if (components[i].children) {
          const found = findComponentInParent(components[i].children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findComponentInParent(pageData.components, componentId);
    if (!result || result.index === 0) return; // Can't move up if already at top

    const { index, parent } = result;
    const newComponents = [...parent];
    
    // Swap with previous element
    [newComponents[index - 1], newComponents[index]] = [newComponents[index], newComponents[index - 1]];
    
    // Update parent array
    const updateComponents = (components: AppComponent[]): AppComponent[] => {
      return components.map(comp => {
        if (comp.children === parent) {
          return { ...comp, children: newComponents };
        }
        if (comp.children) {
          return { ...comp, children: updateComponents(comp.children) };
        }
        return comp;
      });
    };

    const updatedComponents = parent === pageData.components ? newComponents : updateComponents(pageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage ? { ...page, components: updatedComponents } : page
    );

    const updatedProject = { ...currentProject, pages: updatedPages };
    set({ currentProject: updatedProject });

    // Save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after moving component up:', error);
    });
  },

  moveComponentDown: (componentId) => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    // Helper function to find component and its parent
    const findComponentInParent = (components: AppComponent[], targetId: string): { index: number, parent: AppComponent[] } | null => {
      for (let i = 0; i < components.length; i++) {
        if (components[i].id === targetId) {
          return { index: i, parent: components };
        }
        if (components[i].children) {
          const found = findComponentInParent(components[i].children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findComponentInParent(pageData.components, componentId);
    if (!result || result.index === result.parent.length - 1) return; // Can't move down if already at bottom

    const { index, parent } = result;
    const newComponents = [...parent];
    
    // Swap with next element
    [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
    
    // Update parent array
    const updateComponents = (components: AppComponent[]): AppComponent[] => {
      return components.map(comp => {
        if (comp.children === parent) {
          return { ...comp, children: newComponents };
        }
        if (comp.children) {
          return { ...comp, children: updateComponents(comp.children) };
        }
        return comp;
      });
    };

    const updatedComponents = parent === pageData.components ? newComponents : updateComponents(pageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage ? { ...page, components: updatedComponents } : page
    );

    const updatedProject = { ...currentProject, pages: updatedPages };
    set({ currentProject: updatedProject });

    // Save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after moving component down:', error);
    });
  },

  duplicateComponent: (componentId) => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;

    const currentPageData = currentProject.pages.find(page => page.id === currentPage);
    if (!currentPageData) return;

    // Find the component to duplicate
    const findComponent = (components: AppComponent[]): AppComponent | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Find parent of the component to duplicate (so we can add sibling)
    const findParentId = (components: AppComponent[], targetId: string, parentId: string | null = null): string | null => {
      for (const comp of components) {
        if (comp.id === targetId) return parentId;
        if (comp.children) {
          const found = findParentId(comp.children, targetId, comp.id);
          if (found !== undefined) return found;
        }
      }
      return undefined as any;
    };

    const componentToDuplicate = findComponent(currentPageData.components);
    if (!componentToDuplicate) return;

    const parentId = findParentId(currentPageData.components, componentId);

    // Track all class references that need to be updated with new component IDs
    const classUpdates: { className: string; newComponentId: string }[] = [];

    // Create a deep copy with new IDs but PRESERVE all class-related props
    const duplicateWithNewIds = (component: AppComponent): AppComponent => {
      const newId = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Track classes that need to be updated with this new component ID
      const appliedClasses = component.props?.appliedClasses || [];
      appliedClasses.forEach((className: string) => {
        classUpdates.push({ className, newComponentId: newId });
      });

      return {
        ...component,
        id: newId,
        // PRESERVE all props including class references (_autoClass, appliedClasses, activeClass, __lockedProps, __editedProps)
        props: {
          ...component.props,
        },
        children: component.children?.map(duplicateWithNewIds)
      };
    };

    const duplicatedComponent = duplicateWithNewIds(componentToDuplicate);
    
    // Update class store - add new component IDs to each class's appliedTo array
    const classStore = useClassStore.getState();
    classUpdates.forEach(({ className, newComponentId }) => {
      const styleClass = classStore.classes.find(c => c.name === className);
      if (styleClass && !styleClass.appliedTo.includes(newComponentId)) {
        const freshClasses = useClassStore.getState().classes;
        const updatedClasses = freshClasses.map(cls => 
          cls.id === styleClass.id && !cls.appliedTo.includes(newComponentId)
            ? { ...cls, appliedTo: [...cls.appliedTo, newComponentId] }
            : cls
        );
        useClassStore.setState({ classes: updatedClasses });
      }
    });

    // Add the duplicated component directly to the page (bypass addComponent to avoid auto-class generation)
    const addToComponents = (components: AppComponent[]): AppComponent[] => {
      if (!parentId) {
        // Find the index of the original component and add after it
        const originalIndex = components.findIndex(c => c.id === componentId);
        if (originalIndex !== -1) {
          const newComponents = [...components];
          newComponents.splice(originalIndex + 1, 0, duplicatedComponent);
          return newComponents;
        }
        return [...components, duplicatedComponent];
      }

      return components.map(comp => {
        if (comp.id === parentId) {
          const children = comp.children || [];
          const originalIndex = children.findIndex(c => c.id === componentId);
          if (originalIndex !== -1) {
            const newChildren = [...children];
            newChildren.splice(originalIndex + 1, 0, duplicatedComponent);
            return { ...comp, children: newChildren };
          }
          return { ...comp, children: [...children, duplicatedComponent] };
        }
        if (comp.children) {
          return { ...comp, children: addToComponents(comp.children) };
        }
        return comp;
      });
    };

    const updatedComponents = addToComponents(currentPageData.components);
    
    const updatedPages = currentProject.pages.map(page =>
      page.id === currentPage 
        ? { ...page, components: updatedComponents }
        : page
    );

    const updatedProject = {
      ...currentProject,
      pages: updatedPages
    };

    set({
      currentProject: updatedProject,
      selectedComponent: duplicatedComponent.id
    });

    // Immediately save to Supabase
    appBuilderService.updateAppProject(currentProject.id, updatedProject).catch(error => {
      console.error('Failed to save project after duplicating component:', error);
    });

    console.log(`Duplicated component ${componentId} -> ${duplicatedComponent.id} with preserved classes:`, 
      duplicatedComponent.props?.appliedClasses);
  },

  // Data Binding Actions
  configureDataBinding: (componentId: string, dataSource: any) => {
    const { updateComponent } = get();
    updateComponent(componentId, { dataSource });
  },

  setSelectedDatabase: (databaseId: string | undefined, databaseName: string | undefined) => {
    const { currentProject } = get();
    // Update local UI state immediately
    set({ selectedDatabaseId: databaseId, selectedDatabaseName: databaseName });

    // Persist into current project's settings so it survives reloads
    if (currentProject) {
      const prevSettings = currentProject.settings || ({} as any);
      const newSettings = {
        ...prevSettings,
        database: {
          ...(prevSettings.database || {}),
          selectedId: databaseId,
          selectedName: databaseName,
          // Keep existing connections if any
          connections: prevSettings.database?.connections || []
        }
      } as typeof currentProject.settings;

      const updatedProject = { ...currentProject, settings: newSettings };
      set({ currentProject: updatedProject });

      // Fire-and-forget save
      appBuilderService
        .updateAppProject(currentProject.id, { settings: newSettings })
        .catch((e) => console.error('Failed to persist selected database:', e));
    }
  },

  // Global Header Actions
  setGlobalHeader: (componentId: string, sourcePageId: string, type: 'nav-horizontal' | 'nav-vertical') => {
    const { currentProject, updateComponent } = get();
    if (!currentProject) return;

    const prevSettings = currentProject.settings || ({} as any);
    const existing = prevSettings.globalHeaders || [];
    
    // Remove any existing header of the same type
    const filtered = existing.filter((h: any) => h.type !== type);
    // Also unset _isGlobalHeader on the old component of this type
    const oldHeader = existing.find((h: any) => h.type === type);
    if (oldHeader) {
      updateComponent(oldHeader.id, { props: { _isGlobalHeader: false } });
    }
    
    const newHeaders = [...filtered, { id: componentId, sourcePageId, type }];
    const newSettings = { ...prevSettings, globalHeaders: newHeaders };
    const updatedProject = { ...currentProject, settings: newSettings };
    set({ currentProject: updatedProject });
    
    // Set the prop on the component
    updateComponent(componentId, { props: { _isGlobalHeader: true } });

    appBuilderService
      .updateAppProject(currentProject.id, { settings: newSettings })
      .catch((e) => console.error('Failed to persist global header:', e));
  },

  removeGlobalHeader: (componentId: string) => {
    const { currentProject, updateComponent } = get();
    if (!currentProject) return;

    const prevSettings = currentProject.settings || ({} as any);
    const existing = prevSettings.globalHeaders || [];
    const newHeaders = existing.filter((h: any) => h.id !== componentId);
    const newSettings = { ...prevSettings, globalHeaders: newHeaders };
    const updatedProject = { ...currentProject, settings: newSettings };
    set({ currentProject: updatedProject });

    updateComponent(componentId, { props: { _isGlobalHeader: false } });

    appBuilderService
      .updateAppProject(currentProject.id, { settings: newSettings })
      .catch((e) => console.error('Failed to remove global header:', e));
  },

  togglePageGlobalHeaderExclusion: (pageId: string, headerId: string) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedPages = currentProject.pages.map(page => {
      if (page.id !== pageId) return page;
      const excluded = page.settings?.excludedGlobalHeaders || [];
      const isExcluded = excluded.includes(headerId);
      return {
        ...page,
        settings: {
          ...page.settings,
          excludedGlobalHeaders: isExcluded
            ? excluded.filter((id: string) => id !== headerId)
            : [...excluded, headerId],
        }
      };
    });

    const updatedProject = { ...currentProject, pages: updatedPages };
    set({ currentProject: updatedProject });

    appBuilderService
      .updateAppProject(currentProject.id, updatedProject)
      .catch((e) => console.error('Failed to toggle global header exclusion:', e));
  },

  // AI Actions
  generateComponent: async (prompt: string, context?: any) => {
    try {
      const result = await appBuilderService.generateWithAI(prompt, context);
      if (result.success && result.component) {
        return result.component as AppComponent;
      }
      return null;
    } catch (error) {
      console.error('Failed to generate component:', error);
      return null;
    }
  },

  // Enhanced Selection Actions
  selectMultipleComponents: (componentIds) => {
    const state = get();
    if (state.isSelectionLocked) return;
    set({ 
      selectedComponents: componentIds,
      selectedComponent: componentIds[componentIds.length - 1] || undefined 
    });
  },

  toggleComponentSelection: (componentId) => {
    const state = get();
    if (state.isSelectionLocked) return;
    const isSelected = state.selectedComponents.includes(componentId);
    const newSelection = isSelected 
      ? state.selectedComponents.filter(id => id !== componentId)
      : [...state.selectedComponents, componentId];
    set({ 
      selectedComponents: newSelection,
      selectedComponent: newSelection[newSelection.length - 1] || undefined 
    });
  },

  clearSelection: () => {
    const state = get();
    if (state.isSelectionLocked) return;
    set({ selectedComponents: [], selectedComponent: undefined });
  },

  selectAllComponents: () => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;
    
    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    const getAllComponentIds = (components: AppComponent[]): string[] => {
      return components.reduce((ids, comp) => {
        ids.push(comp.id);
        if (comp.children) {
          ids.push(...getAllComponentIds(comp.children));
        }
        return ids;
      }, [] as string[]);
    };

    const allIds = getAllComponentIds(pageData.components);
    set({ 
      selectedComponents: allIds,
      selectedComponent: allIds[allIds.length - 1] || undefined 
    });
  },

  setMultiSelectMode: (enabled) => set({ multiSelectMode: enabled }),
  lockSelection: () => set({ isSelectionLocked: true }),
  unlockSelection: () => set({ isSelectionLocked: false }),

  // Enhanced Editor Actions (will be implemented via external history hook)
  undoAction: () => {
    // This will be overridden by the external history hook
  },

  redoAction: () => {
    // This will be overridden by the external history hook
  },

  canUndo: () => false, // Will be overridden by external history hook
  canRedo: () => false, // Will be overridden by external history hook

  // Set external history handlers (called from components using useEditorHistory)
  setHistoryHandlers: (handlers: {
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  }) => {
    set({
      undoAction: handlers.undo,
      redoAction: handlers.redo,
      canUndo: handlers.canUndo,
      canRedo: handlers.canRedo,
    });
  },

  copySelectedComponents: () => {
    console.log('Copy components - implement with useClipboard hook');
  },

  cutSelectedComponents: () => {
    console.log('Cut components - implement with useClipboard hook');
  },

  pasteComponents: () => {
    console.log('Paste components - implement with useClipboard hook');
  },

  duplicateSelectedComponents: () => {
    const { selectedComponents } = get();
    selectedComponents.forEach(componentId => {
      get().duplicateComponent(componentId);
    });
  },

  deleteSelectedComponents: () => {
    const { selectedComponents } = get();
    selectedComponents.forEach(componentId => {
      get().deleteComponent(componentId);
    });
    get().clearSelection();
  },

  groupSelectedComponents: () => {
    // Placeholder for grouping functionality
    console.log('Group components not yet implemented');
  },

  ungroupSelectedComponents: () => {
    // Placeholder for ungrouping functionality
    console.log('Ungroup components not yet implemented');
  },

  alignComponents: (alignment) => {
    // Placeholder for alignment functionality
    console.log('Align components not yet implemented:', alignment);
  },

  distributeComponents: (direction) => {
    // Placeholder for distribution functionality
    console.log('Distribute components not yet implemented:', direction);
  },

  // Action Flow Execution
  executeComponentFlow: async (componentId: string, trigger: string) => {
    const { currentProject, currentPage } = get();
    if (!currentProject || !currentPage) return;

    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return;

    // Find the component and its action flows
    const findComponent = (components: AppComponent[]): AppComponent | null => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };

    const component = findComponent(pageData.components);
    if (!component?.actionFlows?.[trigger]) {
      console.log(`No action flow found for component ${componentId} trigger ${trigger}`);
      return;
    }

    const flow = component.actionFlows[trigger];
    
    try {
      // Import toast for notifications
      const { toast } = await import('sonner');
      
      // Find start node and execute the flow
      const startNode = flow.nodes?.find((node: any) => node.data.isStart);
      if (!startNode) {
        console.error('No start node found in flow');
        toast.error('No start node found in flow');
        return;
      }

      console.log(`Executing flow for component ${componentId}, trigger: ${trigger}`);
      
      // Execute the flow nodes sequentially
      await executeFlowNode(startNode.id, flow.nodes, flow.edges, {});
      
    } catch (error) {
      console.error('Error executing component flow:', error);
      const { toast } = await import('sonner');
      toast.error('Flow execution failed: ' + (error as Error).message);
    }
  }

}));

// Helper function to execute flow nodes
async function executeFlowNode(nodeId: string, nodes: any[], edges: any[], context: any): Promise<void> {
  const { toast } = await import('sonner');
  
  const node = nodes.find((n: any) => n.id === nodeId);
  if (!node) return;
  
  // Skip start node, find its connected nodes
  if (node.data.isStart) {
    const outgoingEdges = edges.filter((edge: any) => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      await executeFlowNode(edge.target, nodes, edges, context);
    }
    return;
  }

  const { type, config } = node.data;

  try {
    // Execute the node action
    switch (type) {
      case 'navigate':
      case 'openUrl':
      case 'redirect':
        if (config.url) {
          if (config.target === '_blank') {
            window.open(config.url, '_blank');
          } else {
            window.location.href = config.url;
          }
        }
        break;

      case 'navigateToPage':
        if (config.pageId) {
          console.log('Navigating to page:', config.pageId);
          toast.info(`Navigating to page: ${config.pageId}`);
        }
        break;

      case 'showAlert':
        if (config.message) {
          toast[config.type || 'info'](config.message);
        }
        break;

      case 'apiCall':
        if (config.url) {
          try {
            const response = await fetch(config.url, {
              method: config.method || 'GET',
              headers: config.headers || {},
              body: config.method !== 'GET' ? JSON.stringify(config.body || {}) : undefined,
            });
            const data = await response.json();
            context.apiResponse = data;
            toast.success('API call successful');
          } catch (error) {
            console.error('API call failed:', error);
            toast.error('API call failed');
          }
        }
        break;

      case 'delay':
        await new Promise(resolve => setTimeout(resolve, config.duration || 1000));
        break;

      case 'setVariable': {
        const { scope = 'app', variableName, operation = 'set', value } = config;
        // Import dynamically to avoid circular dependencies
        const { useVariableStore } = await import('@/stores/variableStore');
        const variableStore = useVariableStore.getState();
        
        if (variableName) {
          // Parse value for booleans if string
          let parsedValue = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          
          switch (operation) {
            case 'set':
              variableStore.setVariable(scope, variableName, parsedValue);
              console.log(`Set ${scope}.${variableName} = ${parsedValue}`);
              break;
            case 'increment':
              variableStore.incrementVariable(scope, variableName, Number(value) || 1);
              console.log(`Incremented ${scope}.${variableName} by ${value || 1}`);
              break;
            case 'decrement':
              variableStore.decrementVariable(scope, variableName, Number(value) || 1);
              console.log(`Decremented ${scope}.${variableName} by ${value || 1}`);
              break;
            case 'toggle':
              variableStore.toggleVariable(scope, variableName);
              console.log(`Toggled ${scope}.${variableName}`);
              break;
            case 'append':
              variableStore.appendToVariable(scope, variableName, value);
              console.log(`Appended to ${scope}.${variableName}:`, value);
              break;
            case 'remove':
              variableStore.removeFromVariable(scope, variableName, Number(value) || 0);
              console.log(`Removed index ${value} from ${scope}.${variableName}`);
              break;
          }
        }
        break;
      }

      case 'executeCode':
        if (config.code) {
          try {
            const func = new Function('context', config.code);
            func(context);
            console.log('Code executed successfully');
          } catch (error) {
            console.error('Code execution failed:', error);
            toast.error('Code execution failed');
          }
        }
        break;

      case 'condition':
        // Handle conditional branching
        const conditionResult = evaluateCondition(config, context);
        const conditionEdges = edges.filter((edge: any) => edge.source === nodeId);
        
        for (const edge of conditionEdges) {
          if ((conditionResult && edge.sourceHandle === 'true') || (!conditionResult && edge.sourceHandle === 'false')) {
            await executeFlowNode(edge.target, nodes, edges, context);
          }
        }
        return; // Don't continue to default execution

      case 'sendEmail':
        console.log('Sending email:', config.to, config.subject);
        toast.info(`Email sent to ${config.to}`);
        break;

      case 'webhook':
        if (config.webhookUrl) {
          try {
            await fetch(config.webhookUrl, {
              method: config.method || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(config.payload || {}),
            });
            toast.success('Webhook triggered successfully');
          } catch (error) {
            console.error('Webhook failed:', error);
            toast.error('Webhook failed');
          }
        }
        break;

      default:
        console.log('Unsupported node type:', type);
        break;
    }

    // Continue to next nodes (for non-conditional nodes)
    if (type !== 'condition') {
      const outgoingEdges = edges.filter((edge: any) => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        await executeFlowNode(edge.target, nodes, edges, context);
      }
    }
  } catch (error) {
    console.error(`Error executing flow node ${nodeId}:`, error);
    toast.error(`Flow execution failed at ${node.data.label}: ${(error as Error).message}`);
  }
}

function evaluateCondition(config: any, context: any): boolean {
  const { leftValue, operator, rightValue } = config;
  
  const left = String(leftValue || '').trim();
  const right = String(rightValue || '').trim();
  
  switch (operator) {
    case 'equals': return left === right;
    case 'notEquals': return left !== right;
    case 'greaterThan': return parseFloat(left) > parseFloat(right);
    case 'lessThan': return parseFloat(left) < parseFloat(right);
    case 'greaterOrEqual': return parseFloat(left) >= parseFloat(right);
    case 'lessOrEqual': return parseFloat(left) <= parseFloat(right);
    case 'contains': return left.includes(right);
    case 'startsWith': return left.startsWith(right);
    case 'endsWith': return left.endsWith(right);
    case 'isEmpty': return left === '';
    case 'isNotEmpty': return left !== '';
    default: return false;
  }
}
