import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nodeRegistry } from '@/lib/node-registry';
import { Node } from '@xyflow/react';
import { Lock, Variable } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AvailableVariablesPanelProps {
  availableVariables: { [key: string]: any };
  nodes: Node[];
  onSelectVariable: (variableName: string) => void;
  formatForDisplay: (path: string, separator?: string) => string;
}

// Helper to generate a friendly name from a path
function generateFriendlyName(path: string): string {
  // Get the last meaningful part (after the nodeId)
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1] || path;
  
  // Remove array indices
  const cleanPart = lastPart.replace(/\[\d+\]/g, '');
  
  // Convert camelCase/snake_case/kebab-case to Title Case
  return cleanPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper to infer type from value
function inferTypeFromValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

export function AvailableVariablesPanel({
  availableVariables,
  nodes,
  onSelectVariable,
  formatForDisplay
}: AvailableVariablesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const variableKeys = Object.keys(availableVariables);

  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return variableKeys;
    const query = searchQuery.toLowerCase();
    return variableKeys.filter((variableName) => {
      const friendlyName = generateFriendlyName(variableName).toLowerCase();
      const displayName = formatForDisplay(variableName, ' > ').toLowerCase();
      return friendlyName.includes(query) || displayName.includes(query) || variableName.toLowerCase().includes(query);
    });
  }, [variableKeys, searchQuery, formatForDisplay]);

  const getVariableInfo = (variableName: string) => {
    // Check if it's a vault secret (env.XXX)
    if (variableName.startsWith('env.')) {
      const secretName = variableName.substring(4);
      return {
        NodeIcon: Lock,
        plugin: null,
        friendlyName: `🔒 ${secretName}`,
        sourceNodeLabel: 'Secure Secret',
        description: 'Encrypted in Vault',
        type: 'secret',
        valuePreview: '••••••••',
        isSpecial: true,
        specialColor: '#16a34a',
      };
    }

    // Check if it's a flow variable (no dot = flow variable name)
    if (!variableName.includes('.')) {
      return {
        NodeIcon: Variable,
        plugin: null,
        friendlyName: variableName,
        sourceNodeLabel: 'Flow Variable',
        description: '',
        type: 'string',
        valuePreview: getValuePreview(availableVariables[variableName]),
        isSpecial: true,
        specialColor: '#8b5cf6',
      };
    }

    const extractedNodeId = variableName.split('.')[0];
    const outputName = variableName.split('.').slice(1).join('.');
    const sourceNode = nodes.find(n => n.id === extractedNodeId);
    const plugin = sourceNode ? nodeRegistry.getPlugin(sourceNode.data.type as string) : null;
    const NodeIcon = plugin?.icon;
    
    // Get the auto-generated friendly name from selectedPayloadFields if available
    const nodeInputs = sourceNode?.data?.inputs as Record<string, any> | undefined;
    const selectedFields = nodeInputs?.selectedPayloadFields;
    const autoName = selectedFields?.autoNames?.[variableName] || selectedFields?.autoNames?.[outputName];
    
    // Use auto-name or generate one
    const friendlyName = autoName || generateFriendlyName(outputName);
    
    // Get source node label
    const sourceNodeLabel = sourceNode?.data?.label as string || 'Unknown';

    // Get actual value from availableVariables for preview and type inference
    const actualValue = availableVariables[variableName];
    const valuePreview = getValuePreview(actualValue);
    const inferredType = inferTypeFromValue(actualValue);
    
    // Try to get type from plugin outputs if available
    const outputDef = plugin?.outputs?.find((o: any) => o.name === outputName);
    const type = outputDef?.type || inferredType;
    const description = outputDef?.description || '';

    return { NodeIcon, plugin, friendlyName, sourceNodeLabel, description, type, valuePreview, isSpecial: false, specialColor: undefined };
  };

  // Helper to get a short preview of the value
  const getValuePreview = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      return value.length > 30 ? `"${value.substring(0, 30)}..."` : `"${value}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `Array[${value.length}]`;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `{${keys.slice(0, 2).join(', ')}${keys.length > 2 ? '...' : ''}}`;
    }
    return null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with search */}
        <div className="px-2 py-1.5 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Variables</span>
            <span className="text-[10px] text-muted-foreground">{filteredVariables.length}</span>
          </div>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-6 text-[11px] bg-background/50"
          />
        </div>
        
        {/* Variables list */}
        <ScrollArea className="flex-1">
          <div className="p-1">
            {filteredVariables.length > 0 ? (
              <div className="space-y-px">
                {filteredVariables.map((variableName) => {
                  const { NodeIcon, plugin, friendlyName, sourceNodeLabel, description, type, valuePreview, isSpecial, specialColor } = getVariableInfo(variableName);

                  const buttonContent = (
                    <button
                      key={variableName}
                      onClick={() => onSelectVariable(variableName)}
                      className="w-full text-left px-2 py-1.5 hover:bg-accent rounded group transition-colors"
                    >
                      {/* Top row: Friendly name + type badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-medium text-foreground truncate flex-1">
                          {friendlyName}
                        </span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          {type}
                        </span>
                      </div>
                      
                      {/* Bottom row: Source node with icon */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {NodeIcon && (
                          <div 
                            className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isSpecial ? `${specialColor}15` : `${plugin?.color}15` }}
                          >
                            {typeof NodeIcon === 'string' ? (
                              <img src={NodeIcon} alt="" className="h-2 w-2 object-contain" />
                            ) : (
                              <NodeIcon className="h-2 w-2" style={{ color: isSpecial ? specialColor : plugin?.color }} />
                            )}
                          </div>
                        )}
                        <span className="text-[9px] text-muted-foreground truncate">
                          {sourceNodeLabel}
                        </span>
                      </div>
                    </button>
                  );

                  // Wrap with tooltip if there's additional info
                  if (description || valuePreview) {
                    return (
                      <Tooltip key={variableName}>
                        <TooltipTrigger asChild>
                          {buttonContent}
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[200px]">
                          {description && <p className="text-xs">{description}</p>}
                          {valuePreview && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-1">{valuePreview}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return buttonContent;
                })}
              </div>
            ) : searchQuery ? (
              <div className="text-[10px] text-muted-foreground text-center py-3">
                No matches for "{searchQuery}"
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground text-center py-3">
                No variables available
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
