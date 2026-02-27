import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { AppComponent, ComponentType } from '@/types/appBuilder';
import { ComponentProp } from '@/types/userComponent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Type, Square, Columns, Grid3X3, MousePointer, Edit, Image, 
  List, Plus, Trash2, Settings, ChevronRight, ChevronDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ComponentEditorCanvasProps {
  definition: AppComponent | null;
  onDefinitionChange: (definition: AppComponent) => void;
  props: ComponentProp[];
}

// Simplified component palette for the editor
const editorComponents = [
  { type: 'container', name: 'Container', icon: Square },
  { type: 'text', name: 'Text', icon: Type },
  { type: 'heading', name: 'Heading', icon: Type },
  { type: 'button', name: 'Button', icon: MousePointer },
  { type: 'input', name: 'Input', icon: Edit },
  { type: 'image', name: 'Image', icon: Image },
  { type: 'list', name: 'List', icon: List },
] as const;

function DraggableComponent({ type, name, icon: Icon }: { type: string; name: string; icon: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab",
        "hover:bg-accent hover:border-primary/30 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{name}</span>
    </div>
  );
}

function DroppableCanvas({ 
  component, 
  onUpdate, 
  onDelete,
  selectedId,
  onSelect,
  depth = 0 
}: { 
  component: AppComponent; 
  onUpdate: (id: string, updates: Partial<AppComponent>) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: component.id,
    data: { accepts: 'component' },
  });
  
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedId === component.id;
  const hasChildren = component.children && component.children.length > 0;
  const isContainer = ['container', 'row', 'column', 'grid', 'section'].includes(component.type);

  return (
    <div className="w-full">
      <div
        ref={isContainer ? setNodeRef : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(component.id);
        }}
        className={cn(
          "border rounded-md p-2 transition-all",
          isSelected && "ring-2 ring-primary border-primary",
          isOver && isContainer && "bg-primary/10 border-primary",
          !isSelected && "border-border hover:border-muted-foreground/50"
        )}
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {component.type}
          </span>
          {component.props?.content && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              "{component.props.content}"
            </span>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(component.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2 space-y-2 pl-2 border-l border-dashed">
            {component.children?.map((child) => (
              <DroppableCanvas
                key={child.id}
                component={child}
                onUpdate={onUpdate}
                onDelete={onDelete}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={0}
              />
            ))}
          </div>
        )}

        {isContainer && (!hasChildren || isExpanded) && (
          <div
            className={cn(
              "mt-2 border-2 border-dashed rounded-md p-4 text-center text-xs text-muted-foreground",
              isOver && "border-primary bg-primary/5"
            )}
          >
            Drop components here
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyEditor({ 
  component, 
  onUpdate,
  availableProps 
}: { 
  component: AppComponent | null; 
  onUpdate: (updates: Partial<AppComponent>) => void;
  availableProps: ComponentProp[];
}) {
  if (!component) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a component to edit its properties
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <p className="text-sm font-medium">{component.type}</p>
        </div>

        {(component.type === 'text' || component.type === 'heading' || component.type === 'button') && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Content</label>
            <Input
              value={component.props?.content || ''}
              onChange={(e) => onUpdate({ props: { ...component.props, content: e.target.value } })}
              placeholder="Enter text..."
            />
          </div>
        )}

        {component.type === 'image' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <Input
              value={component.props?.src || ''}
              onChange={(e) => onUpdate({ props: { ...component.props, src: e.target.value } })}
              placeholder="https://..."
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground">CSS Class</label>
          <Input
            value={component.props?.className || ''}
            onChange={(e) => onUpdate({ props: { ...component.props, className: e.target.value } })}
            placeholder="tailwind classes..."
          />
        </div>

        {availableProps.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Bind to Props</h4>
            <p className="text-xs text-muted-foreground">
              You can bind component properties to the props you defined.
              Use <code className="bg-muted px-1 rounded">{'{propName}'}</code> syntax.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export function ComponentEditorCanvas({ definition, onDefinitionChange, props }: ComponentEditorCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: string; isNew: boolean } | null>(null);

  const selectedComponent = selectedId ? findComponent(definition, selectedId) : null;

  function findComponent(comp: AppComponent | null, id: string): AppComponent | null {
    if (!comp) return null;
    if (comp.id === id) return comp;
    if (comp.children) {
      for (const child of comp.children) {
        const found = findComponent(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  function updateComponent(id: string, updates: Partial<AppComponent>) {
    if (!definition) return;
    
    const updateRecursive = (comp: AppComponent): AppComponent => {
      if (comp.id === id) {
        return { ...comp, ...updates, props: { ...comp.props, ...updates.props } };
      }
      return {
        ...comp,
        children: comp.children?.map(updateRecursive),
      };
    };
    
    onDefinitionChange(updateRecursive(definition));
  }

  function deleteComponent(id: string) {
    if (!definition) return;
    if (definition.id === id) return; // Can't delete root
    
    const deleteRecursive = (comp: AppComponent): AppComponent => ({
      ...comp,
      children: comp.children
        ?.filter(child => child.id !== id)
        .map(deleteRecursive),
    });
    
    onDefinitionChange(deleteRecursive(definition));
    if (selectedId === id) setSelectedId(null);
  }

  function addComponentToParent(parentId: string, type: string) {
    if (!definition) return;
    
    const newComponent: AppComponent = {
      id: uuidv4(),
      type: type as ComponentType,
      children: [],
      props: getDefaultProps(type),
      style: {},
    };
    
    const addRecursive = (comp: AppComponent): AppComponent => {
      if (comp.id === parentId) {
        return {
          ...comp,
          children: [...(comp.children || []), newComponent],
        };
      }
      return {
        ...comp,
        children: comp.children?.map(addRecursive),
      };
    };
    
    onDefinitionChange(addRecursive(definition));
    setSelectedId(newComponent.id);
  }

  function getDefaultProps(type: string): Record<string, any> {
    switch (type) {
      case 'text':
        return { content: 'Text content' };
      case 'heading':
        return { content: 'Heading', tag: 'h2' };
      case 'button':
        return { content: 'Button', variant: 'default' };
      case 'container':
        return { className: 'p-4' };
      case 'row':
        return { className: 'flex gap-4' };
      case 'column':
        return { className: 'flex flex-col gap-4' };
      case 'image':
        return { src: '/placeholder.svg', alt: 'Image' };
      default:
        return {};
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { type: string; isNew: boolean };
    setDraggedItem(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedItem(null);
    
    const { active, over } = event;
    if (!over || !active.data.current) return;
    
    const dragData = active.data.current as { type: string; isNew: boolean };
    
    if (dragData.isNew) {
      addComponentToParent(over.id as string, dragData.type);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        {/* Component Palette */}
        <div className="w-48 border-r bg-muted/30">
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium">Components</h3>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-2 space-y-1">
              {editorComponents.map((comp) => (
                <DraggableComponent
                  key={comp.type}
                  type={comp.type}
                  name={comp.name}
                  icon={comp.icon}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-muted/10">
          <div className="p-3 border-b bg-background">
            <h3 className="text-sm font-medium">Component Structure</h3>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-4">
              {definition ? (
                <DroppableCanvas
                  component={definition}
                  onUpdate={updateComponent}
                  onDelete={deleteComponent}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No component definition yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Properties Panel */}
        <div className="w-64 border-l bg-background">
          <div className="p-3 border-b flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h3 className="text-sm font-medium">Properties</h3>
          </div>
          <PropertyEditor
            component={selectedComponent}
            onUpdate={(updates) => selectedId && updateComponent(selectedId, updates)}
            availableProps={props}
          />
        </div>
      </div>

      <DragOverlay>
        {draggedItem && (
          <div className="px-3 py-2 bg-background border rounded-md shadow-lg">
            <span className="text-sm">{draggedItem.type}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
