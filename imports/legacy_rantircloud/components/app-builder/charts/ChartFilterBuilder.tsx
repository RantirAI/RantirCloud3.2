import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Filter } from 'lucide-react';

export interface ChartFilter {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';
  value: string;
  enabled: boolean;
}

export interface ChartFilterGroup {
  id: string;
  filters: ChartFilter[];
  logic: 'AND' | 'OR';
}

interface ChartFilterBuilderProps {
  fields: Array<{ name: string; type?: string; id?: string }>;
  filters: ChartFilterGroup[];
  onChange: (filters: ChartFilterGroup[]) => void;
}

const operatorOptions: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: 'eq', label: 'equals' },
    { value: 'ne', label: 'not equals' },
    { value: 'gt', label: 'greater than' },
    { value: 'lt', label: 'less than' },
    { value: 'gte', label: 'greater or equal' },
    { value: 'lte', label: 'less or equal' },
    { value: 'contains', label: 'contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'ne', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
    { value: 'isEmpty', label: 'is empty' },
    { value: 'isNotEmpty', label: 'is not empty' }
  ],
  date: [
    { value: 'eq', label: 'on' },
    { value: 'gt', label: 'after' },
    { value: 'lt', label: 'before' },
    { value: 'gte', label: 'on or after' },
    { value: 'lte', label: 'on or before' }
  ],
  boolean: [
    { value: 'eq', label: 'is' },
    { value: 'ne', label: 'is not' }
  ]
};

export function ChartFilterBuilder({ fields, filters, onChange }: ChartFilterBuilderProps) {
  const getFieldType = (fieldName: string): string => {
    const field = fields.find(f => f.name === fieldName || f.id === fieldName);
    return field?.type || 'text';
  };

  const addFilterGroup = () => {
    const newGroup: ChartFilterGroup = {
      id: `group-${Date.now()}`,
      filters: [],
      logic: 'AND'
    };
    onChange([...filters, newGroup]);
  };

  const updateFilterGroup = (groupId: string, updates: Partial<ChartFilterGroup>) => {
    onChange(filters.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const removeFilterGroup = (groupId: string) => {
    onChange(filters.filter(g => g.id !== groupId));
  };

  const addFilter = (groupId: string) => {
    const firstField = fields[0]?.name || fields[0]?.id || '';
    const newFilter: ChartFilter = {
      id: `filter-${Date.now()}`,
      field: firstField,
      operator: 'eq',
      value: '',
      enabled: true
    };
    onChange(filters.map(g => 
      g.id === groupId ? { ...g, filters: [...g.filters, newFilter] } : g
    ));
  };

  const updateFilter = (groupId: string, filterId: string, updates: Partial<ChartFilter>) => {
    onChange(filters.map(g => 
      g.id === groupId 
        ? { ...g, filters: g.filters.map(f => f.id === filterId ? { ...f, ...updates } : f) }
        : g
    ));
  };

  const removeFilter = (groupId: string, filterId: string) => {
    onChange(filters.map(g => 
      g.id === groupId ? { ...g, filters: g.filters.filter(f => f.id !== filterId) } : g
    ));
  };

  const needsValue = (operator: string) => !['isEmpty', 'isNotEmpty'].includes(operator);

  if (fields.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Filter className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>Connect a data source first to add filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filters.map((group, groupIndex) => (
        <div key={group.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">WHERE</Badge>
              {groupIndex > 0 && (
                <Select
                  value={group.logic}
                  onValueChange={(v: 'AND' | 'OR') => updateFilterGroup(group.id, { logic: v })}
                >
                  <SelectTrigger className="h-6 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addFilter(group.id)}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeFilterGroup(group.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {group.filters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Click "Add" to create a condition</p>
          ) : (
            <div className="space-y-2">
              {group.filters.map((filter, idx) => {
                const fieldType = getFieldType(filter.field);
                const operators = operatorOptions[fieldType] || operatorOptions.text;

                return (
                  <div key={filter.id} className="space-y-1">
                    {idx > 0 && (
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-[10px]">{group.logic}</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={filter.enabled}
                        onCheckedChange={(enabled) => updateFilter(group.id, filter.id, { enabled })}
                        className="scale-75"
                      />
                      <Select
                        value={filter.field}
                        onValueChange={(field) => updateFilter(group.id, filter.id, { field })}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(f => (
                            <SelectItem key={f.name || f.id} value={f.name || f.id || ''}>
                              {f.name || f.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={filter.operator}
                        onValueChange={(op: any) => updateFilter(group.id, filter.id, { operator: op })}
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map(op => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {needsValue(filter.operator) && (
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(group.id, filter.id, { value: e.target.value })}
                          placeholder="value"
                          className="h-7 text-xs flex-1"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => removeFilter(group.id, filter.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addFilterGroup} className="w-full text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Add Filter Group
      </Button>

      {filters.length > 0 && filters.some(g => g.filters.length > 0) && (
        <div className="p-2 bg-muted/50 rounded text-xs font-mono">
          <span className="text-muted-foreground">Query: </span>
          <span className="text-primary">
            SELECT * WHERE{' '}
            {filters.map((g, gi) => 
              g.filters.filter(f => f.enabled).map((f, fi) => 
                `${fi > 0 ? ` ${g.logic} ` : ''}${f.field} ${f.operator} ${needsValue(f.operator) ? `"${f.value}"` : ''}`
              ).join('')
            ).filter(Boolean).join(' AND ')}
          </span>
        </div>
      )}
    </div>
  );
}
