import { useState, useEffect } from 'react';
import { Plus, Sparkles, Eye, Settings, Trash2, Copy, Table2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/compact/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { appBuilderService } from '@/services/appBuilderService';
import { workspaceService } from '@/services/workspaceService';
import { AppProject } from '@/types/appBuilder';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { ComponentRenderer } from '@/components/app-builder/ComponentRenderer';

type ViewType = "table" | "grid";

export default function Apps() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("table");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // undefined = not loaded yet, null = loaded but no workspace, string = workspace id
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(undefined);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  // Load current workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setWorkspaceId(workspace?.id ?? null);
    };
    if (user) {
      loadWorkspace();
    }
  }, [user]);

  useEffect(() => {
    // Only load projects when auth is done and workspace has been checked
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Wait for workspace to be loaded (undefined = still loading)
    if (workspaceId === undefined) return;
    
    loadProjects();
  }, [user, authLoading, workspaceId]);

  const loadProjects = async () => {
    try {
      // When workspace is set, shows ALL workspace apps (for team members)
      const data = await appBuilderService.getUserAppProjects(user!.id, workspaceId);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load app projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      // Ensure workspace context is resolved before creation.
      // If the user clicks "Create" while workspaceId is still loading (undefined),
      // the project may be created without workspace_id and then won't show up
      // in workspace-scoped sidebars.
      let effectiveWorkspaceId = workspaceId;
      if (effectiveWorkspaceId === undefined) {
        const ws = await workspaceService.getCurrentWorkspace();
        effectiveWorkspaceId = ws?.id ?? null;
        setWorkspaceId(effectiveWorkspaceId);
      }

      const project = await appBuilderService.createAppProject({
        user_id: user!.id,
        workspace_id: effectiveWorkspaceId || undefined,
        name: newProject.name,
        description: newProject.description,
        pages: [{
          id: 'home',
          name: 'Home',
          route: '/',
          components: [],
          layout: { type: 'free', config: {} },
          settings: { title: 'Home Page' }
        }],
        global_styles: {},
        settings: {
          theme: 'light',
          primaryColor: '#0f172a',
          fontFamily: 'Inter'
        }
      });

      // Dispatch event to notify sidebar to refresh the list
      window.dispatchEvent(new CustomEvent('app-created', { detail: { projectId: project.id } }));

      setProjects([project, ...projects]);
      setShowCreateDialog(false);
      setNewProject({ name: '', description: '' });
      navigate(`/apps/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this app project?')) {
      try {
        await appBuilderService.deleteAppProject(id);
        
        // Dispatch event to close the tab if open
        window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId: id } }));
        
        setProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
        <div className="max-w-4xl mx-auto p-6 pt-20">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-tiempos font-light text-foreground">App Builder</h1>
              <p className="text-sm text-muted-foreground mt-1">Create beautiful applications with drag-and-drop components</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New App
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Tabs value={currentView} onValueChange={(val) => setCurrentView(val as ViewType)}>
              <TabsList className="h-8">
                <TabsTrigger value="table" className="flex items-center gap-1 text-sm px-3 py-1">
                  <Table2 className="h-3 w-3" /> Table
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center gap-1 text-sm px-3 py-1">
                  <LayoutGrid className="h-3 w-3" /> Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New App</DialogTitle>
              <DialogDescription>
                Create a new application with drag-and-drop components.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
              <div className="grid gap-2">
                <Label htmlFor="name">App Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Awesome App"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe your app..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleCreateProject} disabled={!newProject.name.trim()}>
                Create App
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Content */}
        <div className="dashboard-card p-4">
          {projects.length > 0 ? (
            currentView === "table" ? (
              <div className="dashboard-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Name</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Updated</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Pages</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="py-1.5 px-3 text-[13px]">
                          <a href={`/apps/${project.id}`} className="hover:text-primary font-medium">
                            {project.name}
                          </a>
                        </td>
                        <td className="py-1.5 px-3 text-[13px] text-muted-foreground">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-1.5 px-3 text-[13px] text-muted-foreground">
                          {project.pages.length} page{project.pages.length !== 1 ? 's' : ''}
                        </td>
                        <td className="py-1.5 px-3 text-[13px]">
                          <div className="flex gap-1">
                            <a href={`/apps/${project.id}`}>
                              <button className="p-1 hover:bg-muted rounded">
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </a>
                            <button 
                              onClick={() => handleDeleteProject(project.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer border-border" 
                          onClick={() => navigate(`/apps/${project.id}`)}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <LayoutGrid className="h-4 w-4 text-blue-500" />
                          <h3 className="font-semibold text-sm">{project.name}</h3>
                        </div>
                        
                        {/* App preview - simplified design representation */}
                        <div className="bg-muted rounded p-2 mb-2">
                          <div className="text-xs text-muted-foreground mb-1">App Design</div>
                          <div className="space-y-1">
                            <div className="h-2 bg-blue-200 rounded w-full"></div>
                            <div className="flex gap-1">
                              <div className="h-2 bg-blue-100 rounded w-1/3"></div>
                              <div className="h-2 bg-blue-100 rounded w-2/3"></div>
                            </div>
                            <div className="h-2 bg-blue-100 rounded w-1/2"></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(project.updated_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <a href={`/apps/${project.id}`}>
                              <button className="p-1 hover:bg-muted rounded">
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </a>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id);
                              }}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <div className="max-w-sm mx-auto">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-medium mb-2">Start Building Your First App</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Create beautiful, responsive applications with our drag-and-drop builder. No coding required!
                </p>
                <Button onClick={() => setShowCreateDialog(true)} variant="default" className="gap-2 text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  Create Your First App
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}