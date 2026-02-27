import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Filter } from 'lucide-react';

export interface DataFilter {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';
  value: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  enabled: boolean;
}

export interface FilterGroup {
  id: string;
  filters: DataFilter[];
  logic: 'AND' | 'OR';
}

interface DataFilterBuilderProps {
  schema: any;
  currentFilters: FilterGroup[];
  onFiltersChange: (filters: FilterGroup[]) => void;
}

export function DataFilterBuilder({ schema, currentFilters, onFiltersChange }: DataFilterBuilderProps) {
  const availableFields = schema?.fields || [];
  const fields = Array.isArray(availableFields) ? availableFields : Object.keys(availableFields).map(key => ({ name: key, type: 'text' }));

  const operatorOptions = {
    text: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' },
      { value: 'isEmpty', label: 'Is empty' },
      { value: 'isNotEmpty', label: 'Is not empty' }
    ],
    number: [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not equals' },
      { value: 'gt', label: 'Greater than' },
      { value: 'lt', label: 'Less than' },
      { value: 'gte', label: 'Greater than or equal' },
      { value: 'lte', label: 'Less than or equal' },
      { value: 'isEmpty', label: 'Is empty' },
      { value: 'isNotEmpty', label: 'Is not empty' }
    ],
    date: [
      { value: 'eq', label: 'On date' },
      { value: 'ne', label: 'Not on date' },
      { value: 'gt', label: 'After' },
      { value: 'lt', label: 'Before' },
      { value: 'gte', label: 'On or after' },
      { value: 'lte', label: 'On or before' }
    ],
    boolean: [
      { value: 'eq', label: 'Is' },
      { value: 'ne', label: 'Is not' }
    ]
  };

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      filters: [],
      logic: 'AND'
    };
    onFiltersChange([...currentFilters, newGroup]);
  };

  const updateFilterGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    const updatedGroups = currentFilters.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    );
    onFiltersChange(updatedGroups);
  };

  const removeFilterGroup = (groupId: string) => {
    const filteredGroups = currentFilters.filter(group => group.id !== groupId);
    onFiltersChange(filteredGroups);
  };

  const addFilter = (groupId: string) => {
    const newFilter: DataFilter = {
      id: `filter-${Date.now()}`,
      field: fields[0]?.name || '',
      operator: 'eq',
      value: '',
      type: 'text',
      enabled: true
    };

    const updatedGroups = currentFilters.map(group =>
      group.id === groupId
        ? { ...group, filters: [...group.filters, newFilter] }
        : group
    );
    onFiltersChange(updatedGroups);
  };

  const updateFilter = (groupId: string, filterId: string, updates: Partial<DataFilter>) => {
    const updatedGroups = currentFilters.map(group =>
      group.id === groupId
        ? {
            ...group,
            filters: group.filters.map(filter =>
              filter.id === filterId ? { ...filter, ...updates } : filter
            )
          }
        : group
    );
    onFiltersChange(updatedGroups);
  };

  const removeFilter = (groupId: string, filterId: string) => {
    const updatedGroups = currentFilters.map(group =>
      group.id === groupId
        ? { ...group, filters: group.filters.filter(filter => filter.id !== filterId) }
        : group
    );
    onFiltersChange(updatedGroups);
  };

  const needsValue = (operator: string) => {
    return !['isEmpty', 'isNotEmpty'].includes(operator);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Data Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {currentFilters.map((group, groupIndex) => (
            <Card key={group.id} className="p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Group {groupIndex + 1}
                    </Badge>
                    <Select
                      value={group.logic}
                      onValueChange={(value: 'AND' | 'OR') => 
                        updateFilterGroup(group.id, { logic: value })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addFilter(group.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Filter
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilterGroup(group.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.filters.map((filter, filterIndex) => (
                    <div key={filter.id} className="space-y-2">
                      {filterIndex > 0 && (
                        <div className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {group.logic}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1">
                          <Switch
                            checked={filter.enabled}
                            onCheckedChange={(enabled) => 
                              updateFilter(group.id, filter.id, { enabled })
                            }
                          />
                        </div>

                        <div className="col-span-3">
                          <Select
                            value={filter.field}
                            onValueChange={(field) => {
                              const fieldInfo = fields.find(f => f.name === field);
                              updateFilter(group.id, filter.id, { 
                                field,
                                type: fieldInfo?.type || 'text'
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {fields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Select
                            value={filter.operator}
                            onValueChange={(operator: any) => 
                              updateFilter(group.id, filter.id, { operator })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {operatorOptions[filter.type]?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {needsValue(filter.operator) && (
                          <div className="col-span-4">
                            {filter.type === 'boolean' ? (
                              <Select
                                value={filter.value}
                                onValueChange={(value) => 
                                  updateFilter(group.id, filter.id, { value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Value" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={filter.value}
                                onChange={(e) => 
                                  updateFilter(group.id, filter.id, { value: e.target.value })
                                }
                                placeholder="Value"
                                type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                              />
                            )}
                          </div>
                        )}

                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilter(group.id, filter.id)}
                            className="h-6 w-6 p-0 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {group.filters.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No filters in this group. Click "Filter" to add one.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {currentFilters.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No filter groups created. Add your first filter group to get started.
            </div>
          )}

          <Button
            variant="outline"
            onClick={addFilterGroup}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Filter Group
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}