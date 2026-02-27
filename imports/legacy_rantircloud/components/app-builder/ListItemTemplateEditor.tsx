import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Eye, Code2, Trash2, GripVertical } from 'lucide-react';
import { ComponentPalette } from './ComponentPalette';
import { ComponentRenderer } from './ComponentRenderer';
import { ComponentPropertiesPanel } from './ComponentPropertiesPanel';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ListItemTemplateEditorProps {
  template: any;
  schema: any[];
  onChange: (template: any) => void;
  onClose: () => void;
}

export function ListItemTemplateEditor({ 
  template, 
  schema, 
  onChange, 
  onClose 
}: ListItemTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState('design');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  const templateComponents = template?.components || [];

  const handleAddComponent = (componentType: string) => {
    const newComponent = {
      id: `component-${Date.now()}`,
      type: componentType,
      props: {
        // Auto-bind first text field for text components
        ...(componentType === 'text' && schema.length > 0 && {
          content: `{{${schema[0].name}}}`
        })
      },
      // Inherit schema from parent for data binding
      _parentConnection: {
        tableName: 'Connected Table',
        schema: schema
      }
    };

    const updatedTemplate = {
      ...template,
      components: [...templateComponents, newComponent]
    };

    onChange(updatedTemplate);
    setSelectedComponent(newComponent.id);
    setShowPalette(false);
  };

  const handleUpdateComponent = (componentId: string, updates: any) => {
    const updatedComponents = templateComponents.map((comp: any) =>
      comp.id === componentId ? { ...comp, ...updates } : comp
    );

    onChange({
      ...template,
      components: updatedComponents
    });
  };

  const handleDeleteComponent = (componentId: string) => {
    const updatedComponents = templateComponents.filter((comp: any) => comp.id !== componentId);
    onChange({
      ...template,
      components: updatedComponents
    });
    setSelectedComponent(null);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(templateComponents);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onChange({
      ...template,
      components: items
    });
  };

  const sampleData = schema.reduce((acc, field) => {
    acc[field.name] = getSampleValue(field.type);
    return acc;
  }, {} as any);

  function getSampleValue(type: string) {
    switch (type) {
      case 'text':
      case 'string':
        return 'Sample Text';
      case 'number':
      case 'integer':
        return 42;
      case 'boolean':
        return true;
      case 'email':
        return 'example@email.com';
      case 'url':
        return 'https://example.com';
      default:
        return 'Sample Value';
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>List Item Template Editor</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {templateComponents.length} components
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPalette(!showPalette)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </Button>
                </div>
              </div>

              <TabsContent value="design" className="flex-1 overflow-hidden">
                <div className="h-full flex">
                  {/* Components List */}
                  <div className="w-80 border-r bg-muted/20">
                    <div className="p-4">
                      <h4 className="font-medium mb-3">Template Components</h4>
                      
                      {templateComponents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No components yet</p>
                          <p className="text-xs">Add components to build your template</p>
                        </div>
                      ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="components">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                {templateComponents.map((component: any, index: number) => (
                                  <Draggable 
                                    key={component.id} 
                                    draggableId={component.id} 
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`p-3 mb-2 border rounded-lg cursor-pointer transition-colors ${
                                          selectedComponent === component.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border bg-card hover:bg-muted/50'
                                        }`}
                                        onClick={() => setSelectedComponent(component.id)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div {...provided.dragHandleProps}>
                                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-sm capitalize">
                                                {component.type}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {component.id}
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteComponent(component.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      )}
                    </div>

                    {/* Component Palette */}
                    {showPalette && (
                      <div className="border-t p-4">
                        <h5 className="font-medium mb-3">Add Component</h5>
                        <ComponentPalette />
                      </div>
                    )}
                  </div>

                  {/* Preview Area */}
                  <div className="flex-1 p-6">
                    <div className="mb-4">
                      <h4 className="font-medium">Template Preview</h4>
                      <p className="text-sm text-muted-foreground">
                        This is how each list item will look with sample data
                      </p>
                    </div>

                    <Card className="max-w-md">
                      <CardContent className="p-4 space-y-3">
                        {templateComponents.map((component: any) => (
                          <div
                            key={component.id}
                            className={`${
                              selectedComponent === component.id
                                ? 'ring-2 ring-primary ring-offset-2 rounded'
                                : ''
                            }`}
                            onClick={() => setSelectedComponent(component.id)}
                          >
                            <ComponentRenderer
                              component={{
                                ...component,
                                _parentConnection: {
                                  tableName: 'Connected Table',
                                  schema: schema
                                }
                              }}
                              isPreview
                            />
                          </div>
                        ))}

                        {templateComponents.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Template preview will appear here</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 p-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Full Preview</h4>
                  
                  {/* Show multiple items */}
                  <div className="space-y-4">
                    {[1, 2, 3].map((index) => (
                      <Card key={index} className="max-w-md">
                        <CardContent className="p-4 space-y-3">
                          {templateComponents.map((component: any) => (
                            <ComponentRenderer
                              key={component.id}
                              component={{
                                ...component,
                                _parentConnection: {
                                  tableName: 'Connected Table',
                                  schema: schema
                                }
                              }}
                              isPreview
                            />
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Properties Panel */}
          {selectedComponent && (
            <div className="w-80 border-l bg-muted/20">
              <div className="p-4">
                <h4 className="font-medium mb-3">Component Properties</h4>
                <div className="text-sm text-muted-foreground">
                  Component properties panel would go here
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}