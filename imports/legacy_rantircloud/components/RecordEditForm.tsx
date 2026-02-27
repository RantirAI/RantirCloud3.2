import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TableField, TableRecord } from "@/services/tableService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";

type NormalizedOption = { label: string; value: string };

function normalizeFieldOptions(options: any): NormalizedOption[] {
  const arr = Array.isArray(options) ? options : [];
  return arr.map((opt: any) => {
    if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
      return { label: String(opt), value: String(opt) };
    }
    if (opt && typeof opt === 'object' && 'label' in opt && 'value' in opt) {
      return { label: String(opt.label), value: String(opt.value) };
    }
    return { label: String(opt), value: String(opt) };
  });
}

interface RecordEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  record: TableRecord | null;
  tableSchema: {
    fields: TableField[];
  };
  onSave: (recordId: string, updates: any) => void;
}

export function RecordEditForm({
  isOpen,
  onClose,
  record,
  tableSchema,
  onSave
}: RecordEditFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (record) {
      const initialData: Record<string, any> = {};
      tableSchema.fields.forEach(field => {
        const value = record[field.name] !== undefined ? record[field.name] : record[field.id];
        initialData[field.name] = value;
      });
      setFormData(initialData);
    }
  }, [record, tableSchema.fields]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setIsLoading(true);
    try {
      await onSave(record.id, formData);
      toast("Record updated successfully");
      onClose();
    } catch (error) {
      toast("Failed to update record");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFieldInput = (field: TableField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            rows={3}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label>{field.description || "Check to enable"}</Label>
          </div>
        );
      case 'select':
        const selectOptions = normalizeFieldOptions(field.options);
        return (
          <Select value={value} onValueChange={(newValue) => handleFieldChange(field.name, newValue)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option, index) => (
                <SelectItem key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
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
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
      case 'codescript':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
            rows={6}
            className="font-mono"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.description || `Enter ${field.name}`}
          />
        );
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {tableSchema.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    {field.name}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderFieldInput(field)}
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}