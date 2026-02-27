import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Code, Copy, Trash2, ImageIcon, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { appBuilderService } from '@/services/appBuilderService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProjectSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsModal({ open, onOpenChange }: ProjectSettingsModalProps) {
  const navigate = useNavigate();
  const { currentProject, updateProject, saveProject } = useAppBuilderStore();
  
  const [activeTab, setActiveTab] = useState('settings');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [favicon, setFavicon] = useState('');
  const [headCode, setHeadCode] = useState('');
  const [bodyCode, setBodyCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentProject && open) {
      setProjectName(currentProject.name || '');
      setProjectDescription(currentProject.description || '');
      setFavicon(currentProject.settings?.favicon || '');
      setHeadCode(currentProject.settings?.customCode?.head || '');
      setBodyCode(currentProject.settings?.customCode?.body || '');
      setShowDeleteConfirm(false);
      setDeleteConfirmName('');
    }
  }, [currentProject, open]);

  const handleSave = async () => {
    if (!currentProject) return;
    
    setIsSaving(true);
    try {
      await updateProject(currentProject.id, {
        name: projectName,
        description: projectDescription,
        settings: {
          ...currentProject.settings,
          favicon,
          customCode: {
            head: headCode,
            body: bodyCode,
          }
        }
      });
      toast.success('Project settings saved');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save project settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!currentProject) return;
    
    setIsSaving(true);
    try {
      const newProject = await appBuilderService.createAppProject({
        user_id: currentProject.user_id,
        name: `${currentProject.name} (Copy)`,
        description: currentProject.description,
        pages: currentProject.pages,
        global_styles: currentProject.global_styles,
        settings: currentProject.settings,
        style_classes: currentProject.style_classes,
      });
      toast.success('Project duplicated');
      onOpenChange(false);
      navigate(`/apps/${newProject.id}`);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      toast.error('Failed to duplicate project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProject || deleteConfirmName !== currentProject.name) return;
    
    setIsDeleting(true);
    try {
      await appBuilderService.deleteAppProject(currentProject.id);
      toast.success('Project deleted');
      onOpenChange(false);
      navigate('/apps');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFavicon(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent shrink-0">
            <TabsTrigger 
              value="settings" 
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-xs"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Project Settings
            </TabsTrigger>
            <TabsTrigger 
              value="code" 
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-xs"
            >
              <Code className="h-3.5 w-3.5 mr-1.5" />
              Custom Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="flex-1 overflow-y-auto mt-3 px-2.5 space-y-3">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Project Information</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Project"
                  className="h-8 text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Project description..."
                  className="h-20 text-xs resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Favicon</h3>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                  {favicon ? (
                    <img src={favicon} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <span>
                        <Upload className="h-3 w-3 mr-1.5" />
                        Upload Favicon
                      </span>
                    </Button>
                  </label>
                  {favicon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setFavicon('')}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t">
              <h3 className="text-sm font-medium">Actions</h3>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicate}
                  disabled={isSaving}
                  className="h-8 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Duplicate Project
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t">
              <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
              
              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Project
                </Button>
              ) : (
                <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-destructive">This action cannot be undone</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type <span className="font-bold">"{currentProject?.name}"</span> to confirm
                      </p>
                    </div>
                  </div>
                  <Input
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Enter project name"
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmName('');
                      }}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteConfirmName !== currentProject?.name || isDeleting}
                      className="h-7 text-xs"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Forever'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 overflow-y-auto mt-3 px-2.5 space-y-3">
            <p className="text-xs text-muted-foreground">
              Add custom code that will be injected into all pages of this project.
            </p>
            
            {/* Head Code */}
            <div className="space-y-2">
              <Label className="text-xs">{`<head>` } Code</Label>
              <p className="text-[10px] text-muted-foreground">
                Scripts, styles, meta tags, etc. that go in the {`<head>`} section
              </p>
              <Textarea
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                placeholder={`<!-- Add tracking scripts, custom fonts, etc. -->
<script src="..."></script>
<link rel="stylesheet" href="..." />`}
                className="font-mono text-xs h-32 resize-none"
              />
            </div>

            {/* Body Code */}
            <div className="space-y-2">
              <Label className="text-xs">{`<body>`} Code</Label>
              <p className="text-[10px] text-muted-foreground">
                Scripts that should load at the end of the {`<body>`}
              </p>
              <Textarea
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                placeholder={`<!-- Add scripts that need to run after page load -->
<script>
  // Your code here
</script>`}
                className="font-mono text-xs h-32 resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
