import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { AppComponent } from '@/types/appBuilder';
import { ComponentProp, findBindableProperties } from '@/types/userComponent';
import { componentCodeGenerator } from '@/services/componentCodeGenerator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Trash2, Variable, Code, Folder, FileCode } from 'lucide-react';
import { toast } from 'sonner';

export function SaveAsComponentDialog() {
  const { id: projectId } = useParams<{ id: string }>();
  const { 
    isSaveDialogOpen, 
    closeSaveDialog, 
    componentToSave,
    createComponent,
    categories,
    isLoading
  } = useUserComponentStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [newCategory, setNewCategory] = useState('');
  const [props, setProps] = useState<ComponentProp[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Find bindable properties when component changes
  const bindableProperties = useMemo(() => {
    if (!componentToSave) return [];
    return findBindableProperties(componentToSave);
  }, [componentToSave]);

  // Generate code preview
  const generatedCode = useMemo(() => {
    if (!componentToSave || !name.trim()) return null;
    
    const finalCategory = showNewCategory && newCategory.trim() 
      ? newCategory.trim() 
      : category;
    
    return componentCodeGenerator.generateComponentCode(
      name.trim(),
      finalCategory,
      componentToSave,
      props,
      description.trim() || undefined
    );
  }, [componentToSave, name, category, newCategory, showNewCategory, props, description]);

  const handleAddProp = () => {
    const newProp: ComponentProp = {
      id: crypto.randomUUID(),
      name: `prop${props.length + 1}`,
      type: 'string',
      required: false,
      bindings: []
    };
    setProps([...props, newProp]);
  };

  const handleUpdateProp = (id: string, updates: Partial<ComponentProp>) => {
    setProps(props.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemoveProp = (id: string) => {
    setProps(props.filter(p => p.id !== id));
  };

  const handleBindProperty = (propId: string, componentId: string, property: string, checked: boolean) => {
    setProps(props.map(p => {
      if (p.id !== propId) return p;
      
      const bindings = checked
        ? [...p.bindings, { componentId, property }]
        : p.bindings.filter(b => !(b.componentId === componentId && b.property === property));
      
      return { ...p, bindings };
    }));
  };

  const handleSave = async () => {
    if (!projectId || !componentToSave) return;
    if (!name.trim()) {
      toast.error('Please enter a component name');
      return;
    }

    const finalCategory = showNewCategory && newCategory.trim() 
      ? newCategory.trim() 
      : category;

    const result = await createComponent(
      projectId,
      name.trim(),
      componentToSave,
      props,
      {
        description: description.trim() || undefined,
        category: finalCategory
      }
    );

    if (result) {
      // Show success message with file path info
      const filePath = generatedCode 
        ? `${generatedCode.folderPath}/${generatedCode.fileName}`
        : '';
      toast.success(
        `Component "${name}" saved to library${filePath ? `\nFile: ${filePath}` : ''}`,
        { duration: 4000 }
      );
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('Uncategorized');
    setNewCategory('');
    setProps([]);
    setShowNewCategory(false);
    setActiveTab('details');
  };

  const handleClose = () => {
    resetForm();
    closeSaveDialog();
  };

  if (!componentToSave) return null;

  return (
    <Dialog open={isSaveDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Save as Component
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details" className="gap-2">
              <FileCode className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="props" className="gap-2">
              <Variable className="h-4 w-4" />
              Props
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" disabled={!name.trim()}>
              <Code className="h-4 w-4" />
              Code Preview
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4 mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              {/* Component Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Component Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., PricingCard, HeroSection"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {name.trim() && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    Will be saved as: {componentCodeGenerator.toPascalCase(name)}.tsx
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this component do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category (Folder)</Label>
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewCategory(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewCategory(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {/* Show folder path */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                  <Folder className="h-3 w-3" />
                  <span>
                    {generatedCode?.folderPath || 'src/components/user'}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="props" className="mt-0 space-y-4">
              {/* Props Definition */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    Component Props
                  </Label>
                  <Button variant="outline" size="sm" onClick={handleAddProp}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Prop
                  </Button>
                </div>

                {props.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                    No props defined. Add props to make this component configurable.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {props.map((prop) => (
                      <div key={prop.id} className="p-3 border rounded-md space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Prop name"
                              value={prop.name}
                              onChange={(e) => handleUpdateProp(prop.id, { 
                                name: e.target.value.replace(/\s+/g, '') 
                              })}
                            />
                            <Select 
                              value={prop.type} 
                              onValueChange={(v) => handleUpdateProp(prop.id, { type: v as ComponentProp['type'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="color">Color</SelectItem>
                                <SelectItem value="image">Image URL</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Default value"
                              value={prop.defaultValue || ''}
                              onChange={(e) => handleUpdateProp(prop.id, { defaultValue: e.target.value })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProp(prop.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Binding Selection */}
                        {bindableProperties.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Bind to:</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {bindableProperties.map((bp, idx) => {
                                const isChecked = prop.bindings.some(
                                  b => b.componentId === bp.componentId && b.property === bp.property
                                );
                                return (
                                  <label 
                                    key={idx} 
                                    className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => 
                                        handleBindProperty(prop.id, bp.componentId, bp.property, !!checked)
                                      }
                                    />
                                    <span className="truncate">
                                      {bp.componentName}.{bp.property}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-4">
              {generatedCode && (
                <div className="space-y-4">
                  {/* File info */}
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileCode className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{generatedCode.fileName}</p>
                      <p className="text-xs text-muted-foreground">{generatedCode.folderPath}</p>
                    </div>
                  </div>

                  {/* Import statement */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Import statement for other pages:</Label>
                    <pre className="p-2 bg-muted rounded-md text-xs overflow-x-auto">
                      <code>
                        {componentCodeGenerator.generateImportStatement(
                          name,
                          showNewCategory && newCategory.trim() ? newCategory.trim() : category
                        )}
                      </code>
                    </pre>
                  </div>

                  {/* Code preview */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Generated code:</Label>
                    <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto max-h-[300px]">
                      <code>{generatedCode.code}</code>
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Saving...' : 'Save Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
