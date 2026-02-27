import React from 'react';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Settings, Tag, FileText, Component } from 'lucide-react';
import { ComponentProp } from '@/types/userComponent';

const propTypes = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'color', label: 'Color' },
  { value: 'image', label: 'Image URL' },
  { value: 'slot', label: 'Slot (Children)' }
];

export function ComponentPropsManager() {
  const {
    editingMetadata,
    editingProps,
    categories,
    updateEditingMetadata,
    addEditingProp,
    updateEditingProp,
    removeEditingProp
  } = useUserComponentStore();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Component Metadata Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Component className="h-4 w-4 text-primary" />
            <span>Component Settings</span>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="comp-name" className="text-xs">Name</Label>
              <Input
                id="comp-name"
                value={editingMetadata.name}
                onChange={(e) => updateEditingMetadata({ name: e.target.value })}
                placeholder="Component name"
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="comp-desc" className="text-xs">Description</Label>
              <Textarea
                id="comp-desc"
                value={editingMetadata.description}
                onChange={(e) => updateEditingMetadata({ description: e.target.value })}
                placeholder="Describe what this component does..."
                className="text-sm resize-none h-16"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="comp-category" className="text-xs">Category</Label>
              <Select
                value={editingMetadata.category}
                onValueChange={(value) => updateEditingMetadata({ category: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Props Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4 text-primary" />
              <span>Component Props</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addEditingProp()}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Prop
            </Button>
          </div>

          {editingProps.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No props defined yet</p>
              <p className="text-xs mt-1">Add props to make your component configurable</p>
            </div>
          ) : (
            <div className="space-y-3">
              {editingProps.map((prop, index) => (
                <PropEditor
                  key={prop.id}
                  prop={prop}
                  index={index}
                  onUpdate={(updates) => updateEditingProp(prop.id, updates)}
                  onRemove={() => removeEditingProp(prop.id)}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Help Text */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 mb-2 text-primary" />
          <p className="font-medium mb-1">How to use props:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Add props above to define configurable values</li>
            <li>Select an element on the canvas</li>
            <li>Use the "Bind to Prop" button next to any field</li>
            <li>When placed on a page, props can be customized per instance</li>
          </ol>
        </div>
      </div>
    </ScrollArea>
  );
}

interface PropEditorProps {
  prop: ComponentProp;
  index: number;
  onUpdate: (updates: Partial<ComponentProp>) => void;
  onRemove: () => void;
}

function PropEditor({ prop, index, onUpdate, onRemove }: PropEditorProps) {
  return (
    <div className="border rounded-lg p-3 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Prop #{index + 1}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={prop.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="propName"
            className="h-7 text-xs"
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={prop.type}
            onValueChange={(value: ComponentProp['type']) => onUpdate({ type: value })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {propTypes.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs">Default Value</Label>
        {prop.type === 'boolean' ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={prop.defaultValue === true}
              onCheckedChange={(checked) => onUpdate({ defaultValue: checked })}
            />
            <span className="text-xs text-muted-foreground">
              {prop.defaultValue ? 'True' : 'False'}
            </span>
          </div>
        ) : prop.type === 'color' ? (
          <div className="flex gap-2">
            <Input
              type="color"
              value={prop.defaultValue || '#000000'}
              onChange={(e) => onUpdate({ defaultValue: e.target.value })}
              className="h-7 w-12 p-0.5"
            />
            <Input
              value={prop.defaultValue || ''}
              onChange={(e) => onUpdate({ defaultValue: e.target.value })}
              placeholder="#000000"
              className="h-7 text-xs flex-1"
            />
          </div>
        ) : (
          <Input
            type={prop.type === 'number' ? 'number' : 'text'}
            value={prop.defaultValue || ''}
            onChange={(e) => onUpdate({ 
              defaultValue: prop.type === 'number' ? Number(e.target.value) : e.target.value 
            })}
            placeholder={prop.type === 'number' ? '0' : 'Default value'}
            className="h-7 text-xs"
          />
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id={`required-${prop.id}`}
          checked={prop.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
        <Label htmlFor={`required-${prop.id}`} className="text-xs">Required</Label>
      </div>
    </div>
  );
}
