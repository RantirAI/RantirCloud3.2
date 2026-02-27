import React, { useState, useEffect, useMemo } from 'react';
import { tableService } from '@/services/tableService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SchemaTypeIcon } from '@/components/SchemaTypeIcon';
import { VariableBindingButton } from './VariableBindingButton';
import { LogoIcon } from '@/components/flow/LogoIcon';
import { nodeRegistry } from '@/lib/node-registry';
import { useFlowStore } from '@/lib/flow-store';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { CalendarDays, Plus, X, Database, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DataTableFieldMapperProps {
  tableId: string;
  databaseId: string;
  fieldValues: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  variables: { label: string; value: string; description?: string }[];
  nodeId: string;
  onOpenSidebar?: (nodeId: string, fieldName?: string) => void;
}

interface SchemaField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  options?: any[];
}

export function DataTableFieldMapper({
  tableId,
  databaseId,
  fieldValues,
  onChange,
  variables,
  nodeId,
  onOpenSidebar,
}: DataTableFieldMapperProps) {
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const { nodes } = useFlowStore();
  const { getVariableDisplayName } = useVariableResolver();

  const isVarBinding = (v: string) => typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}');

  const getSourceNodeInfo = (binding: string) => {
    const inner = binding.substring(2, binding.length - 2);
    const parts = inner.split('.');
    if (parts.length < 2) return null;
    const nodeId = parts[0];
    if (nodeId === 'env') return null; // env vars handled separately
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const plugin = nodeRegistry.getPlugin(node.data.type);
    return { node, plugin };
  };

  useEffect(() => {
    if (!tableId || !databaseId) {
      setFields([]);
      return;
    }

    // Try window cache first
    const cachedTables = window.flowDataTables?.[databaseId];
    if (cachedTables) {
      const table = cachedTables.find((t: any) => t.id === tableId);
      if (table?.schema?.fields) {
        setFields(table.schema.fields);
        return;
      }
    }

    // Fetch from service
    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      try {
        const tableProject = await tableService.getTableProject(tableId);
        if (tableProject?.schema?.fields) {
          setFields(tableProject.schema.fields);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load table schema');
      } finally {
        setLoading(false);
      }
    };
    fetchSchema();
  }, [tableId, databaseId]);

  if (!tableId) {
    return (
      <div className="text-xs text-muted-foreground p-3 border rounded-md bg-muted/30">
        Select a table to see available fields
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-3 border rounded-md">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/30 rounded-md">
        {error}
      </div>
    );
  }

  // System fields: id field or timestamp type — always auto-generated
  const isSystemField = (f: SchemaField) =>
    f.type === 'timestamp' || f.name.toLowerCase() === 'id';

  const systemFields = fields.filter(isSystemField);
  const editableFields = fields.filter(f => !isSystemField(f));

  // Active fields = those whose fieldMap.* key exists in fieldValues
  const activeFieldKeys = Object.keys(fieldValues).filter(k => k.startsWith('fieldMap.'));
  const activeFieldIds = activeFieldKeys.map(k => k.substring('fieldMap.'.length));

  // Available fields = editable fields not yet added
  const availableFields = editableFields.filter(f => !activeFieldIds.includes(f.id));

  // Resolve field metadata by id (fallback if schema not loaded yet)
  const getFieldMeta = (fieldId: string): { name: string; type: string } => {
    const found = fields.find(f => f.id === fieldId);
    return found ? { name: found.name, type: found.type } : { name: fieldId, type: 'text' };
  };

  const handleAddField = (field: SchemaField) => {
    onChange(`fieldMap.${field.id}`, '');
    setAddFieldOpen(false);
  };

  const handleRemoveField = (fieldId: string) => {
    onChange(`fieldMap.${fieldId}`, '__REMOVE__');
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Record Fields</Label>

      {/* Active (user-added) fields */}
      {activeFieldIds.map(fieldId => {
        const meta = getFieldMeta(fieldId);
        const fieldKey = `fieldMap.${fieldId}`;
        const value = fieldValues[fieldKey] || '';
        const isBound = isVarBinding(value);
        const sourceInfo = isBound ? getSourceNodeInfo(value) : null;
        const displayName = isBound ? getVariableDisplayName(value) : '';
        const brandColor = sourceInfo?.plugin?.color || '#6366f1';

        return (
          <div key={fieldId} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-[120px] flex-shrink-0">
              <SchemaTypeIcon type={meta.type} size={12} className="text-muted-foreground" />
              <span className="text-xs truncate">{meta.name}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                {meta.type}
              </Badge>
            </div>
            <div className="flex-1 flex items-center gap-1">
              {isBound ? (
                <div
                  className="flex-1 flex items-center gap-1.5 px-2 h-8 rounded-md border text-xs truncate"
                  style={{ backgroundColor: `${brandColor}12`, borderColor: `${brandColor}30` }}
                >
                  {sourceInfo?.plugin?.icon && (
                    <LogoIcon
                      icon={sourceInfo.plugin.icon}
                      alt={sourceInfo.plugin.name || ''}
                      size="sm"
                      color={brandColor}
                    />
                  )}
                  {!sourceInfo?.plugin?.icon && value.includes('env.') && (
                    <span className="text-xs">🔒</span>
                  )}
                  <span className="truncate" style={{ color: brandColor }}>{displayName}</span>
                </div>
              ) : (
                <Input
                  value={value}
                  onChange={(e) => onChange(fieldKey, e.target.value)}
                  placeholder={`Value for ${meta.name}`}
                  className="h-8 text-xs"
                />
              )}
              <VariableBindingButton
                variables={variables}
                onVariableSelect={(varValue) => onChange(fieldKey, varValue)}
                nodeId={nodeId}
                fieldName={fieldKey}
                onOpenSidebar={onOpenSidebar}
              />
              {isBound ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(fieldKey, '')}
                  title="Unbind variable"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveField(fieldId)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add Field button */}
      {(availableFields.length > 0 || fields.length === 0) && (
        <Popover open={addFieldOpen} onOpenChange={setAddFieldOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Field
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1" align="start">
            {availableFields.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">
                {fields.length === 0 ? 'Loading fields...' : 'All fields have been added'}
              </div>
            ) : (
              <div className="max-h-[240px] overflow-y-auto">
                {availableFields.map(field => (
                  <button
                    key={field.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm hover:bg-accent transition-colors"
                    onClick={() => handleAddField(field)}
                  >
                    <SchemaTypeIcon type={field.type} size={12} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate flex-1">{field.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                      {field.type}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* System fields */}
      {systemFields.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">System Fields</span>
          {systemFields.map(field => (
            <div key={field.id} className="flex items-center gap-2 mt-1 opacity-50">
              <div className="flex items-center gap-1.5 min-w-[120px]">
                {field.type === 'timestamp' ? (
                  <CalendarDays size={12} className="text-muted-foreground" />
                ) : (
                  <Database size={12} className="text-muted-foreground" />
                )}
                <span className="text-xs truncate">{field.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground italic">auto-generated</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
