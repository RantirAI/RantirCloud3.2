import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonacoEditorField } from '@/components/flow/MonacoEditorField';
import { VisualJsonBuilder } from './VisualJsonBuilder';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { useNodeAliases } from '@/hooks/useNodeAliases';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { GripVertical } from 'lucide-react';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
  language?: string;
  nodeId?: string;
  showVisualMapper?: boolean;
}

export function CodeEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
  title = 'Edit Code',
  description,
  language = 'javascript',
  nodeId,
  showVisualMapper = false
}: CodeEditorModalProps) {
  const { nodes, edges } = useFlowStore();
  const [localValue, setLocalValue] = useState(value);
  const { getNodeAlias, registry } = useNodeAliases();
  const { flowVariables, vaultSecrets } = useVariableResolver();

  // Convert stored value (with node IDs) to display value (with aliases)
  const toDisplayValue = (storedValue: string): string => {
    if (!storedValue) return storedValue;
    return storedValue.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const aliasPath = registry.nodeIdToAliasPath(innerPath);
      return `{{${aliasPath}}}`;
    });
  };

  // Convert display value (with aliases) back to storage value (with node IDs)
  const toStorageValue = (displayValue: string): string => {
    if (!displayValue) return displayValue;
    return displayValue.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const nodeIdPath = registry.aliasToNodeIdPath(innerPath);
      return nodeIdPath ? `{{${nodeIdPath}}}` : match;
    });
  };

  // Sync local value when prop changes (convert to display format)
  useEffect(() => {
    setLocalValue(toDisplayValue(value));
  }, [value, isOpen]);

  const handleSave = () => {
    // Convert back to storage format before saving
    onChange(toStorageValue(localValue));
  };

  // Build available variables from connected nodes with rich metadata and aliases
  const getAvailableVariables = () => {
    const vars: { label: string; value: string; description?: string; type?: string; nodeIcon?: string }[] = [];
    
    // Add vault secrets
    vaultSecrets.forEach(s => {
      vars.push({
        label: `🔒 Secret > ${s.name}`,
        value: `{{env.${s.name}}}`,
        description: 'Encrypted secret (Vault)',
        type: 'string',
      });
    });

    // Add flow variables
    flowVariables.forEach(v => {
      vars.push({
        label: `Flow Variable > ${v.name}`,
        value: `{{${v.name}}}`,
        description: v.description || `Flow variable ${v.name}`,
        type: 'string',
      });
    });

    if (nodeId) {
      const incomingEdges = edges.filter(e => e.target === nodeId);
      incomingEdges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return;
        const plugin = nodeRegistry.getPlugin(sourceNode.data.type as string);
        if (!plugin) return;
        
        // Get human-readable alias for this node
        const nodeAlias = getNodeAlias(edge.source);
        
        // Get static outputs
        const staticOutputs = plugin.outputs || [];
        
        // Get dynamic outputs (e.g., from webhook sample payload)
        const dynamicOutputs = plugin.getDynamicOutputs?.(sourceNode.data.inputs || {}) || [];
        
        // Combine all outputs
        const allOutputs = [...staticOutputs, ...dynamicOutputs];
        
        allOutputs.forEach(output => {
          vars.push({
            label: `${nodeAlias} > ${output.name}`,
            value: `{{${edge.source}.${output.name}}}`,
            description: output.description || `Output from ${nodeAlias}`,
            type: output.type,
            nodeIcon: typeof plugin.icon === 'string' ? plugin.icon : undefined
          });
        });
      });
    }
    return vars;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col bg-background resize overflow-auto" 
        style={{ resize: 'both', minWidth: '600px', minHeight: '400px' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        {showVisualMapper ? (
          <Tabs defaultValue="code" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-fit">
              <TabsTrigger value="code">Code Editor</TabsTrigger>
              <TabsTrigger value="mapper">Visual Mapper</TabsTrigger>
            </TabsList>
            
            <TabsContent value="code" className="flex-1 min-h-0 mt-4">
              <MonacoEditorField 
                value={localValue} 
                onChange={setLocalValue}
                language={language}
                nodeId={nodeId}
                height="100%"
              />
            </TabsContent>
            
            <TabsContent value="mapper" className="flex-1 min-h-0 mt-4 overflow-hidden">
              <div className="h-full">
                <VisualJsonBuilder 
                  initialValue={(() => {
                    try {
                      return JSON.parse(localValue);
                    } catch {
                      return {};
                    }
                  })()}
                  availableVariables={getAvailableVariables()}
                  onChange={(val) => setLocalValue(JSON.stringify(val, null, 2))}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 min-h-0">
            <MonacoEditorField 
              value={localValue} 
              onChange={setLocalValue}
              language={language}
              nodeId={nodeId}
              height="100%"
            />
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
