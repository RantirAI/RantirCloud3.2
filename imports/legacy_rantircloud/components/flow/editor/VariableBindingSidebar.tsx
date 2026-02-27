import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useFlowStore } from '@/lib/flow-store';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { useNodeAliases } from '@/hooks/useNodeAliases';
import { nodeRegistry } from '@/lib/node-registry';
import { dataContextManager } from '@/lib/data-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VariableBindingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  onVariableSelect: (value: string) => void;
  currentField?: string;
}

export function VariableBindingSidebar({
  isOpen,
  onClose,
  nodeId,
  onVariableSelect,
  currentField
}: VariableBindingSidebarProps) {
  const { nodes, edges } = useFlowStore();
  const { flowVariables } = useVariableResolver();
  const { formatForDisplay, getNodeAlias } = useNodeAliases();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Get all upstream nodes (nodes that come before this node in the flow)
  const getUpstreamNodeIds = () => {
    const visited = new Set<string>();
    const upstream: string[] = [];
    
    const findUpstreamNodes = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);
      
      const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
      
      for (const edge of incomingEdges) {
        upstream.push(edge.source);
        findUpstreamNodes(edge.source);
      }
    };
    
    findUpstreamNodes(nodeId);
    return [...new Set(upstream)];
  };

  // Get live data suggestions from all upstream nodes
  const getLiveDataSuggestions = () => {
    const upstreamNodeIds = getUpstreamNodeIds();
    return dataContextManager.generateVariableSuggestions(upstreamNodeIds);
  };

  // Get all node outputs from upstream nodes
  const getAllUpstreamNodeOutputs = () => {
    const upstreamNodeIds = getUpstreamNodeIds();
    const allOutputs: any[] = [];
    
    upstreamNodeIds.forEach(sourceNodeId => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;
      
      const plugin = nodeRegistry.getPlugin(sourceNode.data.type);
      if (!plugin || !plugin.outputs) return;
      
      // Get the human-readable alias for this node
      const nodeAlias = getNodeAlias(sourceNodeId);
      
      plugin.outputs.forEach(output => {
        allOutputs.push({
          label: `${nodeAlias} > ${output.name}`,
          value: `{{${sourceNodeId}.${output.name}}}`,
          description: output.description || `Output from ${nodeAlias}`,
          type: output.type,
          nodeId: sourceNodeId,
          nodeType: sourceNode.data.type,
          nodeAlias: nodeAlias
        });
      });

      // Add webhook-specific nested path suggestions
      if (sourceNode.data.type === 'webhook-trigger') {
        const nodeAlias = getNodeAlias(sourceNodeId);
        const webhookPaths = [
          { path: 'body.data', desc: 'Access nested data object from request body' },
          { path: 'body.event', desc: 'Event type from webhook payload' },
          { path: 'body.payload', desc: 'Nested payload object (common in webhooks)' },
          { path: 'headers.content-type', desc: 'Content-Type header' },
          { path: 'headers.authorization', desc: 'Authorization header' },
        ];
        
        webhookPaths.forEach(({ path, desc }) => {
          allOutputs.push({
            label: `${nodeAlias} > ${path}`,
            value: `{{${sourceNodeId}.${path}}}`,
            description: desc,
            type: 'any',
            nodeId: sourceNodeId,
            nodeType: sourceNode.data.type,
            isNestedPath: true,
            nodeAlias: nodeAlias
          });
        });
      }
    });
    
    return allOutputs;
  };

  // Get loop variables for the current node if it has loop enabled
  const getLoopVariables = () => {
    const currentNode = nodes.find(node => node.id === nodeId);
    if (!currentNode || !currentNode.data?.loopConfig?.enabled) {
      return [];
    }
    
    const loopVariables: any[] = [];
    const config = currentNode.data.loopConfig;
    const nodeAlias = getNodeAlias(currentNode.id);
    
    // Add current item variable
    loopVariables.push({
      label: `${nodeAlias} Loop > Current Item`,
      value: `{{${currentNode.id}._loop.current}}`,
      description: 'The current item being processed in the loop'
    });
    
    // Add current index variable
    loopVariables.push({
      label: `${nodeAlias} Loop > Current Index`,
      value: `{{${currentNode.id}._loop.index}}`,
      description: 'The current index in the loop iteration'
    });
    
    // Add total count variable
    loopVariables.push({
      label: `${nodeAlias} Loop > Total Count`,
      value: `{{${currentNode.id}._loop.total}}`,
      description: 'Total number of items in the loop'
    });
    
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

  const liveDataSuggestions = getLiveDataSuggestions();
  const nodeOutputs = getAllUpstreamNodeOutputs();
  const loopVariables = getLoopVariables();
  const flowVars = getFlowVariables();

  // Combine all node outputs and remove duplicates
  const allNodeOutputs = [
    ...liveDataSuggestions,
    ...nodeOutputs
  ].filter((variable, index, self) => 
    index === self.findIndex(v => v.value === variable.value)
  );

  // Filter variables based on search query
  const filterVariables = (variables: any[]) => {
    if (!searchQuery.trim()) return variables;
    const query = searchQuery.toLowerCase();
    return variables.filter(v => 
      v.label.toLowerCase().includes(query) || 
      (v.description && v.description.toLowerCase().includes(query))
    );
  };

  const filteredNodeOutputs = filterVariables(allNodeOutputs);
  const filteredFlowVars = filterVariables(flowVars);
  const filteredLoopVars = filterVariables(loopVariables);

  const renderVariable = (variable: any, index: number) => {
    // Extract node ID from variable value to get node icon
    const extractedNodeId = variable.nodeId || (
      variable.value.includes('.') && !variable.value.startsWith('{{env.') && !variable.value.includes('._loop.') 
        ? variable.value.replace(/{{|}}/g, '').split('.')[0] 
        : null
    );
    
    const sourceNode = extractedNodeId ? nodes.find(n => n.id === extractedNodeId) : null;
    const plugin = sourceNode ? nodeRegistry.getPlugin(sourceNode.data.type) : null;
    const NodeIcon = plugin?.icon;

    const buttonContent = (
      <button 
        key={index} 
        className="w-full text-left px-2 py-1.5 hover:bg-accent rounded transition-colors cursor-pointer flex items-center gap-2"
        onClick={() => onVariableSelect(variable.value)}
      >
        {NodeIcon && (
          <div 
            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${plugin?.color}15` }}
          >
            {typeof NodeIcon === 'string' ? (
              <img src={NodeIcon} alt="" className="h-2.5 w-2.5 object-contain" />
            ) : (
              <NodeIcon className="h-2.5 w-2.5" style={{ color: plugin?.color }} />
            )}
          </div>
        )}
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {variable.label}
        </span>
        {variable.type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
            {variable.type}
          </span>
        )}
      </button>
    );

    // Wrap with tooltip if there's a description
    if (variable.description) {
      return (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px]">
            <p className="text-xs">{variable.description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Search field */}
        <div className="px-4 pt-2 pb-1">
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        <Tabs defaultValue="node-outputs" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-4 my-2">
            <TabsTrigger value="node-outputs" className="text-xs">
              Node Outputs
              {filteredNodeOutputs.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                  {filteredNodeOutputs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flow-variables" className="text-xs">
              Flow Variables
              {filteredFlowVars.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                  {filteredFlowVars.length}
                </Badge>
              )}
            </TabsTrigger>
            {loopVariables.length > 0 && (
              <TabsTrigger value="loop-variables" className="text-xs">
                Loop
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                  {filteredLoopVars.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="node-outputs" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="px-3 pb-3 space-y-px">
                  {filteredNodeOutputs.length > 0 ? (
                    filteredNodeOutputs.map((variable, index) => 
                      renderVariable(variable, index)
                    )
                  ) : searchQuery ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No matches for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No node outputs available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="flow-variables" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="px-3 pb-3 space-y-px">
                  {filteredFlowVars.length > 0 ? (
                    filteredFlowVars.map((variable, index) => 
                      renderVariable(variable, index)
                    )
                  ) : searchQuery ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No matches for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No flow variables available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {loopVariables.length > 0 && (
              <TabsContent value="loop-variables" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="px-3 pb-3 space-y-px">
                    {filteredLoopVars.length > 0 ? (
                      filteredLoopVars.map((variable, index) => 
                        renderVariable(variable, index)
                      )
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No matches for "{searchQuery}"
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
