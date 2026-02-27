
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  X,
  Database,
  Network,
  Grid3X3,
  Sparkles,
  PanelLeft,
  Trash2
} from "lucide-react";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Logo } from './Logo';
import { useAISidebarStore } from '@/stores/aiSidebarStore';
import { useDashboardLayoutStore } from '@/stores/dashboardLayoutStore';
import { supabase } from '@/integrations/supabase/client';
import { workspaceService } from '@/services/workspaceService';
import { useAuth } from '@/hooks/useAuth';
import { ProjectDeleteConfirmDialog, ProjectType } from './ProjectDeleteConfirmDialog';

interface NavItemData {
  icon: typeof Database;
  href: string;
  label: string;
  color: string;
  external: boolean;
}

const navItems: NavItemData[] = [
  { icon: Database, href: "/databases", label: "Databases", color: "text-yellow-600", external: false },
  { icon: Network, href: "/flows", label: "Flows", color: "text-purple-600", external: false },
  { icon: Grid3X3, href: "/apps", label: "Apps", color: "text-blue-600", external: false }
];

interface CompactSidebarProps {
  onClose?: () => void;
  headerCollapsed?: boolean;
}

export function CompactSidebar({ onClose, headerCollapsed = false }: CompactSidebarProps) {
  const { isOpen, toggleSidebar } = useAISidebarStore();
  const { showAll } = useDashboardLayoutStore();
  const location = useLocation();
  const { user } = useAuth();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
    type: ProjectType;
  } | null>(null);
  
  const [projects, setProjects] = useState<{
    databases: any[];
    flows: any[];
    apps: any[];
  }>({ databases: [], flows: [], apps: [] });
  
  // Load projects for hover cards - uses workspace context for shared visibility
  const loadProjects = useCallback(async () => {
    if (!user) return;

    // Get current workspace for proper filtering
    const workspace = await workspaceService.getCurrentWorkspace();
    const wsId = workspace?.id || null;

    // Build queries based on workspace context
    let dbQuery = supabase.from('databases').select('id, name, updated_at');
    let flowQuery = supabase.from('flow_projects').select('id, name, updated_at');
    let appQuery = supabase.from('app_projects').select('id, name, updated_at');

    if (wsId) {
      // Workspace context: show ALL projects in workspace (for team members)
      dbQuery = dbQuery.eq('workspace_id', wsId);
      flowQuery = flowQuery.eq('workspace_id', wsId);
      appQuery = appQuery.eq('workspace_id', wsId);
    } else {
      // Personal context: show only user's own projects
      dbQuery = dbQuery.eq('user_id', user.id);
      flowQuery = flowQuery.eq('user_id', user.id);
      appQuery = appQuery.eq('user_id', user.id);
    }

    // NOTE: Do NOT limit to 3 — users expect the full list here.
    const [dbRes, flowRes, appRes] = await Promise.all([
      dbQuery.order('updated_at', { ascending: false }),
      flowQuery.order('updated_at', { ascending: false }),
      appQuery.order('updated_at', { ascending: false }),
    ]);

    setProjects({
      databases: dbRes.data || [],
      flows: flowRes.data || [],
      apps: appRes.data || [],
    });
  }, [user]);
  
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  // Listen for project creation events to refresh the list
  useEffect(() => {
    const handleProjectCreated = () => {
      loadProjects();
    };
    
    window.addEventListener('project-created', handleProjectCreated);
    window.addEventListener('app-created', handleProjectCreated);
    window.addEventListener('flow-created', handleProjectCreated);
    window.addEventListener('database-created', handleProjectCreated);
    
    return () => {
      window.removeEventListener('project-created', handleProjectCreated);
      window.removeEventListener('app-created', handleProjectCreated);
      window.removeEventListener('flow-created', handleProjectCreated);
      window.removeEventListener('database-created', handleProjectCreated);
    };
  }, [loadProjects]);
  
  // Check if we're on a detail page that needs full reload on navigation
  const isDetailPage = (
    location.pathname.startsWith('/tables/') ||
    location.pathname.startsWith('/flows/') ||
    location.pathname.startsWith('/apps/')
  );
  
  const getProjectsForItem = (label: string) => {
    switch (label) {
      case 'Databases': return { items: projects.databases, basePath: '/databases' };
      case 'Flows': return { items: projects.flows, basePath: '/flows' };
      case 'Apps': return { items: projects.apps, basePath: '/apps' };
      default: return { items: [], basePath: '' };
    }
  };

  const getProjectTypeForLabel = (label: string): ProjectType => {
    switch (label) {
      case 'Databases': return 'database';
      case 'Flows': return 'flow';
      case 'Apps': return 'app';
      default: return 'database';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, project: any, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete({
      id: project.id,
      name: project.name,
      type: getProjectTypeForLabel(label),
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    loadProjects();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <ProjectDeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectId={projectToDelete?.id || null}
        projectName={projectToDelete?.name || ''}
        projectType={projectToDelete?.type || 'database'}
        onSuccess={handleDeleteSuccess}
      />
      <aside className={cn(
        "bg-zinc-100 dark:bg-zinc-900 fixed inset-y-0 z-50 flex flex-col items-center pointer-events-auto transition-all duration-300",
        headerCollapsed ? "w-[48px] top-12" : "w-[48px] top-0"
      )}>
        {/* Logo at top - only show when header is not collapsed */}
        {!headerCollapsed && (
          <div className="flex justify-center pt-3 pb-2">
            <Logo className="h-6 w-6" />
          </div>
        )}
        
        
        
        {/* AI Assistant Star Button */}
        <div className="flex justify-center pb-2 pt-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded transition-colors",
                  isOpen
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              AI Assistant
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Close button */}
        {onClose && (
          <div className="flex justify-center pb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Close
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* Navigation items - centered */}
        <nav className="flex-1 flex flex-col items-center justify-center gap-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const projectData = getProjectsForItem(item.label);
            
            return (
              <HoverCard
                key={item.label}
                openDelay={200}
                closeDelay={100}
                onOpenChange={(open) => {
                  // Ensure the list is always fresh even if navigation/unmount happens between creation and hover.
                  if (open) loadProjects();
                }}
              >
                <HoverCardTrigger asChild>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex h-8 w-8 items-center justify-center transition-colors rounded hover:bg-muted",
                        item.color
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      reloadDocument={isDetailPage}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center transition-colors rounded hover:bg-muted",
                        item.color
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </Link>
                  )}
                </HoverCardTrigger>
                <HoverCardContent side="right" align="start" className="w-48 p-2">
                  <div className="space-y-2">
                    <Link 
                      to={item.href}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                    {projectData.items.length > 0 ? (
                      <div className="space-y-0.5 max-h-64 overflow-auto">
                        {projectData.items.map((project: any) => (
                          <div
                            key={project.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                          >
                            <Link
                              to={`${projectData.basePath}/${project.id}`}
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <IconComponent className={cn("h-3 w-3 flex-shrink-0", item.color)} />
                              <span className="truncate">{project.name}</span>
                            </Link>
                            <button
                              onClick={(e) => handleDeleteClick(e, project, item.label)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                              title="Delete project"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/60 px-2">No projects yet</p>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
