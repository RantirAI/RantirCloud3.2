import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Variable, 
  Hash, 
  ToggleLeft, 
  Braces, 
  List, 
  Calendar,
  Zap,
  Globe,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react';
import { useVariableStore } from '@/stores/variableStore';
import { VariableDataType, VariableScope, getDefaultValueForType } from '@/types/variables';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVariable?: any;
  defaultScope: VariableScope;
  projectId: string;
  pageId?: string;
  userId: string;
  onSuccess: () => void;
}

const dataTypes: { value: VariableDataType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'string', label: 'String', icon: <Variable className="h-4 w-4" />, description: 'Text values' },
  { value: 'number', label: 'Number', icon: <Hash className="h-4 w-4" />, description: 'Numeric values' },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft className="h-4 w-4" />, description: 'True/False' },
  { value: 'object', label: 'Object', icon: <Braces className="h-4 w-4" />, description: 'Key-value pairs' },
  { value: 'array', label: 'Array', icon: <List className="h-4 w-4" />, description: 'List of items' },
  { value: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" />, description: 'Date/time values' },
];

export function AddVariableDialog({
  open,
  onOpenChange,
  editingVariable,
  defaultScope,
  projectId,
  pageId,
  userId,
  onSuccess
}: AddVariableDialogProps) {
  const { createVariable, updateVariableDefinition } = useVariableStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState<VariableDataType>('string');
  const [scope, setScope] = useState<VariableScope>(defaultScope);
  const [initialValue, setInitialValue] = useState<any>('');
  const [isComputed, setIsComputed] = useState(false);
  const [formula, setFormula] = useState('');
  const [preserveOnNavigation, setPreserveOnNavigation] = useState(true);
  const [persistToStorage, setPersistToStorage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingVariable) {
      setName(editingVariable.name || '');
      setDescription(editingVariable.description || '');
      setDataType(editingVariable.dataType || 'string');
      setScope(editingVariable.scope || defaultScope);
      setInitialValue(editingVariable.initialValue ?? '');
      setIsComputed(editingVariable.isComputed || false);
      setFormula(editingVariable.formula || '');
      setPreserveOnNavigation(editingVariable.preserveOnNavigation ?? true);
      setPersistToStorage(editingVariable.persistToStorage ?? false);
    } else {
      resetForm();
    }
  }, [editingVariable, open, defaultScope]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDataType('string');
    setScope(defaultScope);
    setInitialValue('');
    setIsComputed(false);
    setFormula('');
    setPreserveOnNavigation(true);
    setPersistToStorage(false);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Variable name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      newErrors.name = 'Name must start with a letter or underscore and contain only letters, numbers, and underscores';
    }
    
    if (scope === 'page' && !pageId) {
      newErrors.scope = 'Page scope requires a selected page';
    }
    
    if (isComputed && !formula.trim()) {
      newErrors.formula = 'Formula is required for computed variables';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseInitialValue = (): any => {
    if (initialValue === '' || initialValue === null || initialValue === undefined) {
      return getDefaultValueForType(dataType);
    }
    
    switch (dataType) {
      case 'number':
        return parseFloat(initialValue) || 0;
      case 'boolean':
        return initialValue === 'true' || initialValue === true;
      case 'object':
      case 'array':
        try {
          return typeof initialValue === 'string' ? JSON.parse(initialValue) : initialValue;
        } catch {
          return dataType === 'array' ? [] : {};
        }
      case 'date':
        return initialValue || new Date().toISOString();
      default:
        return String(initialValue);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    
    try {
      const parsedValue = parseInitialValue();
      
      if (editingVariable) {
        await updateVariableDefinition(editingVariable.id, scope, {
          name,
          dataType,
          initialValue: parsedValue,
          description,
          formula: isComputed ? formula : undefined,
          preserveOnNavigation: scope === 'app' ? preserveOnNavigation : undefined,
          persistToStorage: scope === 'page' ? persistToStorage : undefined
        });
        toast.success('Variable updated successfully');
      } else {
        await createVariable({
          scope,
          name,
          dataType,
          initialValue: parsedValue,
          description,
          isComputed,
          formula: isComputed ? formula : undefined,
          preserveOnNavigation: scope === 'app' ? preserveOnNavigation : undefined,
          persistToStorage: scope === 'page' ? persistToStorage : undefined,
          appProjectId: projectId,
          pageId: scope === 'page' ? pageId : undefined,
          userId,
          isActive: true
        });
        toast.success('Variable created successfully');
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving variable:', error);
      toast.error('Failed to save variable');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitialValuePlaceholder = (): string => {
    switch (dataType) {
      case 'string': return 'Enter text value...';
      case 'number': return '0';
      case 'boolean': return 'true or false';
      case 'object': return '{"key": "value"}';
      case 'array': return '["item1", "item2"]';
      case 'date': return 'YYYY-MM-DD';
      default: return 'Enter value...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5" />
            {editingVariable ? 'Edit Variable' : 'Create Variable'}
          </DialogTitle>
          <DialogDescription>
            {editingVariable 
              ? 'Update the variable properties below'
              : 'Define a new variable for your application'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scope Selection */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scope === 'app' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => setScope('app')}
                disabled={!!editingVariable}
              >
                <Globe className="h-4 w-4" />
                App
              </Button>
              <Button
                type="button"
                variant={scope === 'page' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => setScope('page')}
                disabled={!!editingVariable || !pageId}
              >
                <FileText className="h-4 w-4" />
                Page
              </Button>
            </div>
            {errors.scope && (
              <p className="text-xs text-destructive">{errors.scope}</p>
            )}
          </div>

          {/* Variable Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="myVariable"
              className={cn(errors.name && "border-destructive")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            {name && (
              <p className="text-xs text-muted-foreground">
                Binding: <code className="bg-muted px-1 rounded">{`{{${scope}.${name}}}`}</code>
              </p>
            )}
          </div>

          {/* Data Type */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {dataTypes.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={dataType === type.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-1.5 h-9"
                  onClick={() => {
                    setDataType(type.value);
                    setInitialValue(getDefaultValueForType(type.value));
                  }}
                >
                  {type.icon}
                  <span className="text-xs">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Computed Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Computed Variable
              </Label>
              <p className="text-xs text-muted-foreground">
                Calculate value using a formula
              </p>
            </div>
            <Switch
              checked={isComputed}
              onCheckedChange={setIsComputed}
            />
          </div>

          {/* Initial Value or Formula */}
          {isComputed ? (
            <div className="space-y-2">
              <Label htmlFor="formula">Formula</Label>
              <Textarea
                id="formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="app.price * app.quantity"
                className={cn("font-mono text-sm min-h-[80px]", errors.formula && "border-destructive")}
              />
              {errors.formula && (
                <p className="text-xs text-destructive">{errors.formula}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use JavaScript expressions. Access other variables with app.varName or page.varName
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="initialValue">Initial Value</Label>
              {dataType === 'boolean' ? (
                <Select 
                  value={String(initialValue)} 
                  onValueChange={(v) => setInitialValue(v === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (dataType === 'object' || dataType === 'array') ? (
                <Textarea
                  id="initialValue"
                  value={typeof initialValue === 'string' ? initialValue : JSON.stringify(initialValue, null, 2)}
                  onChange={(e) => setInitialValue(e.target.value)}
                  placeholder={getInitialValuePlaceholder()}
                  className="font-mono text-sm min-h-[80px]"
                />
              ) : (
                <Input
                  id="initialValue"
                  type={dataType === 'number' ? 'number' : 'text'}
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  placeholder={getInitialValuePlaceholder()}
                />
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this variable"
            />
          </div>

          {/* Persistence Options */}
          {scope === 'app' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Preserve on Navigation</Label>
                <p className="text-xs text-muted-foreground">
                  Keep value when changing pages
                </p>
              </div>
              <Switch
                checked={preserveOnNavigation}
                onCheckedChange={setPreserveOnNavigation}
              />
            </div>
          )}

          {scope === 'page' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Persist to Storage</Label>
                <p className="text-xs text-muted-foreground">
                  Save value in browser storage
                </p>
              </div>
              <Switch
                checked={persistToStorage}
                onCheckedChange={setPersistToStorage}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : (editingVariable ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
