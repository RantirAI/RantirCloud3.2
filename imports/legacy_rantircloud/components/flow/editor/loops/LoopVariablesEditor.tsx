import React from 'react';
import { Plus, Repeat } from 'lucide-react';
import { Edge } from '@xyflow/react';
import { FlowNode } from '@/types/flowTypes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoopVariableRow, LoopVariable } from './LoopVariableRow';
import { nodeRegistry } from '@/lib/node-registry';
import { useFlowStore } from '@/lib/flow-store';
import { v4 as uuidv4 } from 'uuid';
import { LogoIcon } from '@/components/flow/LogoIcon';

interface LoopVariablesEditorProps {
  nodeId: string;
  value: LoopVariable[];
  onChange: (variables: LoopVariable[]) => void;
  nodes: FlowNode[];
  edges: Edge[];
}

export function LoopVariablesEditor({
  nodeId,
  value,
  onChange,
  nodes,
  edges
}: LoopVariablesEditorProps) {
  const variables = value || [];

  const handleAddVariable = () => {
    const newVariable: LoopVariable = {
      id: uuidv4(),
      variableName: `item${variables.length + 1}`,
      sourceNodeId: '',
      sourceField: ''
    };
    onChange([...variables, newVariable]);
  };

  const handleUpdateVariable = (index: number, updated: LoopVariable) => {
    const newVariables = [...variables];
    newVariables[index] = updated;
    onChange(newVariables);
  };

  const handleDeleteVariable = (index: number) => {
    if (variables.length <= 1) return; // Keep at least one
    const newVariables = variables.filter((_, i) => i !== index);
    onChange(newVariables);
  };

  // Get source node info for the summary section
  const getSourceInfo = (variable: LoopVariable) => {
    if (!variable.sourceNodeId) return null;
    const sourceNode = nodes.find(n => n.id === variable.sourceNodeId);
    if (!sourceNode) return null;
    
    const plugin = nodeRegistry.getPlugin(sourceNode.data.type as string);
    return {
      nodeName: (sourceNode.data.label as string) || plugin?.name || 'Unknown',
      fieldName: variable.sourceField,
      icon: plugin?.icon,
      color: plugin?.color || '#6b7280'
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Repeat className="h-3.5 w-3.5 text-purple-500" />
        </div>
        <Label className="text-sm font-medium uppercase tracking-wide">Values to Loop</Label>
      </div>

      {/* Variable Rows */}
      <div className="space-y-2">
        {/* Header Row */}
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <div className="w-28 flex-shrink-0">Variable Name</div>
          <div className="flex-1">Data Source</div>
          <div className="w-8" />
        </div>

        {/* Variable Rows */}
        {variables.map((variable, index) => (
          <LoopVariableRow
            key={variable.id}
            variable={variable}
            nodes={nodes}
            edges={edges}
            currentNodeId={nodeId}
            onChange={(updated) => handleUpdateVariable(index, updated)}
            onDelete={() => handleDeleteVariable(index)}
            isOnly={variables.length === 1}
          />
        ))}
      </div>

      {/* Add Row Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddVariable}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Variable
      </Button>

      {/* Summary of Available Variables During Loop */}
      {variables.some(v => v.variableName && v.sourceNodeId) && (
        <div className="mt-4 p-3 rounded-md bg-muted/50 border">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 block">
            Available During Loop
          </Label>
          <div className="space-y-1.5">
            {variables.filter(v => v.variableName && v.sourceNodeId).map((variable) => {
              const sourceInfo = getSourceInfo(variable);
              return (
                <div key={variable.id} className="flex items-start gap-2 text-sm">
                  <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400">
                    {`{{${variable.variableName}}}`}
                  </code>
                  <span className="text-muted-foreground text-xs">-</span>
                  {sourceInfo && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${sourceInfo.color}20` }}
                      >
                        <LogoIcon
                          icon={sourceInfo.icon}
                          alt={sourceInfo.nodeName}
                          size="sm"
                          color={sourceInfo.color}
                        />
                      </div>
                      <span>{sourceInfo.nodeName} &gt; {sourceInfo.fieldName}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {variables.filter(v => v.variableName).map((variable) => (
              <div key={`${variable.id}-index`} className="flex items-center gap-2 text-sm">
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400">
                  {`{{${variable.variableName}Index}}`}
                </code>
                <span className="text-muted-foreground text-xs">- Current index (0-based)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
