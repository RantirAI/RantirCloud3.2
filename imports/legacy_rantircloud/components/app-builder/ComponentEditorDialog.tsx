import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X, Package, Settings, Layers } from 'lucide-react';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { AppComponent, ComponentType } from '@/types/appBuilder';
import { ComponentProp, UserComponent } from '@/types/userComponent';
import { ComponentEditorCanvas } from './ComponentEditorCanvas';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface ComponentEditorDialogProps {
  projectId: string;
}

const PROP_TYPES = ['string', 'number', 'boolean', 'color', 'image', 'slot'] as const;
type PropType = typeof PROP_TYPES[number];

export function ComponentEditorDialog({ projectId }: ComponentEditorDialogProps) {
  const { 
    createComponent, 
    updateComponent, 
    categories,
    isCreateDialogOpen,
    editingComponent,
    closeCreateDialog
  } = useUserComponentStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [componentDefinition, setComponentDefinition] = useState<AppComponent | null>(null);
  const [props, setProps] = useState<ComponentProp[]>([]);
  const [activeTab, setActiveTab] = useState('design');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingComponent) {
      setName(editingComponent.name);
      setDescription(editingComponent.description || '');
      setCategory(editingComponent.category || 'Uncategorized');
      setComponentDefinition(editingComponent.definition);
      setProps(editingComponent.props || []);
    } else {
      // Reset for new component
      setName('');
      setDescription('');
      setCategory('Uncategorized');
      setComponentDefinition(createDefaultDefinition());
      setProps([]);
    }
  }, [editingComponent, open]);

  const createDefaultDefinition = (): AppComponent => ({
    id: uuidv4(),
    type: 'container' as ComponentType,
    children: [],
    props: {
      className: 'p-4 border rounded-lg',
    },
    style: {},
  });

  const handleAddProp = () => {
    const newProp: ComponentProp = {
      id: uuidv4(),
      name: `prop${props.length + 1}`,
      type: 'string',
      defaultValue: '',
      required: false,
      bindings: [],
    };
    setProps([...props, newProp]);
  };

  const handleUpdateProp = (propId: string, updates: Partial<ComponentProp>) => {
    setProps(props.map(p => p.id === propId ? { ...p, ...updates } : p));
  };

  const handleRemoveProp = (propId: string) => {
    setProps(props.filter(p => p.id !== propId));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a component name');
      return;
    }

    if (!componentDefinition) {
      toast.error('Please design your component first');
      return;
    }

    setIsSaving(true);
    try {
      if (editingComponent) {
        // Update existing component
        await updateComponent(projectId, editingComponent.id, {
          name: name.trim(),
          description: description.trim(),
          category,
          definition: componentDefinition,
          props,
        });
        toast.success('Component updated successfully');
      } else {
        // Create new component
        await createComponent(projectId, name.trim(), componentDefinition, props, {
          description: description.trim(),
          category,
        });
        toast.success('Component created successfully');
      }
      closeCreateDialog();
    } catch (error) {
      console.error('Failed to save component:', error);
      toast.error('Failed to save component');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDefinitionChange = (definition: AppComponent) => {
    setComponentDefinition(definition);
  };

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <DialogTitle>
              {editingComponent ? 'Edit Component' : 'Create New Component'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {editingComponent 
              ? 'Modify your reusable component. Changes will sync to all instances.'
              : 'Design a reusable component that you can use throughout your app.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="h-10">
              <TabsTrigger value="design" className="gap-2">
                <Layers className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="props" className="gap-2">
                <Settings className="h-4 w-4" />
                Props ({props.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Package className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="design" className="flex-1 m-0 overflow-hidden">
            <ComponentEditorCanvas
              definition={componentDefinition}
              onDefinitionChange={handleDefinitionChange}
              props={props}
            />
          </TabsContent>

          <TabsContent value="props" className="flex-1 m-0 p-6 overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Component Props</h3>
                  <p className="text-sm text-muted-foreground">
                    Define customizable properties for your component
                  </p>
                </div>
                <Button size="sm" onClick={handleAddProp}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prop
                </Button>
              </div>

              {props.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No props defined yet</p>
                  <p className="text-sm">Add props to make your component customizable</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {props.map((prop) => (
                    <div key={prop.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={prop.name}
                              onChange={(e) => handleUpdateProp(prop.id, { name: e.target.value })}
                              placeholder="propName"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={prop.type} 
                              onValueChange={(value: PropType) => handleUpdateProp(prop.id, { type: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROP_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Default Value</Label>
                            <Input
                              value={prop.defaultValue?.toString() || ''}
                              onChange={(e) => handleUpdateProp(prop.id, { defaultValue: e.target.value })}
                              placeholder="default"
                              className="h-8"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveProp(prop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={prop.required}
                            onChange={(e) => handleUpdateProp(prop.id, { required: e.target.checked })}
                            className="rounded"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 m-0 p-6 overflow-auto">
            <div className="max-w-md space-y-4">
              <div>
                <Label>Component Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MyComponent"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A reusable component that..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={closeCreateDialog}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {editingComponent ? 'Update Component' : 'Create Component'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
