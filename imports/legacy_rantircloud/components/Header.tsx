import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, Upload, Pencil, ArrowUp, X, Plus, FileText, Database, Workflow, Layout, Search, Home, HelpCircle, MessageSquare, Globe, LayoutGrid, Code, PanelLeftClose, PanelLeft, Minimize2, Settings, ArrowLeftRight, Building2, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchModal } from '@/components/SearchModal';
import { workspaceService, Workspace } from '@/services/workspaceService';
import { useTab } from '@/contexts/TabContext';
import { supabase } from '@/integrations/supabase/client';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useDashboardLayoutStore } from '@/stores/dashboardLayoutStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspaceSwitcherModal } from '@/components/WorkspaceSwitcherModal';
import { CommunityPluginsModal } from '@/components/CommunityPluginsModal';
import { NewProjectModal, NewProjectType } from '@/components/dashboard/NewProjectModal';
import { databaseService } from '@/services/databaseService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [tempWorkspaceName, setTempWorkspaceName] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCommunityPlugins, setShowCommunityPlugins] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const [topbarBgColor, setTopbarBgColor] = useState('#27272a');
  
  // Listen for topbar color changes
  useEffect(() => {
    const handleTopbarColorChange = (event: CustomEvent<string>) => {
      setTopbarBgColor(event.detail);
    };
    
    // Load initial topbar color from workspace customization
    const loadTopbarColor = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      if (workspace) {
        const { data } = await supabase
          .from('workspace_customization')
          .select('topbar_bg_color')
          .eq('workspace_id', workspace.id)
          .single();
        
        if (data?.topbar_bg_color) {
          const colorMap: Record<string, string> = {
            'default': '#27272a',
            'black': '#09090b',
            'slate': '#334155',
            'dark-blue': '#1e3a5f',
            'blue': '#1e40af',
            'indigo': '#3730a3',
            'purple': '#6b21a8',
            'teal': '#115e59',
            'emerald': '#065f46',
            'rose': '#9f1239',
            'orange': '#9a3412',
          };
          setTopbarBgColor(colorMap[data.topbar_bg_color] || '#27272a');
        }
      }
    };
    
    loadTopbarColor();
    window.addEventListener('topbar-color-change', handleTopbarColorChange as EventListener);
    
    return () => {
      window.removeEventListener('topbar-color-change', handleTopbarColorChange as EventListener);
    };
  }, []);
  
  const { sidebarsVisible, headerVisible, toggleSidebars, toggleHeader, hideAll, showAll } = useDashboardLayoutStore();
  const isDashboardRoute = location.pathname === '/';

  const topbarIconButtonClass =
    "w-7 h-7 flex items-center justify-center cursor-pointer bg-white/5 border border-white/15 rounded hover:bg-white/10 hover:border-white/25 transition-colors topbar-control";

  // Load current workspace and subscribe to changes
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setCurrentWorkspace(workspace);
      setTempWorkspaceName(workspace?.name || '');
      
      
      // Subscribe to workspace changes
      if (workspace) {
        const channel = supabase
          .channel('workspace-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'workspaces',
              filter: `id=eq.${workspace.id}`
            },
            (payload) => {
              const updatedWorkspace = payload.new as Workspace;
              setCurrentWorkspace(updatedWorkspace);
              setTempWorkspaceName(updatedWorkspace.name);
              
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    
    loadWorkspace();
  }, []);

  const { openTabs, closeTab, setActiveTab } = useTab();
  const [searchQuery, setSearchQuery] = useState('');
  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentWorkspace) {
      const iconUrl = await workspaceService.uploadWorkspaceIcon(currentWorkspace.id, file);
      if (iconUrl) {
        const updatedWorkspace = await workspaceService.updateWorkspace(currentWorkspace.id, { icon_url: iconUrl });
        if (updatedWorkspace) {
          setCurrentWorkspace(updatedWorkspace);
        }
      }
    }
  };

  const handleSaveSettings = async () => {
    if (currentWorkspace && tempWorkspaceName.trim()) {
      const updatedWorkspace = await workspaceService.updateWorkspace(currentWorkspace.id, { 
        name: tempWorkspaceName.trim() 
      });
      if (updatedWorkspace) {
        setCurrentWorkspace(updatedWorkspace);
      }
    }
    setShowWorkspaceSettings(false);
  };

  // Tab functions are now handled by useTabManager hook
  const getTabIcon = (type: string) => {
    switch (type) {
      case 'database':
        return Database;
      case 'flow':
        return Workflow;
      case 'logic':
        return Workflow;
      case 'app':
        return LayoutGrid;
      default:
        return FileText;
    }
  };
  const templateLinks = [{
    name: 'Webtir.com',
    url: 'https://webtir.com'
  }, {
    name: 'Contentir.com',
    url: 'https://contentir.com'
  }, {
    name: 'Designtir.com',
    url: 'https://designtir.com'
  }, {
    name: 'Devtir.com',
    url: 'https://devtir.com'
  }, {
    name: 'Mocktir.com',
    url: 'https://mocktir.com'
  }, {
    name: 'Droptir.com',
    url: 'https://droptir.com'
  }, {
    name: 'Writir.com',
    url: 'https://writir.com'
  }, {
    name: 'Talentir.com',
    url: 'https://talentir.com'
  }, {
    name: 'Buildtir.com',
    url: 'https://buildtir.com'
  }, {
    name: 'Flowtir.com',
    url: 'https://flowtir.com'
  }];
  const companyLinks = [{
    name: 'About Rantir',
    url: 'https://www.rantir.com/about'
  }, {
    name: 'Rantir Cloud',
    url: 'https://www.rantir.com/cloud'
  }, {
    name: 'Data & Authentication Software',
    url: 'https://www.rantir.com/data-auth'
  }, {
    name: 'Integrations & Logic Software',
    url: 'https://www.rantir.com/integrations'
  }, {
    name: 'About TIR Templates',
    url: 'https://www.rantir.com/tir-templates'
  }, {
    name: 'Support',
    url: 'https://www.rantir.com/support'
  }, {
    name: 'Documentation',
    url: 'https://www.rantir.com/documentations'
  }, {
    name: 'Careers',
    url: 'https://www.rantir.com/careers'
  }, {
    name: 'Licenses',
    url: 'https://www.rantir.com/licenses'
  }, {
    name: 'Build your Startup',
    url: 'https://www.rantir.com/startup'
  }, {
    name: 'Integration Partners',
    url: 'https://www.rantir.com/partners'
  }, {
    name: 'Partners Program',
    url: 'https://www.rantir.com/partners-program'
  }, {
    name: 'All Access Pass & Pricing',
    url: 'https://www.rantir.com/pricing'
  }];
  // Logo dropdown content - reusable for both normal and minimal states
  const LogoDropdownContent = () => (
    <DropdownMenuContent align="start" className="w-[480px] grid grid-cols-2 gap-0 p-0 z-[2100] bg-zinc-900 border border-zinc-700/50 shadow-lg rounded-lg mt-2">
      {/* File Column */}
      <div className="bg-zinc-900 text-white p-2 border-r border-zinc-700/50">
        <DropdownMenuLabel className="text-xs text-zinc-300 mb-2">Explore</DropdownMenuLabel>
        <div className="space-y-1">
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Home className="h-3 w-3" />
              Dashboard
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Plus className="h-3 w-3" />
              New Project
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => setShowWorkspaceSwitcher(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Switch Workspaces
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Settings className="h-3 w-3" />
              Settings
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://www.rantir.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer"
            >
              <HelpCircle className="h-3 w-3" />
              Support
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://www.rantir.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer"
            >
              <MessageSquare className="h-3 w-3" />
              Submit a Ticket
            </a>
          </DropdownMenuItem>
          
          {/* Theme Switcher */}
          <div className="px-2 py-2 mt-2 border-t border-zinc-700/50">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
      {/* Explore Rantir Column */}
      <div className="bg-zinc-900 text-white p-3">
        <DropdownMenuLabel className="text-xs text-zinc-400 mb-2">Explore Rantir</DropdownMenuLabel>
        <div className="space-y-1">
          {companyLinks.slice(0, 8).map(link => <DropdownMenuItem key={link.name} asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="block px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer">
                {link.name}
              </a>
            </DropdownMenuItem>)}
          <DropdownMenuItem asChild>
            <button
              onClick={() => navigate('/docs/database-api')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-zinc-800 cursor-pointer w-full"
            >
              <Code className="h-3 w-3" />
              API Documentation
            </button>
          </DropdownMenuItem>
          
          {/* Logout */}
          <div className="border-t border-zinc-700/50 mt-2 pt-2">
            <DropdownMenuItem asChild>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-zinc-300 rounded-md transition-all duration-150
                  bg-zinc-800/60 border border-zinc-600/40
                  shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
                  hover:bg-zinc-700/70 hover:text-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]
                  active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[0.5px]
                  cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
            </DropdownMenuItem>
          </div>
        </div>
      </div>
    </DropdownMenuContent>
  );

  const RantirLogo = () => (
    <svg width="19" height="16" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
      <path d="M6.11853 1.40381L12.6928 1.40381C13.7352 1.40381 14.644 1.58422 15.4191 1.94505C16.1942 2.29251 16.7956 2.78698 17.2232 3.42845C17.6509 4.06992 17.8647 4.81831 17.8647 5.6736C17.8647 6.51553 17.6509 7.25723 17.2232 7.89871C16.7956 8.52681 16.1942 9.02128 15.4191 9.38211C14.644 9.72957 13.7352 9.9033 12.6928 9.9033H9.79162L7.99784 7.63811H12.6126C13.3477 7.63811 13.9089 7.47106 14.2965 7.13696C14.6974 6.78949 14.8979 6.30839 14.8979 5.69365C14.8979 5.06554 14.7041 4.59112 14.3165 4.27038C13.929 3.93628 13.361 3.76923 12.6126 3.76923H7.3714L6.11853 1.40381ZM14.3767 15.8369L8.58339 8.33972H11.8509L18.5462 15.8369H14.3767Z" fill="white" />
      <path d="M10.393 4.15933L7.54689 5.61303C6.81105 5.98832 6.39939 6.7967 6.54156 7.61367L7.07498 10.8236L5.62128 7.97743C5.24599 7.24159 4.43761 6.82993 3.62064 6.9721L0.410719 7.50553L3.25688 6.05183C3.99272 5.67654 4.40438 4.86815 4.26221 4.05119L3.72878 0.841264L5.18248 3.68743C5.55777 4.42326 6.36616 4.83492 7.18312 4.69276L10.393 4.15933Z" fill="white" />
    </svg>
  );

  // Minimal header when navigation is hidden (all inner pages including dashboard-related)
  if (!headerVisible) {
    return (
      <header className="fixed top-2 left-2 z-[2000]">
        <div className="flex items-center gap-0 bg-zinc-700/80 border border-zinc-500/40 rounded-lg overflow-hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-zinc-600/80 transition-colors border-r border-zinc-500/30">
                <RantirLogo />
              </button>
            </DropdownMenuTrigger>
            <LogoDropdownContent />
          </DropdownMenu>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={showAll}
                  className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors"
                >
                  <PanelLeft className="h-3.5 w-3.5 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Expand navigation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
    );
  }

  return <header className="h-12 flex items-center w-full fixed top-0 left-0 right-0 z-[2000]" style={{ backgroundColor: topbarBgColor }}>
      {/* Left Section: Rantir Logo Dropdown */}
      <div className="flex items-center h-full border-r border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="w-7 h-7 flex items-center justify-center cursor-pointer bg-white/5 border border-white/15 rounded mx-3 my-2 hover:bg-white/10 hover:border-white/25 transition-colors">
              <RantirLogo />
            </div>
          </DropdownMenuTrigger>
          <LogoDropdownContent />
        </DropdownMenu>
      </div>

      {/* Center: Workspace and Tabs */}
      <div className="flex items-center flex-1 h-full">
        {/* Workspace Name */}
        <div className="flex items-center group cursor-pointer relative px-3 group-hover:px-4 py-4 h-full transition-all duration-150">
          <div onClick={() => setShowWorkspaceSettings(true)} className="flex items-center gap-1">
            {currentWorkspace?.icon_url ? (
              <img src={currentWorkspace.icon_url} alt="Workspace Icon" className="h-5 w-5 rounded object-cover mr-1" />
            ) : (
              <div className="h-5 w-5 bg-stone-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {currentWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
                </span>
              </div>
            )}
            <span className="text-white text-sm font-medium">{currentWorkspace?.name || 'My Workspace'}</span>
            <Pencil className="h-2 w-2 text-stone-400 opacity-0 w-0 group-hover:opacity-100 group-hover:w-2 group-hover:ml-1 transition-all duration-150" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWorkspaceSwitcher(true);
                  }}
                  className="w-0 h-5 flex items-center justify-center rounded hover:bg-zinc-700 opacity-0 group-hover:opacity-100 group-hover:w-5 group-hover:ml-1 transition-all duration-150 overflow-hidden"
                >
                  <ArrowLeftRight className="h-3 w-3 text-zinc-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch workspace</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Separator orientation="vertical" className="h-full bg-white/20" />

        {/* Open Tabs */}
        <div className="flex items-center flex-1 overflow-x-auto h-full">
          {openTabs.length === 0 ? (
            <div className="flex items-center px-4 text-zinc-400 text-sm">
              <span>No open tabs - create or open a project to see tabs here</span>
            </div>
          ) : (
            openTabs.map((tab, index) => {
              const IconComponent = getTabIcon(tab.type);
              return (
                <React.Fragment key={tab.id}>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                       <div 
                         className={`group/tab flex items-center gap-1 px-3 hover:px-4 py-4 h-full cursor-pointer transition-all duration-150 relative ${
                          tab.isActive 
                            ? 'topbar-tab-active' 
                            : 'topbar-tab-inactive'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <IconComponent className="h-3 w-3" />
                        <span className="text-sm max-w-24 truncate">
                          {tab.name.length > 20 ? `${tab.name.substring(0, 20)}...` : tab.name}
                        </span>
                        <button 
                          onClick={e => closeTab(tab.id, e)} 
                          className="w-0 opacity-0 group-hover/tab:w-4 group-hover/tab:opacity-100 group-hover/tab:ml-1 hover:bg-black/30 rounded p-0.5 transition-all duration-150 overflow-hidden flex items-center justify-center"
                        >
                          <X className="h-2 w-2 flex-shrink-0" />
                        </button>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 z-[2200]">
                      <div className="flex justify-between space-x-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">{tab.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {tab.type === 'database' && 'Database project with tables and relationships'}
                            {tab.type === 'flow' && 'Automation flow with nodes and connections'}
                            {tab.type === 'logic' && 'Logic flow with automated workflows'}
                            {tab.type === 'app' && 'Application builder with components and pages'}
                          </p>
                          <div className="flex items-center pt-2">
                            <IconComponent className="h-4 w-4 mr-2 opacity-70" />
                            <span className="text-xs text-muted-foreground capitalize">
                              {tab.type} Project
                            </span>
                          </div>
                        </div>
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <IconComponent className="h-6 w-6 opacity-70" />
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  {index < openTabs.length - 1 && (
                    <Separator orientation="vertical" className="h-full bg-white/20" />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

      </div>

      {/* Right Section - Icon buttons all lined up */}
      <div className="flex items-center h-full px-3 gap-1">
        <TooltipProvider>

          <button 
            className={topbarIconButtonClass}
            onClick={() => setIsSearchExpanded(true)}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </button>

          <button 
            className={topbarIconButtonClass}
            onClick={() => setShowCommunityPlugins(true)}
          >
            <Globe className="h-4 w-4 text-white" />
          </button>

          {/* Sidebar toggle - only show on dashboard */}
          {isDashboardRoute && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebars}
                  className={topbarIconButtonClass}
                >
                  {sidebarsVisible ? <PanelLeftClose className="h-4 w-4 text-white" /> : <PanelLeft className="h-4 w-4 text-white" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sidebarsVisible ? 'Hide sidebars' : 'Show sidebars'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Header minimize toggle - show on all pages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={hideAll}
                className={topbarIconButtonClass}
              >
                <Minimize2 className="h-4 w-4 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Hide navigation & sidebars</p>
            </TooltipContent>
          </Tooltip>


          {/* Account button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => navigate('/settings')}
                className={topbarIconButtonClass}
              >
                <User className="h-4 w-4 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Account</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchExpanded} 
        onClose={() => setIsSearchExpanded(false)} 
      />

      {/* Workspace Settings Dialog */}
      <Dialog open={showWorkspaceSettings} onOpenChange={setShowWorkspaceSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={tempWorkspaceName}
                onChange={(e) => setTempWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
              />
            </div>
            <div>
              <Label htmlFor="workspace-icon">Workspace Icon</Label>
              <Input
                id="workspace-icon"
                type="file"
                onChange={handleIconUpload}
                accept="image/*"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload an image to use as your workspace icon
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveSettings}>Save Changes</Button>
              <Button variant="outline" onClick={() => setShowWorkspaceSettings(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        open={showWorkspaceSwitcher}
        onOpenChange={setShowWorkspaceSwitcher}
        currentWorkspaceId={currentWorkspace?.id}
      />

      {/* Community & Plugins Modal */}
      <CommunityPluginsModal
        open={showCommunityPlugins}
        onOpenChange={setShowCommunityPlugins}
      />

      {/* New Project Modal */}
      <NewProjectModal
        open={isNewProjectModalOpen}
        onOpenChange={setIsNewProjectModalOpen}
        onOpenPlugins={() => setShowCommunityPlugins(true)}
        onCreateProject={async (type, projectName, projectColor, projectDescription) => {
          if (!user) return;
          try {
            const workspace = await workspaceService.getCurrentWorkspace();
            if (type === 'database') {
              const newDb = await databaseService.createDatabase({
                name: projectName,
                description: projectDescription || undefined,
                color: projectColor,
                user_id: user.id
              });
              toast.success("Database created");
              navigate(`/databases/${newDb.id}`);
            } else if (type === 'flow') {
              const { data, error } = await supabase
                .from("flow_projects")
                .insert({ user_id: user.id, name: projectName, description: projectDescription, workspace_id: workspace?.id || null })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                toast.success("Flow created");
                navigate(`/flows/${data.id}`);
              }
            } else if (type === 'website') {
              const { data, error } = await supabase
                .from("app_projects")
                .insert({ user_id: user.id, name: projectName, description: projectDescription, workspace_id: workspace?.id || null, pages: [] })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                toast.success("App project created");
                navigate(`/apps/${data.id}`);
              }
            }
          } catch (error: any) {
            toast.error(error.message || "Failed to create project");
          }
        }}
      />
    </header>;
}