import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableField } from '@/services/tableService';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { SchemaTypeIcon } from '@/components/SchemaTypeIcon';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/components/ui/sonner';

interface SchemaPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: TableField[];
  onFieldsChange: (fields: TableField[]) => void;
}

function SortableField({ 
  field, 
  onUpdate, 
  onDelete 
}: { 
  field: TableField; 
  onUpdate: (updates: Partial<TableField>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: field.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/50 border rounded-md p-2 space-y-2"
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <SchemaTypeIcon type={field.type} size={14} />
        <span className="font-medium text-xs flex-1 truncate">{field.name}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-5 w-5"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 pl-5">
        <div>
          <Label className="text-[10px] text-muted-foreground">Name</Label>
          <Input
            value={field.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-7 text-xs"
          />
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground">Type</Label>
          <Select value={field.type} onValueChange={(value) => onUpdate({ type: value as any })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="multiselect">Multi-Select</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="reference">Reference</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pl-5">
        <Label className="text-[10px] text-muted-foreground">Description</Label>
        <Input
          value={field.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Optional"
          className="h-7 text-xs"
        />
      </div>

      {(field.type === 'select' || field.type === 'multiselect') && (
        <div className="pl-5 space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Options</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const options = field.options || [];
                onUpdate({ options: [...options, ''] });
              }}
              className="h-5 text-[10px] px-1"
            >
              <Plus className="h-2.5 w-2.5 mr-0.5" />
              Add
            </Button>
          </div>
          <div className="space-y-1">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  value={option}
                  onChange={(e) => {
                    const options = [...(field.options || [])];
                    options[index] = e.target.value;
                    onUpdate({ options });
                  }}
                  placeholder={`Option ${index + 1}`}
                  className="h-6 text-[10px] flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const options = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options });
                  }}
                  className="h-6 w-6"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SchemaPanel({ open, onOpenChange, fields, onFieldsChange }: SchemaPanelProps) {
  const normalizeFields = (sourceFields: TableField[]): TableField[] => {
    const seenIds = new Set<string>();
    return sourceFields.map((field, index) => {
      let id = field.id;
      if (!id || seenIds.has(id)) {
        id = `${field.name || 'field'}_${index}_${Date.now()}`;
      }
      seenIds.add(id);
      return { ...field, id };
    });
  };

  const [localFields, setLocalFields] = useState<TableField[]>(() => normalizeFields(fields));

  useEffect(() => {
    if (open) {
      setLocalFields(normalizeFields(fields));
    }
  }, [open, fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalFields((fields) => {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      
      const newFields = [...fields];
      const [movedField] = newFields.splice(oldIndex, 1);
      newFields.splice(newIndex, 0, movedField);
      
      return newFields;
    });
  };

  const addField = () => {
    const newField: TableField = {
      id: `field_${Date.now()}`,
      name: `Field ${localFields.length + 1}`,
      type: 'text',
    };
    setLocalFields([...localFields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<TableField>) => {
    setLocalFields(localFields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const deleteField = (fieldId: string) => {
    setLocalFields(localFields.filter(f => f.id !== fieldId));
  };

  const handleSave = () => {
    onFieldsChange(localFields);
    toast.success('Schema updated successfully');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Schema Editor</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button onClick={addField} size="sm" className="w-full h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Field
          </Button>

          <ScrollArea className="h-[350px] pr-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {localFields.map((field) => {
                    const fieldId = field.id;
                    return (
                      <SortableField
                        key={fieldId}
                        field={field}
                        onUpdate={(updates) => updateField(fieldId, updates)}
                        onDelete={() => deleteField(fieldId)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>

          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} size="sm" className="flex-1 h-8 text-xs">
              Save Changes
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="flex-1 h-8 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
