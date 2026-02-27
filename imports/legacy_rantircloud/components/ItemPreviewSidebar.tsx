import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TableField, TableRecord } from "@/services/tableService";
import { SchemaTypeIcon } from "./SchemaTypeIcon";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Eye, EyeOff, GripVertical, File, X } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ItemPreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  record: TableRecord | null;
  tableSchema: {
    fields: TableField[];
  };
  visibleFields: string[];
  onEdit?: (recordId: string, updates: any) => void;
  onDelete?: (recordId: string) => void;
  onFieldsReorder?: (fields: TableField[]) => void;
  onToggleFieldVisibility?: (fieldId: string) => void;
}

// Helper function to get field value using both field name and field ID
const getFieldValue = (record: TableRecord, field: TableField): any => {
  if (!record || !field) return undefined;
  return record[field.name] !== undefined ? record[field.name] : record[field.id];
};

// Strip HTML tags from rich text content
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

// Sortable field item component
function SortableFieldItem({ 
  field, 
  record, 
  visible, 
  onToggleVisibility, 
  onFieldChange,
  formData 
}: { 
  field: TableField; 
  record: TableRecord; 
  visible: boolean; 
  onToggleVisibility: () => void;
  onFieldChange: (fieldName: string, value: any) => void;
  formData: Record<string, any>;
}) {
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

  const value = formData[field.name] !== undefined ? formData[field.name] : getFieldValue(record, field);

  const renderFieldInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'password':
        return (
          <Input
            type="password"
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            rows={3}
          />
        );
      case 'codescript':
        const displayValue = typeof value === 'string' ? stripHtmlTags(value) : '';
        return (
          <Textarea
            value={displayValue}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            rows={4}
            className="font-mono text-sm"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => onFieldChange(field.name, checked)}
            />
            <Label>{field.description || "Enable this option"}</Label>
          </div>
        );
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(newValue) => onFieldChange(field.name, newValue)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options) && field.options.map((option, index) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
          />
        );
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
    }
  };

  const renderFieldValue = () => {
    if (!visible) return null;

    switch (field.type) {
      case "boolean":
        return <Checkbox checked={value === true} disabled />;
      case "select":
        return value ? <Badge variant="outline">{value}</Badge> : <span className="text-muted-foreground">-</span>;
      case "image":
        return value ? (
          <div className="w-full max-w-sm">
            <img 
              src={value} 
              alt="Field image" 
              className="w-full h-auto rounded-md border"
            />
          </div>
        ) : <span className="text-muted-foreground">-</span>;
      case "pdf":
        return value ? (
          <div className="flex items-center gap-2">
            <File className="h-5 w-5 text-red-500" />
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View PDF
            </a>
          </div>
        ) : <span className="text-muted-foreground">-</span>;
      case "codescript":
        const displayText = typeof value === 'string' ? stripHtmlTags(value) : '';
        return (
          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto text-sm font-mono bg-muted p-2 rounded">
            {displayText || <span className="text-muted-foreground">-</span>}
          </div>
        );
      case "textarea":
        return (
          <div className="whitespace-pre-wrap max-h-32 overflow-y-auto text-sm">
            {value || <span className="text-muted-foreground">-</span>}
          </div>
        );
      case "date":
        if (!value) return <span className="text-muted-foreground">-</span>;
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }
      default:
        return <span className="break-words">{value ? String(value) : <span className="text-muted-foreground">-</span>}</span>;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="border mb-2"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
          >
            <GripVertical size={14} />
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <SchemaTypeIcon type={field.type} size={16} />
            <span className="font-medium text-sm">{field.name}</span>
            {field.required && <span className="text-destructive text-xs">*</span>}
          </div>
          
          <div 
            onClick={onToggleVisibility}
            className="cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </div>
        </div>

        {visible && (
          <div className="space-y-3">
            <div className="text-sm">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Current Value</Label>
              {renderFieldValue()}
            </div>
            
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Edit Value</Label>
              {renderFieldInput()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ItemPreviewSidebar({
  isOpen,
  onClose,
  record,
  tableSchema,
  visibleFields,
  onEdit,
  onDelete,
  onFieldsReorder,
  onToggleFieldVisibility
}: ItemPreviewSidebarProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  React.useEffect(() => {
    if (record) {
      const initialData: Record<string, any> = {};
      tableSchema.fields.forEach(field => {
        const value = getFieldValue(record, field);
        initialData[field.name] = value;
      });
      setFormData(initialData);
    }
  }, [record, tableSchema.fields]);
  
  if (!record) return null;

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = async () => {
    if (!record || !onEdit) return;

    setIsLoading(true);
    try {
      await onEdit(record.id, formData);
      toast("Record updated successfully");
    } catch (error) {
      toast("Failed to update record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onFieldsReorder) {
      const oldIndex = tableSchema.fields.findIndex(field => field.id === active.id);
      const newIndex = tableSchema.fields.findIndex(field => field.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = [...tableSchema.fields];
        const [movedField] = newFields.splice(oldIndex, 1);
        newFields.splice(newIndex, 0, movedField);
        onFieldsReorder(newFields);
      }
    }
  };

  const getRecordTitle = () => {
    // Try to find a meaningful title field
    const titleField = tableSchema.fields.find(f => 
      f.type === 'text' && (
        f.name.toLowerCase().includes('title') || 
        f.name.toLowerCase().includes('name')
      )
    );
    
    if (titleField) {
      const titleValue = getFieldValue(record, titleField);
      if (titleValue) return String(titleValue);
    }
    
    // Fallback to first text field
    const firstTextField = tableSchema.fields.find(f => f.type === 'text');
    if (firstTextField) {
      const value = getFieldValue(record, firstTextField);
      if (value) return String(value);
    }
    
    return `Record ${record.id.slice(0, 8)}...`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[500px] mt-[38px] rounded-tl-none rounded-tr-none" showCloseButton={false}>
        <SheetHeader className="bg-background dark:bg-background border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="truncate text-foreground">{getRecordTitle()}</span>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="text-foreground dark:text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                {isLoading ? "Saving..." : "Save"}
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this record?")) {
                      onDelete(record.id);
                      onClose();
                    }
                  }}
                  className="text-foreground dark:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 px-6 flex-1 min-h-0">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Edit Record</h3>
            <p className="text-xs text-muted-foreground">Drag to reorder, click eye to hide fields</p>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext 
                items={tableSchema.fields.map(f => f.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {tableSchema.fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      record={record}
                      visible={visibleFields.includes(field.id)}
                      onToggleVisibility={() => onToggleFieldVisibility?.(field.id)}
                      onFieldChange={handleFieldChange}
                      formData={formData}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}