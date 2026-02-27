import { useState } from 'react';
import { useClassStore } from '@/stores/classStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Palette,
  Check,
  X,
  Settings,
  Sliders
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClassStyleEditor } from './ClassStyleEditor';
import { ClassNamingSettings } from './ClassNamingSettings';

export function ClassManager() {
  const {
    classes,
    selectedClass,
    addClass,
    updateClass,
    deleteClass,
    duplicateClass,
    selectClass
  } = useClassStore();
  
  const { currentProject } = useAppBuilderStore();

  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [styleEditorClass, setStyleEditorClass] = useState<string | null>(null);
  const [namingSettingsOpen, setNamingSettingsOpen] = useState(false);

  const handleCreateClass = async () => {
    if (newClassName.trim()) {
      await addClass(newClassName.trim(), {});
      setNewClassName('');
      setIsDialogOpen(false);
    }
  };

  const handleRenameClass = async (classId: string) => {
    if (editingName.trim()) {
      const sanitizedName = editingName.trim().replace(/\s+/g, '-');
      await updateClass(classId, { name: sanitizedName });
      setEditingClass(null);
      setEditingName('');
    }
  };

  const handleDuplicateClass = (classId: string) => {
    const originalClass = classes.find(cls => cls.id === classId);
    if (originalClass) {
      const newName = `${originalClass.name} Copy`;
      duplicateClass(classId, newName);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      await deleteClass(classId);
    }
  };

  const startEditing = (classId: string, currentName: string) => {
    setEditingClass(classId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingClass(null);
    setEditingName('');
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Classes
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setNamingSettingsOpen(true)}
              title="Class naming settings"
            >
              <Sliders className="h-3 w-3" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="e.g., primary-button, hero-section"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateClass();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateClass}
                    disabled={!newClassName.trim()}
                  >
                    Create Class
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {classes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No classes yet</p>
              <p className="text-xs">Create classes to reuse styles</p>
            </div>
          ) : (
            classes.map((styleClass) => (
              <div
                key={styleClass.id}
                className={cn(
                  'border rounded-md p-3 cursor-pointer transition-all',
                  selectedClass === styleClass.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => selectClass(
                  selectedClass === styleClass.id ? null : styleClass.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {editingClass === styleClass.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-6 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameClass(styleClass.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameClass(styleClass.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium text-sm truncate"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startEditing(styleClass.id, styleClass.name);
                          }}
                        >
                          {styleClass.name}
                        </span>
                        {styleClass.appliedTo.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {styleClass.appliedTo.length}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {editingClass !== styleClass.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setStyleEditorClass(styleClass.id);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Styles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(styleClass.id, styleClass.name);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateClass(styleClass.id);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(styleClass.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {selectedClass === styleClass.id && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Applied to {styleClass.appliedTo.length} components</span>
                        <span>
                          Updated {styleClass.updatedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Style Editor Dialog */}
      {styleEditorClass && (
        <Dialog open={!!styleEditorClass} onOpenChange={() => setStyleEditorClass(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Class Styles</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ClassStyleEditor
                styleClass={classes.find(cls => cls.id === styleEditorClass)!}
                onUpdate={(updates) => updateClass(styleEditorClass, updates)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Naming Settings Dialog */}
      <ClassNamingSettings
        open={namingSettingsOpen}
        onOpenChange={setNamingSettingsOpen}
        projectId={currentProject?.id}
      />
    </div>
  );
}