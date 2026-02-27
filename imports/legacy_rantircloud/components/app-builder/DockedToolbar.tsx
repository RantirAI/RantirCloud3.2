import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  Code,
  Layout,
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
  PanelTopClose,
  X,
} from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAISidebarStore } from '@/stores/aiSidebarStore';
import { DatabaseSelector } from './DatabaseSelector';
import { GitHubSelector } from './GitHubSelector';
import { SupabaseSelector } from './SupabaseSelector';
import { FlowSelector } from './FlowSelector';
import { PublishDropdown } from './PublishDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DockedToolbarProps {
  projectId?: string;
}

export function DockedToolbar({ projectId }: DockedToolbarProps) {
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
    viewport,
    setViewport,
    customCanvasWidth,
    setCustomCanvasWidth,
    showGrid,
    toggleGrid,
    zoom,
    setZoom,
    showCommentsPanel,
    toggleCommentsPanel,
    unresolvedCommentsCount,
    toggleHeaderDocked,
    setCurrentPage,
  } = useAppBuilderStore();

  const { activeTab: aiSidebarTab, setActiveTab: setAISidebarTab } = useAISidebarStore();
  const isAIWallActive = aiSidebarTab === 'wall';

  const areSidebarsVisible = showComponentsPalette || showPropertiesPanel;

  const toggleAllSidebars = () => {
    setSidebarsVisible(!areSidebarsVisible);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
  const handleResetZoom = () => setZoom(1);

  const currentPageData = currentProject?.pages.find(p => p.id === currentPage);

  return (
    <TooltipProvider>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 bg-background border border-border rounded-xl shadow-lg px-2 py-1">
          {/* Project icon */}
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentProject?.settings?.favicon ? (
              <img
                src={currentProject.settings.favicon}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 text-primary-foreground" />
            )}
          </div>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Pages Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium gap-1"
              >
                <Home className="h-3 w-3" />
                <span className="max-w-[60px] truncate">{currentPageData?.name || 'Home'}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {currentProject?.pages.map((page) => (
                <DropdownMenuItem
                  key={page.id}
                  onClick={() => setCurrentPage(page.id)}
                  className={`flex items-center gap-2 ${page.id === currentPage ? 'bg-muted' : ''}`}
                >
                  <Home className="h-3 w-3 opacity-60" />
                  <span className="flex-1 truncate">{page.name}</span>
                  {page.id === currentPage && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Icon buttons: Variables, Import, Design */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showVariablesPanel ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleVariablesPanel}>
                <Variable className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Variables</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showImportPanel ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleImportPanel}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Import</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showDesignPanel ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleDesignPanel}>
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Design</p></TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Viewport Controls */}
          {mode === 'design' && (
            <>
              <Tabs value={customCanvasWidth ? 'custom' : viewport} onValueChange={(v) => {
                if (v !== 'custom') setViewport(v as 'desktop' | 'tablet' | 'mobile');
              }} className="w-auto">
                <TabsList className="bg-muted/50 p-0.5 h-7">
                  <TabsTrigger value="desktop" className="h-6 w-6 p-0" title="Desktop"><Monitor className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="tablet" className="h-6 w-6 p-0" title="Tablet"><Tablet className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="mobile" className="h-6 w-6 p-0" title="Mobile"><Smartphone className="h-3 w-3" /></TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="h-5 w-px bg-border mx-0.5" />

              {/* Zoom controls - compact container */}
              <div className="flex items-center bg-muted/50 rounded-md border border-border/50 h-7">
                <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-6 w-6 p-0 rounded-none rounded-l-md border-0 shadow-none outline-none ring-0" disabled={zoom <= 0.1}>
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-[10px] font-medium tabular-nums min-w-[32px] text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-6 w-6 p-0 rounded-none border-0 shadow-none outline-none ring-0" disabled={zoom >= 2}>
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button variant="ghost" size="sm" onClick={handleResetZoom} className="h-6 w-6 p-0 rounded-none rounded-r-md border-0 shadow-none outline-none ring-0" title="Reset zoom">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* View Mode Toggle */}
          <Tabs value={mode} onValueChange={setMode} className="w-auto">
            <TabsList className="bg-muted/50 p-0.5 h-7">
              <TabsTrigger value="design" className="h-6 w-6 p-0" title="Design"><Layout className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="preview" className="h-6 w-6 p-0" title="Preview"><Eye className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="code" className="h-6 w-6 p-0" title="Code"><Code className="h-3 w-3" /></TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Comments */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showCommentsPanel ? "secondary" : "ghost"} size="sm" onClick={toggleCommentsPanel} className="h-7 w-7 p-0 relative">
                <MessageCircle className="h-3.5 w-3.5" />
                {unresolvedCommentsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-medium">
                    {unresolvedCommentsCount > 9 ? '9+' : unresolvedCommentsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Comments</p></TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Sidebars Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={areSidebarsVisible ? 'secondary' : 'ghost'} size="sm" onClick={toggleAllSidebars} className="h-7 w-7 p-0">
                {areSidebarsVisible ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{areSidebarsVisible ? 'Hide Sidebars' : 'Show Sidebars'}</TooltipContent>
          </Tooltip>

          {/* Undock button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleHeaderDocked} className="h-7 w-7 p-0">
                <PanelTopClose className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand Header</TooltipContent>
          </Tooltip>

          {/* Connection Selectors - tight group */}
          <div className="flex items-center gap-0.5">
            <DatabaseSelector />
            <SupabaseSelector />
            <FlowSelector />
            <GitHubSelector />
          </div>

          <div className="h-5 w-px bg-border mx-0.5" />

          {/* Back to Builder when AI Wall active */}
          {isAIWallActive && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAISidebarTab('chat')}>
              <X className="h-3 w-3" />
              Back
            </Button>
          )}

          {/* Publish */}
          <PublishDropdown projectId={projectId} projectName={currentProject?.name} />
        </div>
      </div>
    </TooltipProvider>
  );
}
