import React from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { PageParameter } from '@/types/appBuilder';

interface ParameterMapperProps {
  pageId: string;
  parameterValues: Record<string, any>;
  onParameterChange: (parameterName: string, value: any) => void;
}

export function ParameterMapper({ pageId, parameterValues, onParameterChange }: ParameterMapperProps) {
  const { currentProject } = useAppBuilderStore();

  if (!currentProject) return null;

  const targetPage = currentProject.pages.find(page => page.id === pageId);
  if (!targetPage || !targetPage.parameters || targetPage.parameters.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        This page has no parameters to configure.
      </div>
    );
  }

  const renderParameterInput = (param: PageParameter) => {
    const value = parameterValues[param.name] || param.defaultValue || '';

    return (
      <div key={param.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium">{param.name}</Label>
          <Badge variant="outline" className="text-xs">
            {param.type}
          </Badge>
          {param.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        
        {param.type === 'boolean' ? (
          <Select
            value={String(value)}
            onValueChange={(val) => onParameterChange(param.name, val === 'true')}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8"
            type={param.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => {
              const newValue = param.type === 'number' 
                ? parseFloat(e.target.value) || 0
                : e.target.value;
              onParameterChange(param.name, newValue);
            }}
            placeholder={param.description || `Enter ${param.name}`}
          />
        )}
        
        {param.description && (
          <p className="text-xs text-muted-foreground">{param.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Page Parameters</Label>
        <Badge variant="secondary" className="text-xs">
          {targetPage.parameters.length} parameter{targetPage.parameters.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {targetPage.parameters.map(renderParameterInput)}
      </div>
    </div>
  );
}