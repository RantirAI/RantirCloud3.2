import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableField } from "@/services/tableService";
import { FileUploader } from "./FileUploader";
import { generateRecordId } from "@/utils/generateRecordId";

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

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: any) => void;
  tableFields: TableField[];
}

export function AddRecordModal({ isOpen, onClose, onSave, tableFields }: AddRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Auto-populate timestamp fields
      const timestampData: Record<string, any> = {};
      tableFields.forEach(field => {
        if (field.type === 'timestamp') {
          timestampData[field.name] = new Date().toISOString();
        }
      });

      const newRecord = {
        id: generateRecordId(formData, { fields: tableFields }),
        ...formData,
        ...timestampData,
        created_at: new Date().toISOString()
      };
      
      onSave(newRecord);
      setFormData({});
      onClose();
    } catch (error) {
      console.error("Error adding record:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderFieldInput = (field: TableField) => {
    if (field.name === 'id' || field.system || field.type === 'timestamp') return null;

    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            minLength={field.options?.minLength}
            maxLength={field.options?.maxLength}
            pattern={field.options?.pattern}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            rows={3}
            minLength={field.options?.minLength}
            maxLength={field.options?.maxLength}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${field.name}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label>Yes</Label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'select':
        const selectOptions = normalizeFieldOptions(field.options);
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
          >
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

      case 'multiselect':
        const multiselectOptions = normalizeFieldOptions(field.options);
        const selectedValues = Array.isArray(value)
          ? value
              .map((v: any) => {
                if (v && typeof v === 'object' && 'value' in v) return String(v.value);
                return String(v);
              })
              .filter(Boolean)
          : [];
        return (
          <div className="space-y-2">
            {multiselectOptions.map((option, index) => (
              <div key={`${option.value}-${index}`} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value);
                    handleFieldChange(field.name, newValues);
                  }}
                />
                <Label className="font-normal">{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'image':
      case 'pdf':
        return (
          <FileUploader
            type={field.type}
            value={value}
            onChange={(url) => handleFieldChange(field.name, url)}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Record</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {tableFields
            .filter(field => field.name !== 'id' && !field.system)
            .map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderFieldInput(field)}
              </div>
            ))}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}