import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface QueryParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string;
}

interface QueryParamsEditorProps {
  value: QueryParam[];
  onChange: (params: QueryParam[]) => void;
}

export function QueryParamsEditor({ value = [], onChange }: QueryParamsEditorProps) {
  const params = Array.isArray(value) ? value : [];

  const addParam = () => {
    onChange([...params, { name: '', type: 'string', required: false, defaultValue: '' }]);
  };

  const updateParam = (index: number, field: keyof QueryParam, newValue: any) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  const removeParam = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  const getPreviewUrl = () => {
    if (params.length === 0) return '';
    const queryParts = params
      .filter(p => p.name)
      .map(p => `${p.name}=${p.defaultValue || `<${p.type}>`}`);
    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  };

  return (
    <div className="space-y-3">
      {params.length > 0 && (
        <div className="space-y-2">
          {params.map((param, index) => (
            <div 
              key={index} 
              className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/30"
            >
              <div className="flex-shrink-0 pt-2 text-muted-foreground/50 cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Name</Label>
                    <Input
                      placeholder="paramName"
                      value={param.name}
                      onChange={(e) => updateParam(index, 'name', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Type</Label>
                    <Select 
                      value={param.type} 
                      onValueChange={(val) => updateParam(index, 'type', val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Default Value</Label>
                    <Input
                      placeholder="optional"
                      value={param.defaultValue || ''}
                      onChange={(e) => updateParam(index, 'defaultValue', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={param.required}
                        onCheckedChange={(checked) => updateParam(index, 'required', checked)}
                        className="scale-75"
                      />
                      <Label className="text-xs text-muted-foreground">Required</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeParam(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={addParam}
        className="w-full h-8 text-xs"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Parameter
      </Button>

      {params.length > 0 && getPreviewUrl() && (
        <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border/30">
          <Label className="text-[10px] text-muted-foreground uppercase">Preview</Label>
          <code className="block text-xs text-primary mt-1 break-all">
            {getPreviewUrl()}
          </code>
        </div>
      )}
    </div>
  );
}
