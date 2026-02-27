import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edge } from '@xyflow/react';
import { FlowNode } from '@/types/flowTypes';
import { LoopVariablesEditor } from './LoopVariablesEditor';
import { LoopVariable } from './LoopVariableRow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Settings2, Info, Link2, Unlink } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';
import { LogoIcon } from '@/components/flow/LogoIcon';

interface LoopConfigurationPanelProps {
  nodeId: string;
  inputs: Record<string, any>;
  onInputChange: (name: string, value: any) => void;
  nodes: FlowNode[];
  edges: Edge[];
}

export function LoopConfigurationPanel({
  nodeId,
  inputs,
  onInputChange,
  nodes,
  edges
}: LoopConfigurationPanelProps) {
  const loopVariables: LoopVariable[] = inputs.loopVariables || [];
  const trimWhitespace = inputs.trimWhitespace ?? 'true';
  const loopCounterStart = inputs.loopCounterStart ?? 1;
  const maxIterations = inputs.maxIterations ?? 500;
  const linkedVariableId = inputs.linkedVariableId as string | undefined;
  const delayMs = inputs.delayMs ?? 0;
  const errorHandling = inputs.errorHandling ?? 'continue';

  // State for max iterations mode
  const [useListCount, setUseListCount] = useState(!!linkedVariableId);

  // Handle toggle between manual and list count mode
  const handleModeToggle = () => {
    if (useListCount) {
      // Switching to manual mode
      setUseListCount(false);
      onInputChange('linkedVariableId', undefined);
    } else {
      // Switching to list count mode
      setUseListCount(true);
      if (loopVariables.length > 0) {
        onInputChange('linkedVariableId', loopVariables[0].id);
      }
    }
  };

  const getVariableDisplayName = (varId: string) => {
    const v = loopVariables.find(lv => lv.id === varId);
    return v ? v.variableName || 'item' : 'Unknown';
  };

  // Get source node info for the variable summary
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
    <div className="space-y-6">
      {/* Values to Loop Section */}
      <div className="space-y-3">
        <LoopVariablesEditor
          nodeId={nodeId}
          value={loopVariables}
          onChange={(variables) => onInputChange('loopVariables', variables)}
          nodes={nodes}
          edges={edges}
        />
        <p className="text-xs text-muted-foreground">
          Type loop value name(s) in the field(s) on the left. Map Line Item value(s) to loop through on the right.
        </p>
      </div>

      {/* Loop Options Section */}
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full group">
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground font-medium group-hover:text-foreground transition-colors">
            <Settings2 className="h-3 w-3" />
            Loop Options
            <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          </div>
          <div className="h-px flex-1 bg-border" />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Trim Whitespace */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Trim Whitespace
            </Label>
            <Select
              value={trimWhitespace.toString()}
              onValueChange={(value) => onInputChange('trimWhitespace', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Remove whitespace surrounding each individual value? Defaults to "True".
            </p>
          </div>

          {/* Loop Counter Start */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Loop iteration counter start
              <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">1 2 3</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={loopCounterStart}
              onChange={(e) => onInputChange('loopCounterStart', parseInt(e.target.value) || 0)}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              A counter value called "loop_iteration" will be added to each iteration of the loop. Does not affect the data to loop.
            </p>
          </div>

          {/* Max Iterations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                Maximum number of Loop iterations
                <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">1 2 3</span>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={handleModeToggle}
                title={useListCount ? 'Set manual limit' : 'Use count from bound list'}
              >
                {useListCount ? (
                  <>
                    <Unlink className="h-3 w-3" />
                    Use Manual
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" />
                    Use List Count
                  </>
                )}
              </Button>
            </div>
            
            {useListCount ? (
              <div className="space-y-2">
                <Select
                  value={linkedVariableId || ''}
                  onValueChange={(value) => onInputChange('linkedVariableId', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a loop variable..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {loopVariables.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Add loop variables first
                      </div>
                    ) : (
                      loopVariables.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 rounded font-mono">
                              {`{{${v.variableName || 'item'}}}`}
                            </code>
                            <span className="text-muted-foreground">→ count items</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {linkedVariableId && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Will process all items in <code className="bg-muted px-1 rounded">{`{{${getVariableDisplayName(linkedVariableId)}}}`}</code>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The loop will automatically process all items in the selected list (array length determines iteration count).
                </p>
              </div>
            ) : (
              <>
                <Input
                  type="number"
                  min="1"
                  value={maxIterations}
                  onChange={(e) => onInputChange('maxIterations', parseInt(e.target.value) || 500)}
                  placeholder="500"
                />
                <p className="text-xs text-muted-foreground">
                  Set this value to limit the number of loops performed. Data in iterations past the limit will be ignored.
                </p>
              </>
            )}
          </div>

          {/* Delay Between Items */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Delay Between Items (ms)
              <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">1 2 3</span>
            </Label>
            <Input
              type="number"
              min="0"
              value={delayMs}
              onChange={(e) => onInputChange('delayMs', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Delay in milliseconds between processing each item. Useful for rate limiting API calls.
            </p>
          </div>

          {/* Error Handling */}
          <div className="space-y-2">
            <Label>Error Handling</Label>
            <Select
              value={errorHandling}
              onValueChange={(value) => onInputChange('errorHandling', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">
                  <div className="flex flex-col items-start">
                    <span>Continue on Error</span>
                  </div>
                </SelectItem>
                <SelectItem value="stop">
                  <div className="flex flex-col items-start">
                    <span>Stop on First Error</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {errorHandling === 'continue' 
                ? 'Continue processing remaining items if one fails.'
                : 'Stop the entire loop if any iteration fails.'}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Available During Loop Section */}
      {loopVariables.some(v => v.variableName && v.sourceNodeId) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground font-medium">
              <Info className="h-3 w-3" />
              Available During Loop
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="p-3 rounded-md bg-muted/50 border space-y-2">
            {/* User-defined variables */}
            {loopVariables.filter(v => v.variableName && v.sourceNodeId).map((variable) => {
              const sourceInfo = getSourceInfo(variable);
              return (
                <div key={variable.id} className="flex items-start gap-2 text-sm">
                  <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400 flex-shrink-0">
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
                      <span>Current value from {sourceInfo.nodeName} &gt; {sourceInfo.fieldName}</span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Index variables for each loop variable */}
            {loopVariables.filter(v => v.variableName).map((variable) => (
              <div key={`${variable.id}-index`} className="flex items-center gap-2 text-sm">
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400 flex-shrink-0">
                  {`{{${variable.variableName}Index}}`}
                </code>
                <span className="text-muted-foreground text-xs">- Current index (0-based)</span>
              </div>
            ))}
            
            {/* loop_iteration counter */}
            <div className="flex items-center gap-2 text-sm">
              <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                {`{{loop_iteration}}`}
              </code>
              <span className="text-muted-foreground text-xs">
                - Human-friendly counter (starts at {loopCounterStart})
              </span>
            </div>
            
            {/* Loop context variables */}
            <div className="flex items-center gap-2 text-sm">
              <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-green-600 dark:text-green-400 flex-shrink-0">
                {`{{loop.isFirst}}`}
              </code>
              <span className="text-muted-foreground text-xs">- True if first iteration</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-green-600 dark:text-green-400 flex-shrink-0">
                {`{{loop.isLast}}`}
              </code>
              <span className="text-muted-foreground text-xs">- True if last iteration</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono text-green-600 dark:text-green-400 flex-shrink-0">
                {`{{loop.total}}`}
              </code>
              <span className="text-muted-foreground text-xs">- Total number of iterations</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
