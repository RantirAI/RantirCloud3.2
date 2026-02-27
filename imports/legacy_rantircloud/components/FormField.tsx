
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TableField } from "@/services/tableService";
import { GripVertical, Eye, EyeOff } from "lucide-react";

interface FormFieldProps {
  field: TableField;
  isActive: boolean;
  visible: boolean;
  onToggleVisibility: () => void;
  onUpdateField: (updates: Partial<TableField>) => void;
}

export function FormField({ field, isActive, visible, onToggleVisibility, onUpdateField }: FormFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`border p-2 ${isActive ? 'bg-accent' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical size={14} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-medium text-sm truncate">{field.name}</div>
              <div className="text-xs text-muted-foreground">{field.type}</div>
            </div>
            <div 
              onClick={onToggleVisibility}
              className="cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              {visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </div>
          </div>
        </div>
      </div>
      
      {visible && (
        <div className="mt-2 space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${field.id}-required`} className="text-xs">Required</Label>
            <Checkbox
              id={`${field.id}-required`}
              checked={field.required}
              onCheckedChange={(checked) => onUpdateField({ required: !!checked })}
            />
          </div>
          
          <div>
            <Label htmlFor={`${field.id}-description`} className="text-xs">Help Text</Label>
            <Input 
              id={`${field.id}-description`}
              value={field.description || ""}
              onChange={(e) => onUpdateField({ description: e.target.value })}
              placeholder="Field description or help text"
              className="text-xs"
              size={1}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
