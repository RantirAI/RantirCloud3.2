import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Users, Plus } from 'lucide-react';
import { workspaceService, Workspace } from '@/services/workspaceService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface WorkspaceSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWorkspaceId?: string;
}

interface WorkspaceWithMemberCount extends Workspace {
  memberCount?: number;
}

export function WorkspaceSwitcherModal({ 
  open, 
  onOpenChange, 
  currentWorkspaceId 
}: WorkspaceSwitcherModalProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState<File | null>(null);
  const [newWorkspaceIconPreview, setNewWorkspaceIconPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadWorkspaces();
      setShowCreateForm(false);
      setNewWorkspaceName('');
      setNewWorkspaceIcon(null);
      setNewWorkspaceIconPreview(null);
    }
  }, [open]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const allWorkspaces = await workspaceService.getAllWorkspaces();
      
      // Get member counts for each workspace
      const workspacesWithCounts = await Promise.all(
        allWorkspaces.map(async (workspace) => {
          const { count } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace.id);
          
          return {
            ...workspace,
            memberCount: count || 1
          };
        })
      );
      
      setWorkspaces(workspacesWithCounts);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) {
      onOpenChange(false);
      return;
    }
    
    await workspaceService.setCurrentWorkspace(workspaceId);
    
    // Clear tabs from localStorage that don't belong to the new workspace BEFORE reload
    try {
      const savedTabs = localStorage.getItem('open-tabs');
      if (savedTabs) {
        const tabs = JSON.parse(savedTabs);
        const filteredTabs = tabs.filter((tab: any) => !tab.workspaceId || tab.workspaceId === workspaceId);
        localStorage.setItem('open-tabs', JSON.stringify(filteredTabs));
      }
    } catch (error) {
      console.error('Error filtering tabs:', error);
      // Clear all tabs on error
      localStorage.setItem('open-tabs', JSON.stringify([]));
    }
    
    // Emit workspace-switched event 
    window.dispatchEvent(new CustomEvent('workspace-switched', { detail: workspaceId }));
    
    onOpenChange(false);
    // Navigate to dashboard after switching workspace
    window.location.href = '/';
  };

  const handleWorkspaceIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewWorkspaceIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewWorkspaceIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    try {
      setCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a workspace');
        return;
      }

      const newWorkspace = await workspaceService.createWorkspace({
        user_id: user.id,
        name: newWorkspaceName.trim(),
        is_default: false
      });

      if (newWorkspace) {
        // Upload icon if provided
        if (newWorkspaceIcon) {
          const iconUrl = await workspaceService.uploadWorkspaceIcon(newWorkspace.id, newWorkspaceIcon);
          if (iconUrl) {
            await workspaceService.updateWorkspace(newWorkspace.id, { icon_url: iconUrl });
          }
        }

        toast.success('Workspace created successfully!');
        setNewWorkspaceName('');
        setNewWorkspaceIcon(null);
        setNewWorkspaceIconPreview(null);
        setShowCreateForm(false);
        await loadWorkspaces();
      } else {
        toast.error('Failed to create workspace');
      }
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      toast.error(error.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="text-sm font-medium">Switch Workspace</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No workspaces found
              </div>
            ) : (
              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      workspace.id === currentWorkspaceId
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Workspace Icon */}
                    {workspace.icon_url ? (
                      <img 
                        src={workspace.icon_url} 
                        alt={workspace.name} 
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                        <span className="text-zinc-600 dark:text-zinc-300 text-sm font-bold">
                          {workspace.name?.charAt(0).toUpperCase() || 'W'}
                        </span>
                      </div>
                    )}
                    
                    {/* Workspace Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {workspace.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Users className="h-3 w-3" />
                        <span>{workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</span>
                      </div>
                    </div>
                    
                    {/* Check mark for current */}
                    {workspace.id === currentWorkspaceId && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Create Workspace Form or Button */}
        <div className="p-3 border-t border-border/50">
          {showCreateForm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* Avatar upload */}
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleWorkspaceIconChange}
                  />
                  {newWorkspaceIconPreview ? (
                    <img 
                      src={newWorkspaceIconPreview} 
                      alt="Workspace icon" 
                      className="h-12 w-12 rounded-lg object-cover border-2 border-dashed border-primary"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </label>
                <Input
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateWorkspace}
                  disabled={creating || !newWorkspaceName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkspaceName('');
                    setNewWorkspaceIcon(null);
                    setNewWorkspaceIconPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Workspace
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
