
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Variable, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { useFlowStore } from '@/lib/flow-store';
import { dataContextManager } from '@/lib/data-context';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { nodeRegistry } from '@/lib/node-registry';

interface VariableBindingButtonProps {
  variables: {
    label: string;
    value: string;
    description?: string;
  }[];
  onVariableSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
  size?: string;
  variant?: string;
  position?: string;
  expanded?: boolean;
  isBound?: boolean;
  boundVariableName?: string;
  onUnbind?: () => void;
  nodeId?: string;
  fieldName?: string;
  includeLoopVariables?: boolean;
  onOpenSidebar?: (nodeId: string, fieldName?: string) => void;
}

interface LiveDataVariable {
  label: string;
  value: string;
  description?: string;
  type?: string;
}

export function VariableBindingButton({
  variables,
  onVariableSelect,
  className,
  disabled = false,
  size = "icon",
  variant = "outline",
  position = "end",
  expanded = false,
  isBound = false,
  boundVariableName,
  onUnbind,
  nodeId,
  fieldName: fieldNameProp,
  includeLoopVariables = true,
  onOpenSidebar
}: VariableBindingButtonProps) {
  const { nodes, edges } = useFlowStore();
  const { flowVariables } = useVariableResolver();

  // Get all nodes that come before this node in the flow (upstream nodes)
  const getUpstreamNodeIds = () => {
    if (!nodeId) return [];
    
    const visited = new Set<string>();
    const upstream: string[] = [];
    
    const findUpstreamNodes = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);
      
      // Find all edges that target the current node
      const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
      
      for (const edge of incomingEdges) {
        upstream.push(edge.source);
        findUpstreamNodes(edge.source); // Recursively find upstream nodes
      }
    };
    
    findUpstreamNodes(nodeId);
    return [...new Set(upstream)]; // Remove duplicates
  };

  // Get live data suggestions from all upstream nodes
  const getLiveDataSuggestions = (): LiveDataVariable[] => {
    const upstreamNodeIds = getUpstreamNodeIds();
    return dataContextManager.generateVariableSuggestions(upstreamNodeIds);
  };

  // Get loop variables only for the current node if it has loop enabled
  const getLoopVariables = () => {
    if (!includeLoopVariables || !nodeId) return [];
    
    // Only show loop variables for the current node if it has loop configuration enabled
    const currentNode = nodes.find(node => node.id === nodeId);
    if (!currentNode || !currentNode.data?.loopConfig?.enabled) {
      return [];
    }
    
    const loopVariables: { label: string; value: string; description?: string }[] = [];
    const config = currentNode.data.loopConfig;
    const nodeName = currentNode.data.label || currentNode.id;
    
    // Add current item variable
    loopVariables.push({
      label: `${nodeName} Loop > Current Item`,
      value: `{{${currentNode.id}._loop.current}}`,
      description: 'The current item being processed in the loop'
    });
    
    // Add current index variable
    loopVariables.push({
      label: `${nodeName} Loop > Current Index`,
      value: `{{${currentNode.id}._loop.index}}`,
      description: 'The current index in the loop iteration'
    });
    
    // Add total count variable
    loopVariables.push({
      label: `${nodeName} Loop > Total Count`,
      value: `{{${currentNode.id}._loop.total}}`,
      description: 'Total number of items in the loop'
    });
    
    // If the loop has a custom variable name, add that too
    if (config.loopVariableName && config.loopVariableName !== 'item') {
      loopVariables.push({
        label: `${nodeName} Loop > ${config.loopVariableName}`,
        value: `{{${currentNode.id}._loop.${config.loopVariableName}}}`,
        description: `Custom loop variable: ${config.loopVariableName}`
      });
    }
    
    // If the loop has a custom index variable name, add that too
    if (config.indexVariableName && config.indexVariableName !== 'index') {
      loopVariables.push({
        label: `${nodeName} Loop > ${config.indexVariableName}`,
        value: `{{${currentNode.id}._loop.${config.indexVariableName}}}`,
        description: `Custom index variable: ${config.indexVariableName}`
      });
    }
    
    return loopVariables;
  };

  // Get flow variables from database
  const getFlowVariables = () => {
    return flowVariables.map(variable => ({
      label: `Flow Variable > ${variable.name}`,
      value: `{{${variable.name}}}`,
      description: variable.description || `Flow variable: ${variable.name}`
    }));
  };
  
  // Combine regular variables with live data
  const liveDataSuggestions = getLiveDataSuggestions();
  const loopVariables = getLoopVariables();
  const flowVars = getFlowVariables();
  
  // Get all node outputs from upstream nodes
  const getAllUpstreamNodeOutputs = () => {
    if (!nodeId) return [];
    
    const upstreamNodeIds = getUpstreamNodeIds();
    const allOutputs: any[] = [];
    
    upstreamNodeIds.forEach(sourceNodeId => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;
      
      const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
      if (!plugin || !plugin.outputs) return;
      
      plugin.outputs.forEach(output => {
        allOutputs.push({
          label: `${sourceNode.data.label} > ${output.name}`,
          value: `{{${sourceNodeId}.${output.name}}}`,
          description: output.description || `Output from ${sourceNode.data.label}`,
          type: output.type
        });
      });
    });
    
    return allOutputs;
  };

  // Group node output variables
  const nodeOutputs = [
    ...variables,
    ...liveDataSuggestions,
    ...getAllUpstreamNodeOutputs(),
    ...variables.filter(v => v.value.startsWith('{{env.')), // environment variables
  ];

  // Remove duplicates from nodeOutputs
  const uniqueNodeOutputs = nodeOutputs.filter((variable, index, self) => 
    index === self.findIndex(v => v.value === variable.value)
  );

  const handleUnbind = () => {
    if (onUnbind) {
      onUnbind();
    }
  };
  
  if (uniqueNodeOutputs.length === 0 && loopVariables.length === 0 && flowVars.length === 0) {
    return (
      <Button 
        variant={variant as any} 
        size={size as any}
        className={className}
        disabled={disabled}
        onClick={() => {
          if (onOpenSidebar && nodeId) {
            onOpenSidebar(nodeId, fieldNameProp);
          }
        }}
      >
        <Variable className="h-4 w-4" />
      </Button>
    );
  }

  const renderVariable = (variable: any, index: number, color: string) => {
    // Extract node ID from variable value to get node icon
    const nodeId = variable.value.includes('.') && !variable.value.startsWith('{{env.') && !variable.value.includes('._loop.') 
      ? variable.value.replace(/{{|}}/g, '').split('.')[0] 
      : null;
    
    const sourceNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
    const plugin = sourceNode ? nodeRegistry.getPlugin(sourceNode.data.type) : null;
    const NodeIcon = plugin?.icon;

    return (
      <div key={index} className={`border rounded-lg p-3 bg-card hover:bg-accent transition-colors cursor-pointer dark:border-border`}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {NodeIcon && (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${plugin?.color}20` }}
                >
                  {typeof NodeIcon === 'string' ? (
                    <img src={NodeIcon} alt="" className="h-3 w-3 object-contain" />
                  ) : (
                    <NodeIcon className="h-3 w-3" style={{ color: plugin?.color }} />
                  )}
                </div>
              )}
              <div className="font-medium text-sm truncate text-foreground">{variable.label}</div>
            </div>
            {variable.description && (
              <div className="text-xs text-muted-foreground mt-1">{variable.description}</div>
            )}
            {variable.type && (
              <Badge variant="outline" className="text-xs mt-1">
                {variable.type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => onVariableSelect(variable.value)}
            >
              <Variable className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // If variable is bound, show a different UI
  if (isBound && boundVariableName) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
          {boundVariableName}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
          onClick={handleUnbind}
          title="Unbind variable"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  
  return (
    <Button 
      variant={variant as any} 
      size={size as any}
      className={className}
      disabled={disabled}
      onClick={() => {
        console.log('Variable binding button clicked for nodeId:', nodeId);
        if (onOpenSidebar && nodeId) {
          console.log('Calling onOpenSidebar with nodeId:', nodeId, 'fieldName:', fieldNameProp);
          onOpenSidebar(nodeId, fieldNameProp);
        } else {
          console.log('onOpenSidebar or nodeId missing:', { onOpenSidebar: !!onOpenSidebar, nodeId });
        }
      }}
    >
      <Variable className="h-4 w-4" />
      {expanded && boundVariableName && (
        <span className="ml-2 text-xs max-w-28 truncate">{boundVariableName}</span>
      )}
    </Button>
  );
}
