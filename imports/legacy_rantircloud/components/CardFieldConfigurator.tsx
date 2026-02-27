import React, { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableField } from "@/services/tableService";
import { FormField } from "./FormField";
import { Settings2 } from "lucide-react";

interface CardFieldConfiguratorProps {
  fields: TableField[];
  visibleFields: string[];
  onFieldsReorder: (fields: TableField[]) => void;
  onToggleFieldVisibility: (fieldId: string) => void;
  onUpdateField: (fieldId: string, updates: Partial<TableField>) => void;
}

export function CardFieldConfigurator({
  fields,
  visibleFields,
  onFieldsReorder,
  onToggleFieldVisibility,
  onUpdateField
}: CardFieldConfiguratorProps) {
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(field => field.id === active.id);
      const newIndex = fields.findIndex(field => field.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = [...fields];
        const [movedField] = newFields.splice(oldIndex, 1);
        newFields.splice(newIndex, 0, movedField);
        onFieldsReorder(newFields);
      }
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-4 w-4" />
        <h3 className="text-sm font-medium">Card Field Configuration</h3>
      </div>
      
      <ScrollArea className="h-[400px]">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field) => (
                <FormField
                  key={field.id}
                  field={field}
                  isActive={activeField === field.id}
                  visible={visibleFields.includes(field.id)}
                  onToggleVisibility={() => onToggleFieldVisibility(field.id)}
                  onUpdateField={(updates) => onUpdateField(field.id, updates)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </Card>
  );
}