import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Loader2, Settings } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableField, TableRecord } from '@/services/tableService';

interface AddRecordModalProps {
  open: boolean;
  onClose: () => void;
  fields: TableField[];
  onSave: (record: Partial<TableRecord>) => Promise<void>;
  selectedFields?: string[];
  onFieldSelectionChange?: (fieldNames: string[]) => void;
}

export function AddRecordModal({ 
  open, 
  onClose, 
  fields, 
  onSave, 
  selectedFields = [], 
  onFieldSelectionChange 
}: AddRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [internalSelectedFields, setInternalSelectedFields] = useState<string[]>([]);

  useEffect(() => {
    if (selectedFields.length > 0) {
      setInternalSelectedFields(selectedFields);
    } else {
      // Default to all non-system fields
      setInternalSelectedFields(fields.filter(f => !f.system).map(f => f.name));
    }
  }, [fields, selectedFields]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      setFormData({});
      onClose();
    } catch (error) {
      console.error('Failed to save record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const newSelection = checked 
      ? [...internalSelectedFields, fieldName]
      : internalSelectedFields.filter(name => name !== fieldName);
    
    setInternalSelectedFields(newSelection);
    onFieldSelectionChange?.(newSelection);
  };

  const renderField = (field: TableField) => {
    if (field.system) return null; // Skip system fields like 'id'
    if (!internalSelectedFields.includes(field.name)) return null; // Skip unselected fields
    
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type === 'email' ? 'email' : 'text'}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}`}
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="password"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}`}
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || '')}
              placeholder={`Enter ${field.name}`}
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}`}
              required={field.required}
              rows={3}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name}
            </Label>
            <div className="flex items-center space-x-2">
              <Switch
                id={field.name}
                checked={!!value}
                onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              />
              <Label htmlFor={field.name} className="text-sm text-muted-foreground">
                {value ? 'Yes' : 'No'}
              </Label>
            </div>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(selectedValue) => handleFieldChange(field.name, selectedValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.name}`} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(field.options) && field.options.map((option: any, index: number) => (
                  <SelectItem key={index} value={option.value || option}>
                    {option.label || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => handleFieldChange(field.name, date?.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'json':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(field.name, parsed);
                } catch {
                  handleFieldChange(field.name, e.target.value);
                }
              }}
              placeholder={`Enter ${field.name} as JSON`}
              required={field.required}
              rows={4}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.name} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.name}`}
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
    }
  };

  const visibleFields = fields.filter(f => !f.system && internalSelectedFields.includes(f.name));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Record</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="form" className="w-full">
          <TabsList className="w-fit">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="fields">
              <Settings className="h-4 w-4 mr-2" />
              Field Selection
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="form" className="space-y-4">
            {visibleFields.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleFields.map(renderField)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No fields selected. Go to Field Selection tab to choose fields.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="fields" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select fields to show in the form:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {fields.filter(f => !f.system).map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={internalSelectedFields.includes(field.name)}
                      onCheckedChange={(checked) => handleFieldToggle(field.name, !!checked)}
                    />
                    <Label htmlFor={field.name} className="text-sm">
                      {field.name}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}