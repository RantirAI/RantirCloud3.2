import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  X,
  ArrowLeft
} from 'lucide-react';
import { useVariableStore } from '@/stores/variableStore';
import { VariableDataType, VariableScope, getDefaultValueForType } from '@/types/variables';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VariableFormPanelProps {
  editingVariable?: any;
  defaultScope: VariableScope;
  projectId: string;
  pageId?: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const dataTypes: { value: VariableDataType; label: string; icon: React.ReactNode }[] = [
  { value: 'string', label: 'String', icon: <Variable className="h-3.5 w-3.5" /> },
  { value: 'number', label: 'Number', icon: <Hash className="h-3.5 w-3.5" /> },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft className="h-3.5 w-3.5" /> },
  { value: 'object', label: 'Object', icon: <Braces className="h-3.5 w-3.5" /> },
  { value: 'array', label: 'Array', icon: <List className="h-3.5 w-3.5" /> },
  { value: 'date', label: 'Date', icon: <Calendar className="h-3.5 w-3.5" /> },
];

export function VariableFormPanel({
  editingVariable,
  defaultScope,
  projectId,
  pageId,
  userId,
  onSuccess,
  onCancel
}: VariableFormPanelProps) {
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
  }, [editingVariable, defaultScope]);

  const resetForm = () => {
    setName('myVariable');
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
      newErrors.name = 'Name must start with a letter or underscore';
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 shrink-0"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {editingVariable ? 'Edit Variable' : 'Create Variable'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          Define a new variable for your application
        </p>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Scope Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scope === 'app' ? 'default' : 'outline'}
                size="sm"
                className="justify-center gap-2 h-9"
                onClick={() => setScope('app')}
                disabled={!!editingVariable}
              >
                <Globe className="h-3.5 w-3.5" />
                App
              </Button>
              <Button
                type="button"
                variant={scope === 'page' ? 'default' : 'outline'}
                size="sm"
                className="justify-center gap-2 h-9"
                onClick={() => setScope('page')}
                disabled={!!editingVariable || !pageId}
              >
                <FileText className="h-3.5 w-3.5" />
                Page
              </Button>
            </div>
            {errors.scope && (
              <p className="text-xs text-destructive">{errors.scope}</p>
            )}
          </div>

          {/* Variable Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="myVariable"
              className={cn("h-9 text-sm", errors.name && "border-destructive")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Data Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {dataTypes.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={dataType === type.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-center gap-1.5 h-8 text-xs"
                  onClick={() => {
                    setDataType(type.value);
                    setInitialValue(getDefaultValueForType(type.value));
                  }}
                >
                  {type.icon}
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Computed Toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formula</Label>
              <Textarea
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="app.price * app.quantity"
                className={cn("font-mono text-xs min-h-[80px]", errors.formula && "border-destructive")}
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Initial Value</Label>
              {dataType === 'boolean' ? (
                <Select 
                  value={String(initialValue)} 
                  onValueChange={(v) => setInitialValue(v === 'true')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (dataType === 'object' || dataType === 'array') ? (
                <Textarea
                  value={typeof initialValue === 'string' ? initialValue : JSON.stringify(initialValue, null, 2)}
                  onChange={(e) => setInitialValue(e.target.value)}
                  placeholder={getInitialValuePlaceholder()}
                  className="font-mono text-xs min-h-[80px]"
                />
              ) : (
                <Input
                  type={dataType === 'number' ? 'number' : 'text'}
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  placeholder={getInitialValuePlaceholder()}
                  className="h-9 text-sm"
                />
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this variable"
              className="h-9 text-sm"
            />
          </div>

          {/* Persistence Options */}
          {scope === 'app' && (
            <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm">Preserve on Navigation</Label>
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
            <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm">Persist to Storage</Label>
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
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : (editingVariable ? 'Update' : 'Create')}
        </Button>
      </div>
    </div>
  );
}
