import { useState } from 'react';
import { AppComponent } from '@/types/appBuilder';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ComponentRenderer } from './ComponentRenderer';
import { ComponentPalette } from './ComponentPalette';
import { X, Save, Plus, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ModalEditorProps {
  componentId: string;
  onClose: () => void;
}

export function ModalEditor({ componentId, onClose }: ModalEditorProps) {
  const { 
    currentProject, 
    currentPage, 
    updateComponent, 
    addComponent,
    selectComponent,
    selectedComponent
  } = useAppBuilderStore();

  const [modalContent, setModalContent] = useState<AppComponent[]>([]);
  const [showPalette, setShowPalette] = useState(false);

  // Find the modal component
  const findComponent = (components: AppComponent[]): AppComponent | null => {
    for (const comp of components) {
      if (comp.id === componentId) return comp;
      if (comp.children) {
        const found = findComponent(comp.children);
        if (found) return found;
      }
    }
    return null;
  };

  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const modalComponent = pageData ? findComponent(pageData.components) : null;

  if (!modalComponent) {
    return null;
  }

  const handleSave = () => {
    updateComponent(componentId, {
      ...modalComponent,
      children: modalContent
    });
    onClose();
  };

  const handleAddComponent = (type: string) => {
    const newComponent: AppComponent = {
      id: `component-${Date.now()}`,
      type: type as any,
      props: {},
      style: {},
      children: [],
      actions: [],
      conditions: []
    };

    setModalContent([...modalContent, newComponent]);
    setShowPalette(false);
  };

  const handleDeleteComponent = (id: string) => {
    setModalContent(modalContent.filter(c => c.id !== id));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Edit Modal Content</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPalette(!showPalette)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Component Palette */}
          {showPalette && (
            <div className="w-80 border-r border-border bg-muted/30">
              <div className="p-4 border-b border-border">
                <h3 className="font-medium">Add Components</h3>
              </div>
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {['text', 'heading', 'button', 'input', 'textarea', 'image', 'card', 'badge'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleAddComponent(type)}
                        className="p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="font-medium text-sm capitalize">{type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Modal Content Editor */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <div className="h-full bg-background">
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Modal Title</Label>
                    <Input
                      value={modalComponent.props?.title || ''}
                      onChange={(e) => updateComponent(componentId, {
                        props: { ...modalComponent.props, title: e.target.value }
                      })}
                      placeholder="Enter modal title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modal Description</Label>
                    <Textarea
                      value={modalComponent.props?.description || ''}
                      onChange={(e) => updateComponent(componentId, {
                        props: { ...modalComponent.props, description: e.target.value }
                      })}
                      placeholder="Enter modal description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modal Content</Label>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Content Area</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                          {modalContent.length > 0 ? (
                            <div className="space-y-4">
                              {modalContent.map((component, index) => (
                                <div key={component.id} className="relative group">
                                  <ComponentRenderer
                                    component={component}
                                    isPreview={false}
                                    parentId={componentId}
                                    index={index}
                                  />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteComponent(component.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              <p>No content added yet</p>
                              <p className="text-sm">Click "Add Component" to start building the modal content</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}