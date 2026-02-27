import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAIAppBuildStream } from '@/hooks/useAIAppBuildStream';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AppBuilderCanvas } from '@/components/app-builder/AppBuilderCanvas';
import { AppBuilderSidebar } from '@/components/app-builder/AppBuilderSidebar';
import { AppBuilderHeader } from '@/components/app-builder/AppBuilderHeader';
import { DockedToolbar } from '@/components/app-builder/DockedToolbar';
import { ComponentPropertiesPanel } from '@/components/app-builder/ComponentPropertiesPanel';
import { PageManager } from '@/components/app-builder/PageManager';
import { PageSettingsPanel } from '@/components/app-builder/PageSettingsPanel';
import { DragPreviewOverlay } from '@/components/app-builder/DragPreviewOverlay';
import { CommentsPanel } from '@/components/app-builder/comments/CommentsPanel';

import { VariablesView } from '@/components/app-builder/VariablesView';
import { VariablesPanel } from '@/components/app-builder/panels/VariablesPanel';
import { DesignPanel } from '@/components/app-builder/panels/DesignPanel';
import { ImportPanel } from '@/components/app-builder/panels/ImportPanel';
import { SaveAsComponentDialog } from '@/components/app-builder/SaveAsComponentDialog';
import { ComponentEditingBanner } from '@/components/app-builder/ComponentEditingBanner';
// Removed FullscreenPreview - using in-canvas preview instead
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { useAuth } from '@/hooks/useAuth';
import { useTab } from '@/contexts/TabContext';
import { useAppBuilderAutosave } from '@/hooks/useAppBuilderAutosave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { DragItem, AppComponent } from '@/types/appBuilder';
import { AIComponentProvider } from '@/components/app-builder/AIComponentFramework';
import { BreakpointProvider } from '@/contexts/BreakpointContext';
import { GripVertical } from 'lucide-react';
import { workspaceService } from '@/services/workspaceService';
import { toast } from 'sonner';
import { MultiSelectIndicator } from '@/components/app-builder/MultiSelectIndicator';
import { AIWallCanvasOverlay } from '@/components/ai-wall/AIWallCanvasOverlay';
import { useAISidebarStore } from '@/stores/aiSidebarStore';

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 380;

