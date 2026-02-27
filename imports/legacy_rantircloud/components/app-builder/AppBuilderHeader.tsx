import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  Code, 
  Layout,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  ImageIcon,
  ChevronDown,
  Plus,
  Home,
  Variable,
  Download,
  Palette,
  MessageCircle,
  Settings2,
  X,
  PanelTopOpen,
} from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAISidebarStore } from '@/stores/aiSidebarStore';
import { DatabaseSelector } from './DatabaseSelector';
import { GitHubSelector } from './GitHubSelector';
import { SupabaseSelector } from './SupabaseSelector';
import { FlowSelector } from './FlowSelector';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { PublishDropdown } from './PublishDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Settings } from 'lucide-react';

interface AppBuilderHeaderProps {
  projectId?: string;
  isAutosaving?: boolean;
  lastSavedTime?: Date | null;
}

export function AppBuilderHeader({ projectId, isAutosaving, lastSavedTime }: AppBuilderHeaderProps) {
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [renamePageValue, setRenamePageValue] = useState('');
  const { 
    currentProject,
    currentPage,
    mode,
    setMode,
    toggleComponentsPalette,
    togglePropertiesPanel,
    setSidebarsVisible,
    showComponentsPalette,
    showPropertiesPanel,
    showVariablesPanel,
    showDesignPanel,
    showImportPanel,
    toggleVariablesPanel,
    toggleDesignPanel,
    toggleImportPanel,
    saveProject,
    updateProject,
    viewport,
    setViewport,
    customCanvasWidth,
    setCustomCanvasWidth,
    showGrid,
    toggleGrid,
    zoom,
    setZoom,
    canUndo,
    canRedo,
    undoAction,
    redoAction,
    setCurrentPage,
    addPage,
    updatePage,
    isCommentMode,
    toggleCommentMode,
    showCommentsPanel,
    toggleCommentsPanel,
    unresolvedCommentsCount,
    toggleHeaderDocked,
    editorMode,
    setEditorMode,
  } = useAppBuilderStore();

  const { activeTab: aiSidebarTab, setActiveTab: setAISidebarTab } = useAISidebarStore();
  const isAIWallActive = aiSidebarTab === 'wall';

  // Combined sidebars toggle
  const areSidebarsVisible = showComponentsPalette || showPropertiesPanel;
  
  const toggleAllSidebars = () => {
    setSidebarsVisible(!areSidebarsVisible);
  };

  const handleSave = async () => {
    if (currentProject) {
      await saveProject();
    }
  };

  const handleTitleEdit = () => {
    setTempTitle(currentProject?.name || '');
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (currentProject && tempTitle.trim()) {
      try {
        await updateProject(currentProject.id, { name: tempTitle.trim() });
        setIsEditingTitle(false);
      } catch (error) {
        console.error('Failed to update project name:', error);
      }
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setTempTitle('');
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.1, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleAddPage = () => {
    setNewPageName(`Page ${(currentProject?.pages.length || 0) + 1}`);
    setShowAddPageDialog(true);
  };

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    
    const route = `/${newPageName.toLowerCase().replace(/\s+/g, '-')}`;
    
    addPage({
      name: newPageName.trim(),
      route,
      components: [],
      layout: { type: 'free', config: {} },
      settings: {
        title: newPageName.trim(),
        description: ''
      }
    });
    
    setShowAddPageDialog(false);
    setNewPageName('');
  };

  const currentPageData = currentProject?.pages.find(p => p.id === currentPage);

  return (
    <TooltipProvider>
      <header className="h-12 border-b border-border bg-background px-4 flex items-center justify-between flex-shrink-0 min-w-0 overflow-hidden w-full">
        {/* Left: Project info, pages, tools */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink">
          {/* Favicon / Project Settings button */}
          <button 
            onClick={() => setShowProjectSettings(true)}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden flex-shrink-0"
            title="Project Settings"
          >
            {currentProject?.settings?.favicon ? (
              <img 
                src={currentProject.settings.favicon} 
                alt="Project favicon" 
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-primary-foreground" />
            )}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') handleTitleCancel();
                    }}
                    className="h-6 text-sm font-semibold bg-transparent border-none p-0 focus:ring-0 focus:border-b focus:border-primary"
                    autoFocus
                  />
                </div>
              ) : (
                <h4 
                  className="font-semibold text-base cursor-pointer hover:text-primary transition-colors max-w-[160px] truncate"
                  onClick={handleTitleEdit}
                  title={currentProject?.name || 'Untitled App'}
                >
                  {currentProject?.name || 'Untitled App'}
                </h4>
              )}
              
              {/* Pages Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium bg-background border-border hover:bg-muted gap-2"
                  >
                    <Home className="h-3 w-3" />
                    <span>{currentPageData?.name || 'Home'}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pages</div>
                  {currentProject?.pages.map((page) => (
                    <DropdownMenuItem
                      key={page.id}
                      onClick={() => { setCurrentPage(page.id); setEditorMode('single'); }}
                      className={`group flex items-center gap-2 px-3 py-2 ${
                        page.id === currentPage ? 'bg-muted' : ''
                      }`}
                    >
                      <Home className="h-3.5 w-3.5 opacity-60" />
                      <span className="flex-1">{page.name}</span>
                      {page.id === currentPage && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <button
                        className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-0.5 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamePageId(page.id);
                          setRenamePageValue(page.name);
                        }}
                        title="Rename page"
                      >
                        <Settings className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setEditorMode('multi')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2",
                      editorMode === 'multi' && "bg-muted"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 opacity-60" />
                    <span>View Pages</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleAddPage}
                    className="flex items-center gap-2 px-3 py-2 text-primary hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Page</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Variables Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showVariablesPanel ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={toggleVariablesPanel}
                  >
                    <Variable className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Variables</p>
                </TooltipContent>
              </Tooltip>

              {/* Import Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showImportPanel ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={toggleImportPanel}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import</p>
                </TooltipContent>
              </Tooltip>

              {/* Design Templates Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showDesignPanel ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={toggleDesignPanel}
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Design</p>
                </TooltipContent>
              </Tooltip>

              {isAutosaving && (
                <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
              )}
              {lastSavedTime && !isAutosaving && (
                <span className="text-xs text-muted-foreground">
                  Saved at {lastSavedTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="h-8">
            <TabsList className="h-8">
              <TabsTrigger value="design" className="h-7 px-3 text-xs gap-1.5">
                <Layout className="h-3 w-3" />
                Design
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-3 text-xs gap-1.5">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="h-7 px-3 text-xs gap-1.5">
                <Code className="h-3 w-3" />
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: Viewport, Zoom, Connections, Publish */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Viewport Controls */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden h-7">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none"
                  onClick={() => setViewport('desktop')}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none"
                  onClick={() => setViewport('tablet')}
                >
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tablet</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none"
                  onClick={() => setViewport('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile</TooltipContent>
            </Tooltip>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <button
              className="text-xs font-medium w-12 text-center cursor-pointer hover:text-primary"
              onClick={handleResetZoom}
            >
              {Math.round(zoom * 100)}%
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>

          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={undoAction}
                disabled={!canUndo}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          {/* Comments Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCommentMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 relative"
                onClick={toggleCommentMode}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {unresolvedCommentsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {unresolvedCommentsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Comments</TooltipContent>
          </Tooltip>

          {/* Toggle Sidebars */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSidebars}
                className="h-7 w-7 p-0"
              >
                {areSidebarsVisible ? (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeft className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {areSidebarsVisible ? 'Hide Sidebars' : 'Show Sidebars'}
            </TooltipContent>
          </Tooltip>

          {/* Dock Header Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleHeaderDocked}
                className="h-7 w-7 p-0"
              >
                <PanelTopOpen className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compact Header</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Connection Selectors */}
          <div className="flex items-center gap-0.5">
            <DatabaseSelector />
            <SupabaseSelector />
            <FlowSelector />
            <GitHubSelector />
          </div>

          {/* Publish Dropdown */}
          <PublishDropdown projectId={projectId} projectName={currentProject?.name} />
        </div>
      </header>

      {/* Project Settings Modal */}
      <ProjectSettingsModal 
        open={showProjectSettings} 
        onOpenChange={setShowProjectSettings} 
      />

      {/* Add Page Dialog */}
      <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="page-name" className="text-sm font-medium">
                Page Name
              </label>
              <Input
                id="page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePage();
                  if (e.key === 'Escape') setShowAddPageDialog(false);
                }}
                placeholder="Enter page name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddPageDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePage}
              disabled={!newPageName.trim()}
            >
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Page Dialog */}
      <Dialog open={!!renamePageId} onOpenChange={(open) => { if (!open) setRenamePageId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="rename-page" className="text-sm font-medium">
                Page Name
              </label>
              <Input
                id="rename-page"
                value={renamePageValue}
                onChange={(e) => setRenamePageValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renamePageId && renamePageValue.trim()) {
                    updatePage(renamePageId, { name: renamePageValue.trim() });
                    setRenamePageId(null);
                  }
                  if (e.key === 'Escape') setRenamePageId(null);
                }}
                placeholder="Enter page name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamePageId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamePageId && renamePageValue.trim()) {
                  updatePage(renamePageId, { name: renamePageValue.trim() });
                  setRenamePageId(null);
                }
              }}
              disabled={!renamePageValue.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
}