export default function AppBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { openTab } = useTab();
  const lastOpenedTabProjectIdRef = useRef<string | null>(null);
  const autoBuildProcessedRef = useRef(false);
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [sidebarTab, setSidebarTab] = useState('components');
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(MIN_SIDEBAR_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  // AI Build stream for auto-build functionality
  const { startBuild, isBuilding } = useAIAppBuildStream();
  const { activeTab: aiSidebarTab } = useAISidebarStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );
  
  const { isEditingMode, editingDefinition } = useUserComponentStore();
  
  const {
    selectedComponent, 
    selectedComponents,
    showComponentsPalette, 
    showPropertiesPanel,
    showPageManager,
    showVariablesPanel,
    showDesignPanel,
    showImportPanel,
    showPageSettingsPanel,
    pageSettingsPageId,
    setPageSettingsPanel,
    currentProject,
    currentPage,
    mode,
    addComponent,
    moveComponent,
    loadProject,
    saveProject,
    canUndo,
    canRedo,
    undoAction,
    redoAction,
    copySelectedComponents,
    cutSelectedComponents,
    pasteComponents,
    deleteSelectedComponents,
    duplicateSelectedComponents,
    groupSelectedComponents,
    ungroupSelectedComponents,
    alignComponents,
    distributeComponents,
    clearSelection,
    selectAllComponents,
    setHistoryHandlers,
    selectComponent,
    aiContextComponent,
    showCommentsPanel,
    setShowCommentsPanel,
    isHeaderDocked,
  } = useAppBuilderStore();

  // Auto-switch to AI tab when AI context is set
  useEffect(() => {
    if (aiContextComponent && sidebarTab !== 'ai') {
      setSidebarTab('ai');
    }
  }, [aiContextComponent]);

  // Resize handlers for sidebars
  const handleMouseMoveLeft = useCallback((e: MouseEvent) => {
    const newWidth = Math.min(Math.max(e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    setLeftSidebarWidth(newWidth);
  }, []);

  const handleMouseMoveRight = useCallback((e: MouseEvent) => {
    const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    setRightSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  useEffect(() => {
    if (isResizingLeft) {
      document.addEventListener('mousemove', handleMouseMoveLeft);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else if (isResizingRight) {
      document.addEventListener('mousemove', handleMouseMoveRight);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveLeft);
      document.removeEventListener('mousemove', handleMouseMoveRight);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight, handleMouseMoveLeft, handleMouseMoveRight, handleMouseUp]);

  // Initialize editor history
  const editorHistory = useEditorHistory(50);

  // Connect history to store
  useEffect(() => {
    const handleUndo = () => {
      console.log('Undo triggered, canUndo:', editorHistory.canUndo);
      const historyState = editorHistory.undo();
      console.log('History state from undo:', historyState);
      if (historyState && currentProject && currentPage) {
        console.log('Restoring components:', historyState.components);
        // Find the current page and update its components
        const updatedProject = {
          ...currentProject,
          pages: currentProject.pages.map(page => 
            page.id === currentPage 
              ? { ...page, components: historyState.components }
              : page
          )
        };
        // Update the project in the store (this will trigger a re-render)
        useAppBuilderStore.setState({ currentProject: updatedProject });
        
        // Restore selection
        if (historyState.selectedComponent) {
          selectComponent(historyState.selectedComponent);
        }
      }
    };

    const handleRedo = () => {
      const historyState = editorHistory.redo();
      if (historyState && currentProject && currentPage) {
        // Find the current page and update its components
        const updatedProject = {
          ...currentProject,
          pages: currentProject.pages.map(page => 
            page.id === currentPage 
              ? { ...page, components: historyState.components }
              : page
          )
        };
        // Update the project in the store (this will trigger a re-render)
        useAppBuilderStore.setState({ currentProject: updatedProject });
        
        // Restore selection
        if (historyState.selectedComponent) {
          selectComponent(historyState.selectedComponent);
        }
      }
    };

    setHistoryHandlers({
      undo: handleUndo,
      redo: handleRedo,
      canUndo: () => editorHistory.canUndo,
      canRedo: () => editorHistory.canRedo,
    });
  }, [editorHistory.canUndo, editorHistory.canRedo, currentProject, currentPage]);

  // Save state to history when components change (with debouncing to prevent excessive saves)
  useEffect(() => {
    if (currentProject && currentPage) {
      const pageData = currentProject.pages.find(p => p.id === currentPage);
      if (pageData?.components) {
        // Use a timeout to debounce saves and prevent immediate saves after undo/redo
        const timeoutId = setTimeout(() => {
          console.log('Saving state to history, components:', pageData.components);
          editorHistory.saveState(pageData.components, selectedComponent);
          console.log('History length after save:', editorHistory.getHistoryLength());
        }, 100); // 100ms debounce
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentProject?.pages, currentPage, selectedComponent]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undoAction,
    onRedo: redoAction,
    onCopy: copySelectedComponents,
    onCut: cutSelectedComponents,
    onPaste: () => pasteComponents(),
    onDelete: deleteSelectedComponents,
    onSave: saveProject,
    onSelectAll: selectAllComponents,
    onGroup: groupSelectedComponents,
    onUngroup: ungroupSelectedComponents,
    onDuplicate: duplicateSelectedComponents,
    onEscape: clearSelection,
  });

  // Initialize autosave
  const { isAutosaving, lastSavedTime } = useAppBuilderAutosave({
    project: currentProject,
    onSaving: () => console.log('App project autosaving...'),
    onSaved: () => console.log('App project autosaved successfully'),
    onError: (error) => console.error('App project autosave error:', error)
  });

  useEffect(() => {
    if (id && user) {
      loadProject(id).catch(error => {
        console.error('Failed to load project:', error);
      });
    }
  }, [id, user, loadProject]);

  // Open tab once per route-id (prevents repeated calls during autosave/history updates)
  useEffect(() => {
    let cancelled = false;

    const validateAndOpenTab = async () => {
      if (!id || !currentProject?.id) return;

      // Critical: avoid ping-pong when route changes but the store still holds the previous project.
      if (currentProject.id !== id) return;

      // Avoid re-opening the same tab on every project object mutation (autosave/history updates).
      if (lastOpenedTabProjectIdRef.current === currentProject.id) return;

      // Mark as opened early to prevent multiple concurrent validations from racing.
      lastOpenedTabProjectIdRef.current = currentProject.id;

      // Check if project belongs to current workspace
      const currentWorkspace = await workspaceService.getCurrentWorkspace();
      if (cancelled) return;

      // Fail-safe: if project has workspace_id but we can't determine current workspace, deny access
      if (currentProject.workspace_id) {
        if (!currentWorkspace?.id) {
          console.warn('Cannot validate workspace access - current workspace not determined');
          toast.error('Access denied', {
            description: 'Unable to verify workspace access',
          });
          navigate('/');
          return;
        }
        if (currentProject.workspace_id !== currentWorkspace.id) {
          console.warn('App project does not belong to current workspace, redirecting to dashboard');
          toast.error('Access denied', {
            description: 'This app belongs to a different workspace',
          });
          navigate('/');
          return;
        }
      }

      await openTab({
        id: `app-${currentProject.id}`,
        type: 'app',
        name: currentProject.name,
        url: `/apps/${currentProject.id}`,
        projectId: currentProject.id,
        workspaceId: currentProject.workspace_id || undefined,
      });
    };

    validateAndOpenTab();
    return () => {
      cancelled = true;
    };
  }, [id, currentProject?.id, currentProject?.name, currentProject?.workspace_id, openTab, navigate]);

  // Track whether classes have been loaded for reliable initial render
  const [classesLoaded, setClassesLoaded] = useState(false);
  
  // Load classes and design system when project changes - await completion before rendering
  useEffect(() => {
    const loadClassesAsync = async () => {
      if (currentProject?.id) {
        setClassesLoaded(false);
        const { loadClasses } = useClassStore.getState();
        const { loadDesignSystem } = useDesignSystemStore.getState();
        const { loadProjectTokens } = useDesignTokenStore.getState();
        await Promise.all([
          loadClasses(currentProject.id),
          loadDesignSystem(currentProject.id),
          loadProjectTokens(currentProject.id),
        ]);
        setClassesLoaded(true);
      }
    };
    loadClassesAsync();
  }, [currentProject?.id]);

  // Auto-build detection: trigger AI build when navigated with autoBuild query param
  useEffect(() => {
    const autoBuildPrompt = searchParams.get('autoBuild');
    
    // Only trigger if:
    // 1. We have an autoBuild prompt
    // 2. Project is loaded
    // 3. Classes are loaded (canvas is ready)
    // 4. Not already building
    // 5. Haven't already processed this autoBuild
    if (
      autoBuildPrompt && 
      currentProject?.id && 
      classesLoaded && 
      !isBuilding && 
      !autoBuildProcessedRef.current
    ) {
      autoBuildProcessedRef.current = true;
      
      // Clear the query param to prevent re-triggering on refresh
      setSearchParams({}, { replace: true });
      
      // Start the AI build with the original prompt
      console.log('[AutoBuild] Triggering AI build from Dashboard/Search prompt:', autoBuildPrompt);
      startBuild(decodeURIComponent(autoBuildPrompt), { forceRebuild: true });
    }
  }, [searchParams, currentProject?.id, classesLoaded, isBuilding, startBuild, setSearchParams]);

  // Reset autoBuild ref when project ID changes (new project loaded)
  useEffect(() => {
    autoBuildProcessedRef.current = false;
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load your project</div>
        </div>
      </div>
    );
  }

  // Show auth required state
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Authentication Required</div>
          <div className="text-sm text-muted-foreground">Please log in to access the app builder</div>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log('Drag started:', active.data.current);
    setActiveDragItem(active.data.current as DragItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { active: active.data.current, over: over?.data.current });
    
    if (!over) {
      console.log('No drop target found');
      setActiveDragItem(null);
      return;
    }

    const dragData = active.data.current as DragItem;
    const dropData = over.data.current;

    if (!dragData || !dropData) {
      console.log('Missing drag or drop data:', { dragData, dropData });
      setActiveDragItem(null);
      return;
    }

    // Check if the drop is valid
    // NOTE: For prebuilt/template drags, the dnd "type" is a meta type (e.g. "prebuilt-component").
    // We need the *actual* component type for validation.
    const draggedType = 
      dragData.data?.type ||             // From component palette: { data: { type: 'button' } }
      dragData.data?.component?.type ||  // From prebuilt/canvas drag: { data: { component: { type: 'button' } } }
      dragData.type;                     // Fallback
    const acceptedTypes = dropData.accepts || [];
    
    if (draggedType && acceptedTypes.length > 0 && !acceptedTypes.includes(draggedType)) {
      console.log('Invalid drop: ', draggedType, 'not accepted by', acceptedTypes);
      setActiveDragItem(null);
      return;
    }

    // Handle component movement (from canvas or layers)
    if (dragData.data?.id && (dragData.data?.source || dragData.data?.type === 'layer')) {
      const componentId = dragData.data.id;

      // Special-case: dropping onto an accordion/tab *item* should actually place the element
      // inside that item's content container.
      const resolveDropParentId = (parentId: string | null | undefined): string | null => {
        if (!parentId || parentId === 'root') return null;

        // Find the drop target component in the current editing tree
        const findComponent = (components: AppComponent[], id: string): AppComponent | null => {
          for (const comp of components) {
            if (comp.id === id) return comp;
            if (Array.isArray(comp.children) && comp.children.length > 0) {
              const found = findComponent(comp.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const roots: AppComponent[] = (() => {
          if (isEditingMode && editingDefinition) return [editingDefinition];
          if (!currentProject || !currentPage) return [];
          const pageData = currentProject.pages.find(p => p.id === currentPage);
          return (pageData?.components || []) as AppComponent[];
        })();

        const target = findComponent(roots, parentId);
        if (!target) return parentId;

        if (target.type === 'accordion-item') {
          const content = target.children?.find(c => c.type === 'accordion-content');
          return content?.id || parentId;
        }

        if (target.type === 'tab-item') {
          const content = target.children?.find(c => c.type === 'tab-content');
          return content?.id || parentId;
        }

        return parentId;
      };

      const newParentId = resolveDropParentId(dropData.parentId);
      const newIndex = dropData.index;
      
      // Prevent dropping component on itself or its children
      if (newParentId === componentId || (newParentId && isChildOf(componentId, newParentId))) {
        setActiveDragItem(null);
        return;
      }
      
      moveComponent(componentId, newParentId, newIndex);
    }
    // Handle new component addition (from palette)
    else if (dragData.data && !dragData.data.id) {
      // For prebuilt/template components we must ensure IDs are unique.
      // The store will generate IDs when `id` is missing, so we strip any existing IDs recursively.
      const stripIds = (comp: any): any => ({
        ...comp,
        id: undefined,
        children: Array.isArray(comp.children) ? comp.children.map(stripIds) : comp.children,
      });

      // Same accordion/tab forwarding for new components
      const resolveDropParentId = (parentId: string | null | undefined): string | null => {
        if (!parentId || parentId === 'root') return null;

        const findComponent = (components: AppComponent[], id: string): AppComponent | null => {
          for (const comp of components) {
            if (comp.id === id) return comp;
            if (Array.isArray(comp.children) && comp.children.length > 0) {
              const found = findComponent(comp.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const roots: AppComponent[] = (() => {
          if (isEditingMode && editingDefinition) return [editingDefinition];
          if (!currentProject || !currentPage) return [];
          const pageData = currentProject.pages.find(p => p.id === currentPage);
          return (pageData?.components || []) as AppComponent[];
        })();

        const target = findComponent(roots, parentId);
        if (!target) return parentId;

        if (target.type === 'accordion-item') {
          const content = target.children?.find(c => c.type === 'accordion-content');
          return content?.id || parentId;
        }

        if (target.type === 'tab-item') {
          const content = target.children?.find(c => c.type === 'tab-content');
          return content?.id || parentId;
        }

        return parentId;
      };

      const effectiveParentId = resolveDropParentId(dropData.parentId);

      if (dragData.data.prebuiltId && dragData.data.component) {
        // Adding prebuilt component
        addComponent(stripIds(dragData.data.component), effectiveParentId, dropData.index);
      } else if (dragData.data.template) {
        // Adding template component
        addComponent(stripIds(dragData.data.template), effectiveParentId, dropData.index);
      } else {
        // Adding new component - create proper AppComponent structure
        const newComponent = {
          type: dragData.data.type,
          props: {},
          style: {}
        } as Omit<AppComponent, 'id'>;
        addComponent(newComponent as AppComponent, effectiveParentId, dropData.index);
      }
    }

    setActiveDragItem(null);
  };

  // Helper function to check if target is a child of source
  const isChildOf = (sourceId: string, targetId: string): boolean => {
    if (!currentProject || !currentPage) return false;
    
    const pageData = currentProject.pages.find(p => p.id === currentPage);
    if (!pageData) return false;
    
    const findComponent = (components: any[], id: string): any => {
      for (const comp of components) {
        if (comp.id === id) return comp;
        if (comp.children) {
          const found = findComponent(comp.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const checkChildren = (component: any): boolean => {
      if (!component.children) return false;
      for (const child of component.children) {
        if (child.id === targetId) return true;
        if (checkChildren(child)) return true;
      }
      return false;
    };
    
    const sourceComponent = findComponent(pageData.components, sourceId);
    return sourceComponent ? checkChildren(sourceComponent) : false;
  };

  return (
    <BreakpointProvider>
    <AIComponentProvider>
      <div className="h-full w-full flex flex-col bg-background overflow-hidden" style={{ maxWidth: '100vw' }}>
        {/* Header - hidden when docked */}
        {!isHeaderDocked && (
          <AppBuilderHeader 
            projectId={id} 
            isAutosaving={isAutosaving} 
            lastSavedTime={lastSavedTime} 
          />
        )}
        
        {/* Preview Mode Indicator Bar */}
        {mode === 'preview' && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Preview Mode</span>
            <span className="text-xs text-muted-foreground">— Showing live data. Click "Design" to edit.</span>
          </div>
        )}
        
        {/* Component Editing Banner */}
        {mode !== 'preview' && id && <ComponentEditingBanner projectId={id} />}
        
        <div className={`flex-1 flex overflow-hidden min-w-0 w-full ${mode !== 'variables' ? 'bg-stone-50 dark:bg-stone-900' : ''}`}>
          {mode === 'variables' ? (
            <div className="w-full h-full">
              <VariablesView />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="h-full flex overflow-hidden min-w-0 w-full">
                {/* Left Sidebar */}
                {showComponentsPalette && aiSidebarTab !== 'wall' && (
                  <div 
                    className={`h-full flex-shrink-0 border-r border-border bg-card shadow-sm overflow-y-auto overflow-x-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: leftSidebarWidth }}
                  >
                    {/* Disabled overlay for preview mode */}
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    <AppBuilderSidebar 
                      activeTab={sidebarTab} 
                      onTabChange={setSidebarTab}
                    />
                    {/* Resize handle */}
                    {mode !== 'preview' && (
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors group z-10"
                        onMouseDown={() => setIsResizingLeft(true)}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Variables Panel - Left side panel */}
                {showVariablesPanel && (
                  <div 
                    className={`h-full flex-shrink-0 border-r border-border bg-card shadow-sm overflow-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: 320 }}
                  >
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    <div className="h-full flex flex-col">
                      <div className="p-3 border-b border-border flex items-center gap-2">
                        <span className="text-sm font-semibold">Variables</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <VariablesPanel />
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Settings Panel - Left side panel */}
                {showPageSettingsPanel && pageSettingsPageId && (
                  <div 
                    className={`h-full flex-shrink-0 border-r border-border bg-card shadow-sm overflow-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: 320 }}
                  >
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    <div className="h-full flex flex-col">
                      <div className="p-3 border-b border-border flex items-center justify-between">
                        <span className="text-sm font-semibold">Page Settings</span>
                        <button 
                          onClick={() => setPageSettingsPanel(null)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <PageSettingsPanel pageId={pageSettingsPageId} onClose={() => setPageSettingsPanel(null)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Design Panel - Left side panel */}
                {showDesignPanel && (
                  <div 
                    className={`h-full flex-shrink-0 border-r border-border bg-card shadow-sm overflow-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: 280 }}
                  >
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    <DesignPanel />
                  </div>
                )}

                {/* Import Panel - Left side panel */}
                {showImportPanel && (
                  <div 
                    className={`h-full flex-shrink-0 border-r border-border bg-card shadow-sm overflow-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: 280 }}
                  >
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    <ImportPanel />
                  </div>
                )}



                {/* Main Canvas Area - Flexible with own scrolling */}
                <div className="flex-1 h-full overflow-hidden min-w-0 max-w-full relative">
                  {/* Docked Toolbar - floating on canvas */}
                  {isHeaderDocked && <DockedToolbar projectId={id} />}
                  {classesLoaded ? (
                    <AppBuilderCanvas />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center">
                        <div className="animate-pulse w-8 h-8 rounded-full bg-muted mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">Loading styles...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Wall Canvas Overlay */}
                  {aiSidebarTab === 'wall' && <AIWallCanvasOverlay />}
                </div>

                {/* Right Sidebar - Respects showPropertiesPanel toggle, hidden during AI Wall */}
                {showPropertiesPanel && aiSidebarTab !== 'wall' && (
                  <div 
                    className={`h-full flex-shrink-0 border-l border-border bg-card shadow-sm overflow-hidden relative ${mode === 'preview' ? 'opacity-50' : ''}`}
                    style={{ width: rightSidebarWidth }}
                  >
                    {/* Disabled overlay for preview mode */}
                    {mode === 'preview' && (
                      <div className="absolute inset-0 bg-background/50 z-20 cursor-not-allowed" />
                    )}
                    {/* Resize handle */}
                    {mode !== 'preview' && (
                      <div 
                        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors group z-10"
                        onMouseDown={() => setIsResizingRight(true)}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <ComponentPropertiesPanel />
                  </div>
                )}

                {/* Comments Panel - Right side */}
                {showCommentsPanel && currentProject && currentPage && (
                  <CommentsPanel
                    appProjectId={currentProject.id}
                    pageId={currentPage}
                    workspaceId={currentProject.workspace_id || undefined}
                    isOpen={showCommentsPanel}
                    onClose={() => setShowCommentsPanel(false)}
                  />
                )}
              </div>

              <DragPreviewOverlay activeDragItem={activeDragItem} />
            </DndContext>
          )}
        </div>

        {/* Multi-Select Indicator */}
        <MultiSelectIndicator />


        {/* Save as Component Dialog */}
        <SaveAsComponentDialog />

        {/* In-canvas preview is used instead of fullscreen overlay */}

      </div>
    </AIComponentProvider>
    </BreakpointProvider>
  );
}
