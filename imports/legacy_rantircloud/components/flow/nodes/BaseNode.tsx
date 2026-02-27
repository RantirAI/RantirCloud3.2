
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { Plus, Trash2, Power, Globe, Play, Loader2, MoreVertical, Zap } from 'lucide-react';
import { NodeData } from '@/types/flowTypes';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dataContextManager } from '@/lib/data-context';
import firecrawlLogo from '@/assets/firecrawl-logo.png';
import { LogoIcon } from '../LogoIcon';

interface BaseNodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

export function BaseNode({
  id,
  data,
  selected
}: BaseNodeProps) {
  const [isDraggingOver, setIsDraggingOver] = useState<'true' | 'false' | 'regular' | null>(null);
  const [isRunningNode, setIsRunningNode] = useState(false);
  
  const {
    setCurrentSelectedNodeId,
    removeNode,
    toggleNodeEnabled,
    errorNodes,
    setCurrentSourceNodeId,
    setIsAddNodeDialogOpen,
    updateNode,
    addDebugLog,
    nodes,
    edges,
    isDragInProgress, // Get global drag state
    setIsSingleNodeTesting
  } = useFlowStore();
  const reactFlowInstance = useReactFlow();
  const nodeType = data.type as string;
  const plugin = nodeRegistry.getPlugin(nodeType);
  const isErrorNode = errorNodes.includes(id);
  
  // Check if this is a conditional node - check both the React Flow node type and the plugin type
  const isConditionNode = data.type === 'condition' || nodeType === 'condition';

  // Get the node category from the plugin
  const nodeCategory = plugin?.category || '';

  // Function to get node subtitle
  const getNodeSubtitle = () => {
    // Show the actual operation/action configured for the node
    const actionValue = data.inputs?.operation || data.inputs?.action || data.inputs?.method;
    if (actionValue && plugin?.inputs) {
      // Find the input field that contains the action/operation
      const actionInput = plugin.inputs.find(input => 
        input.name === 'action' || input.name === 'operation' || input.name === 'method'
      );
      
      // If we found the input field, look up the label for the current value
      if (actionInput && actionInput.options) {
        const selectedOption = actionInput.options.find(opt => opt.value === actionValue);
        if (selectedOption) {
          return selectedOption.label;
        }
      }
      
      // Fallback to showing the value itself
      return actionValue.toString();
    }
    
    // Fallback to node type
    return nodeType || '';
  };

  // Check if any edge is already connected from this node
  const hasConnections = (sourceHandle?: string) => {
    const edges = useFlowStore.getState().edges;
    return edges.some(edge => edge.source === id && (!sourceHandle || edge.sourceHandle === sourceHandle));
  };

  // Check if this node has any outgoing connections (i.e., not the last node)
  const hasOutgoingConnections = () => {
    const edges = useFlowStore.getState().edges;
    return edges.some(edge => edge.source === id);
  };

  // Function to run a single node for testing
  const handleRunSingleNode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!plugin || data.disabled) return;
    
    setIsRunningNode(true);
    setIsSingleNodeTesting(true);
    
    try {
      addDebugLog({
        nodeId: id,
        nodeName: data.label as string,
        type: 'info',
        message: `Testing single node execution: ${data.label}`,
      });

      const { debugLogs } = useFlowStore.getState();
      const variables: Record<string, any> = {};
      
      debugLogs
        .filter(log => log.type === 'output' && log.data)
        .forEach(log => {
          if (log.data) {
            Object.entries(log.data).forEach(([key, value]) => {
              variables[`${log.nodeId}.${key}`] = value;
            });
          }
        });

      // Load environment variables for single-node test
      const envVars: Record<string, string> = (() => {
        try {
          const s = localStorage.getItem('flow-env-vars');
          const parsed = s ? JSON.parse(s) : {};
          if (!parsed.SUPABASE_URL) parsed.SUPABASE_URL = 'https://appdmmjexevclmpyvtss.supabase.co';
          if (!parsed.SUPABASE_ANON_KEY) parsed.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ';
          return parsed;
        } catch { return {}; }
      })();

      const executionContext = {
        nodeId: id,
        flowId: 'single-node-test',
        envVars,
        variables,
        getChildNodes: (nodeId: string) => nodes.filter(n => n.data.parentLoopId === nodeId),
        executeNode: async () => ({ message: 'Single node test execution' }),
      };

      const inputs = { ...data.inputs };
      
      const payloadMappings = Array.isArray(data.payloadMappings) ? data.payloadMappings : [];
      
      if (payloadMappings.length > 0) {
        addDebugLog({
          nodeId: id,
          nodeName: data.label as string,
          type: 'info',
          message: `Processing ${payloadMappings.length} payload mappings for single node test`,
        });
        
        for (const mapping of payloadMappings) {
          try {
            const sourceValue = variables[`${mapping.sourceNodeId}.${mapping.sourceOutputField}`];
            
            if (sourceValue !== undefined) {
              if (mapping.transformExpression) {
                try {
                  const transformFn = new Function('data', `return ${mapping.transformExpression}`);
                  inputs[mapping.targetField] = transformFn(sourceValue);
                } catch (transformError: any) {
                  addDebugLog({
                    nodeId: id,
                    nodeName: data.label as string,
                    type: 'error',
                    message: `Error in transformation: ${transformError.message}`,
                  });
                  inputs[mapping.targetField] = sourceValue;
                }
              } else {
                inputs[mapping.targetField] = sourceValue;
              }
            } else {
              addDebugLog({
                nodeId: id,
                nodeName: data.label as string,
                type: 'warning',
                message: `Source value not found for mapping: ${mapping.sourceNodeId}.${mapping.sourceOutputField}`,
              });
            }
          } catch (mappingError: any) {
            addDebugLog({
              nodeId: id,
              nodeName: data.label as string,
              type: 'error',
              message: `Error applying mapping: ${mappingError.message}`,
            });
          }
        }
      }

      const result = await plugin.execute?.(inputs, executionContext);

      if (result) {
        dataContextManager.storeNodeData(id, data.label as string, result);
        
        addDebugLog({
          nodeId: id,
          nodeName: data.label as string,
          type: 'output',
          message: 'Single node test completed successfully',
          data: result,
        });
      } else {
        addDebugLog({
          nodeId: id,
          nodeName: data.label as string,
          type: 'info',
          message: 'Single node test completed (no output data)',
        });
      }

    } catch (error: any) {
      addDebugLog({
        nodeId: id,
        nodeName: data.label as string,
        type: 'error',
        message: `Single node test failed: ${error.message}`,
      });
    } finally {
      setIsRunningNode(false);
      setIsSingleNodeTesting(false);
    }
  }, [id, data, plugin, addDebugLog, nodes, setIsSingleNodeTesting]);

  // Handle node click
  const handleNodeClick = useCallback(() => {
    setCurrentSelectedNodeId(id);
  }, [id, setCurrentSelectedNodeId]);

  // Check if this node has any incoming connections (making it non-draggable)
  const hasIncomingConnections = () => {
    const edges = useFlowStore.getState().edges;
    return edges.some(edge => edge.target === id);
  };

  // Check if this node has any connections at all (incoming or outgoing)
  const hasAnyConnections = () => {
    const edges = useFlowStore.getState().edges;
    return edges.some(edge => edge.source === id || edge.target === id);
  };

  // Handle drag start - prevent dragging if node has connections
  const handleDragStart = useCallback((event: React.DragEvent) => {
    if (hasAnyConnections()) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [id]);

  // Handle drag - completely prevent dragging for connected nodes
  const handleDrag = useCallback((event: React.DragEvent) => {
    if (hasAnyConnections()) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [id]);

  // Handle delete node
  const handleDeleteNode = useCallback((deleteChain: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const {
      edges,
      setEdges,
      nodes
    } = useFlowStore.getState();

    // If this is the first node, promote the next connected node to be the first node
    if (data.isFirstNode && deleteChain) {
      const outgoingEdges = edges.filter(edge => edge.source === id);
      if (outgoingEdges.length > 0) {
        // Get the first connected node and make it the first node
        const nextNodeId = outgoingEdges[0].target;
        updateNode(nextNodeId, { isFirstNode: true });
      }
    }

    if (deleteChain) {
      // Delete the node and all nodes below it
      const nodesToDelete = [id];

      // Recursively find all downstream nodes
      const findDownstreamNodes = (nodeId: string) => {
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        outgoingEdges.forEach(edge => {
          nodesToDelete.push(edge.target);
          findDownstreamNodes(edge.target);
        });
      };
      findDownstreamNodes(id);

      // Delete all nodes
      nodesToDelete.forEach(nodeId => {
        removeNode(nodeId);
      });
    } else {
      // Delete just the node and reconnect nodes

      // If this is the first node and we're only deleting this node, promote the next node
      if (data.isFirstNode) {
        const outgoingEdges = edges.filter(edge => edge.source === id);
        if (outgoingEdges.length > 0) {
          const nextNodeId = outgoingEdges[0].target;
          updateNode(nextNodeId, { isFirstNode: true });
        }
      }

      // Find incoming edges to this node
      const incomingEdges = edges.filter(edge => edge.target === id);

      // Find outgoing edges from this node
      const outgoingEdges = edges.filter(edge => edge.source === id);

      // For each incoming edge, connect it to each outgoing edge
      if (incomingEdges.length && outgoingEdges.length) {
        const newEdges = [...edges];

        // Get nodes for position calculation
        const {
          getNode
        } = reactFlowInstance;
        const currentNode = getNode(id);

        // Remove all edges connected to this node
        const filteredEdges = newEdges.filter(edge => edge.source !== id && edge.target !== id);

        // Create new connections between incoming and outgoing nodes
        const newConnections = incomingEdges.flatMap(incoming => {
          const sourceNode = getNode(incoming.source);
          return outgoingEdges.map(outgoing => {
            const targetNode = getNode(outgoing.target);

            // Calculate the edge path based on node positions
            // This creates a more direct connection when a node is deleted
            return {
              id: `${incoming.source}-${outgoing.target}`,
              source: incoming.source,
              target: outgoing.target,
              sourceHandle: incoming.sourceHandle,
              type: 'straight',
              animated: false,
              style: {
                stroke: '#94a3b8',
                strokeWidth: 1
              }
            };
          });
        });

        setEdges([...filteredEdges, ...newConnections]);
      }

      // Remove the node
      removeNode(id);
    }
  }, [id, removeNode, reactFlowInstance, data.isFirstNode, updateNode]);

  // Handle toggle enabled/disabled
  const handleToggleEnabled = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeEnabled(id);
  }, [id, toggleNodeEnabled]);

  // Handle add node from this node
  const handleAddNode = useCallback((e: React.MouseEvent, sourceHandle?: 'true' | 'false') => {
    e.stopPropagation();

    setCurrentSourceNodeId(id);
    if (sourceHandle) {
      updateNode(id, { selectedOutputHandle: sourceHandle });
    }
    setIsAddNodeDialogOpen(true);
  }, [id, setCurrentSourceNodeId, setIsAddNodeDialogOpen, updateNode]);

  // Handle drag over for node placement
  const handleDragOver = useCallback((e: React.DragEvent, sourceHandle?: 'true' | 'false') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sourceHandle) {
      setIsDraggingOver(sourceHandle);
    } else {
      // For regular nodes, set a specific dragging state
      setIsDraggingOver('regular');
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, sourceHandle?: 'true' | 'false') => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling to prevent FlowWrapper onDrop
    setIsDraggingOver(null);

    const nodeType = e.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    if (hasConnections(sourceHandle)) return;

    const plugin = nodeRegistry.getPlugin(nodeType);
    if (!plugin) return;

    const node = reactFlowInstance.getNode(id);
    if (!node) return;

    const offsetY = 200;
    const sourceNodeWidth = 200;
    const newNodeWidth = 200;
    
    // Calculate position - inherit X from parent to maintain vertical column alignment
    const sourceNodeCenter = node.position.x + (sourceNodeWidth / 2);
    let newNodeX: number;

    // For conditional nodes, offset the position based on which branch
    if (isConditionNode && sourceHandle) {
      const branchOffset = 150; // Distance between true and false branches
      if (sourceHandle === 'true') {
        newNodeX = sourceNodeCenter - branchOffset - (newNodeWidth / 2);
      } else if (sourceHandle === 'false') {
        newNodeX = sourceNodeCenter + branchOffset - (newNodeWidth / 2);
      } else {
        newNodeX = sourceNodeCenter - (newNodeWidth / 2);
      }
    } else {
      // For non-conditional parents: inherit parent's X position to maintain straight vertical line
      // This keeps nodes in their branch column instead of centering them
      newNodeX = node.position.x;
    }

    // Special handling for node types that need their own visual components
    let nodeComponentType = 'custom';
    if (nodeType === 'condition') {
      nodeComponentType = 'conditional';
    } else if (nodeType === 'loop-node') {
      nodeComponentType = 'loop';
    } else if (nodeType === 'for-each-loop') {
      nodeComponentType = 'for-each-loop';
    }

    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: nodeComponentType,
      position: {
        x: newNodeX,
        y: node.position.y + offsetY
      },
      data: {
        label: plugin.name,
        type: nodeType,
        category: plugin.category,
        inputs: {},
        color: plugin.color,
      }
    };

    useFlowStore.getState().addNode(newNode);

    useFlowStore.getState().onConnect({
      source: id,
      sourceHandle: sourceHandle,
      target: newNodeId,
      type: 'straight'
    });
  }, [id, reactFlowInstance, isConditionNode]);

  // Check if we should show the "Delete Node & Chain" option
  const shouldShowDeleteChain = hasOutgoingConnections();

  // Regular node rendering (non-conditional nodes)
  return (
    <>
      <div className="relative">
        
        {/* Category badge positioned above the node */}
        {nodeCategory && (
          <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '-34px' }}>
            <Badge 
              className={cn(
                "text-xs px-2 py-1 text-white border-0",
                nodeCategory.toLowerCase() === 'action' && "bg-purple-500",
                nodeCategory.toLowerCase() === 'trigger' && "bg-green-500", 
                nodeCategory.toLowerCase() === 'transformer' && "bg-blue-500",
                nodeCategory.toLowerCase() === 'condition' && "bg-orange-500",
                !['action', 'trigger', 'transformer', 'condition'].includes(nodeCategory.toLowerCase()) && "bg-gray-500"
              )}
            >
              {nodeCategory.toLowerCase()}
            </Badge>
          </div>
        )}
        
        <Card className={cn(
          "px-4 py-3 w-[200px] bg-card shadow-sm relative",
          selected && "ring-[0.7px] ring-primary",
          isErrorNode && "border-destructive bg-destructive/10",
          data.disabled && "opacity-60"
        )}
        onClick={handleNodeClick}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        draggable={!hasAnyConnections()}>
          
          <div className="flex items-center justify-between relative z-20">
            <div className="flex items-center gap-2">
              {plugin?.icon ? (
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-border shadow-sm"
                  style={{ backgroundColor: data.type === 'firecrawl' ? '#ff660020' : (plugin?.color ? `${plugin.color}15` : '#0ea5e915') }}
                >
                  {data.type === 'firecrawl' ? (
                    <svg fill="none" height="14" viewBox="0 0 20 20" width="14" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
                        fill="#FF6600"
                      />
                    </svg>
                  ) : data.type === 'snowflake' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="14" height="14" role="img" aria-label="Snowflake mark">
                      <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="m27 12.094-3.3 1.908 3.3 1.902a1.739 1.739 0 1 1-1.737 3.012l-5.911-3.412a1.718 1.718 0 0 1-.79-.993 1.7 1.7 0 0 1-.078-.565c.004-.137.024-.274.06-.411a1.75 1.75 0 0 1 .806-1.045l5.909-3.408a1.737 1.737 0 0 1 2.373.638A1.73 1.73 0 0 1 27 12.093Zm-3.125 9.246-5.906-3.406a1.708 1.708 0 0 0-1.007-.228 1.735 1.735 0 0 0-1.608 1.734v6.82a1.739 1.739 0 1 0 3.477 0v-3.815l3.307 1.909a1.734 1.734 0 0 0 2.374-.634 1.744 1.744 0 0 0-.637-2.38Zm-6.816-6.672-2.456 2.453a.486.486 0 0 1-.308.13H13.574a.495.495 0 0 1-.308-.13l-2.456-2.453a.492.492 0 0 1-.127-.306V13.64c0-.1.056-.239.127-.31l2.454-2.452a.492.492 0 0 1 .308-.128H14.295c.1 0 .237.056.308.128l2.456 2.453c.07.07.127.209.127.31v.722a.501.501 0 0 1-.127.306Zm-1.963-.68a.517.517 0 0 0-.131-.31l-.71-.709a.5.5 0 0 0-.309-.129h-.028a.494.494 0 0 0-.306.13l-.71.708a.51.51 0 0 0-.125.31v.028c0 .099.054.236.124.306l.711.71c.07.071.207.13.306.13h.028a.504.504 0 0 0 .308-.13l.711-.71a.5.5 0 0 0 .13-.306v-.028ZM3.993 6.656l5.909 3.41c.318.183.67.256 1.008.228a1.74 1.74 0 0 0 1.609-1.736v-6.82a1.739 1.739 0 0 0-3.477 0v3.816l-3.31-1.912a1.74 1.74 0 0 0-1.74 3.014Zm12.97 3.638a1.72 1.72 0 0 0 1.006-.228l5.906-3.41a1.742 1.742 0 0 0 .637-2.378 1.738 1.738 0 0 0-2.374-.636L18.83 5.555V1.736a1.738 1.738 0 0 0-3.476 0v6.821a1.737 1.737 0 0 0 1.608 1.736Zm-6.053 7.412a1.708 1.708 0 0 0-1.008.228l-5.91 3.406a1.745 1.745 0 0 0-.635 2.38 1.738 1.738 0 0 0 2.373.634l3.31-1.909v3.816a1.737 1.737 0 1 0 3.477 0V19.44a1.734 1.734 0 0 0-1.607-1.734Zm-1.602-3.195c.058-.185.082-.376.078-.565a1.733 1.733 0 0 0-.872-1.456L2.61 9.082a1.736 1.736 0 0 0-2.374.638 1.733 1.733 0 0 0 .636 2.373l3.3 1.909L.87 15.904a1.739 1.739 0 1 0 1.738 3.012l5.905-3.412c.4-.228.67-.588.795-.993Z"/>
                    </svg>
                  ) : (typeof plugin?.icon === 'string') ? (
                    <LogoIcon 
                      icon={plugin.icon} 
                      alt={plugin.name || 'Node'} 
                      size="sm"
                      color={plugin.color}
                    />
                  ) : (plugin?.icon && (typeof plugin.icon === 'function' || typeof plugin.icon === 'object')) ? (
                    (() => {
                      const IconComponent = plugin.icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
                      const iconColor = plugin?.color === '#000000' ? 'currentColor' : (plugin?.color || '#0ea5e9');
                      return <IconComponent className="h-4 w-4" style={{ color: iconColor }} />;
                    })()
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: plugin?.color || '#0ea5e9' }}>
                      {(plugin?.name || data.label || 'N').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ) : (
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-border shadow-sm"
                  style={{ backgroundColor: '#0ea5e920' }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#0ea5e9' }}>
                    {(data.label || 'N').toString().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xs font-normal">{data.label || "Unnamed Node"}</h3>
                <p className="text-xs text-muted-foreground">{getNodeSubtitle()}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem onClick={handleRunSingleNode} disabled={isRunningNode || data.disabled}>
                  {isRunningNode ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test Run Node
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleEnabled}>
                  <Power className="h-4 w-4 mr-2" />
                  {data.disabled ? "Enable Node" : "Disable Node"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={e => handleDeleteNode(false, e)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Node Only
                </DropdownMenuItem>
                {shouldShowDeleteChain && (
                  <DropdownMenuItem onClick={e => handleDeleteNode(true, e)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Node & Chain
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Drop zone area inside the node - exactly like the reference image */}
          {isDragInProgress && !hasConnections() && (
            <div className="mt-3 border border-dashed border-muted-foreground/30 rounded-md p-4 bg-muted/10">
              <div className="text-center text-sm text-muted-foreground">
                Drag a new node here
              </div>
            </div>
          )}
          
          {/* Input handle - PERFECTLY centered and invisible */}
          {!data.isFirstNode && (
            <Handle 
              type="target" 
              position={Position.Top} 
              className="!w-2 !h-2 !bg-transparent !border-0 !left-1/2 !top-0 !transform !-translate-x-1/2"
              style={{ 
                position: 'absolute',
                left: '50%',
                top: '0px',
                transform: 'translateX(-50%)',
                width: '2px',
                height: '2px',
                background: 'transparent',
                border: 'none'
              }} 
            />
          )}
          
          {/* Conditional rendering for condition nodes vs regular nodes */}
          {isConditionNode ? (
            <div className="absolute -bottom-32 left-0 right-0 flex justify-between px-24">
              {/* True path */}
              <div className="flex flex-col items-center relative">
                <div className="absolute top-0 right-0 w-[150px] h-px bg-zinc-200 dark:bg-zinc-700" />
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="true"
                  className="!border-0 !bg-transparent"
                />
                <span className="text-xs font-medium mt-1 text-green-600">True</span>
                
                <div
                  className={cn(
                    "mt-2 w-8 h-8 rounded-full bg-background border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center transition-colors cursor-pointer relative z-30",
                    hasConnections('true') ? "opacity-50 cursor-not-allowed" : "hover:border-primary",
                    isDraggingOver === 'true' && "border-primary bg-primary/10"
                  )}
                  onClick={(e) => !hasConnections('true') && handleAddNode(e, 'true')}
                  onDragOver={(e) => handleDragOver(e, 'true')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'true')}
                >
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              
              {/* False path */}
              <div className="flex flex-col items-center relative">
                <div className="absolute top-0 left-0 w-[150px] h-px bg-zinc-200 dark:bg-zinc-700" />
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id="false"
                  className="!border-0 !bg-transparent"
                />
                <span className="text-xs font-medium mt-1 text-red-600">False</span>
                
                <div
                  className={cn(
                    "mt-2 w-8 h-8 rounded-full bg-background border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center transition-colors cursor-pointer relative z-30",
                    hasConnections('false') ? "opacity-50 cursor-not-allowed" : "hover:border-primary",
                    isDraggingOver === 'false' && "border-primary bg-primary/10"
                  )}
                  onClick={(e) => !hasConnections('false') && handleAddNode(e, 'false')}
                  onDragOver={(e) => handleDragOver(e, 'false')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'false')}
                >
                  <Plus className="h-4 w-4" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Output handle for regular nodes - PERFECTLY centered and invisible */}
              <Handle 
                type="source" 
                position={Position.Bottom} 
                className="!w-2 !h-2 !bg-transparent !border-0 !left-1/2 !bottom-0 !transform !-translate-x-1/2"
                style={{ 
                  position: 'absolute',
                  left: '50%',
                  bottom: '0px',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '2px',
                  background: 'transparent',
                  border: 'none'
                }} 
                isConnectableStart={!hasConnections()} 
                isConnectable={!hasConnections()}
              />
                
              {/* Add node button positioned at the bottom center of the node */}
              <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn(
                    "w-6 h-6 rounded-full p-0 relative z-30",
                    isDraggingOver === 'regular' ? "border-primary bg-primary/10" : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm",
                    hasConnections() && "opacity-40 cursor-not-allowed"
                  )}
                  onClick={e => !hasConnections() && handleAddNode(e)} 
                  onDragOver={handleDragOver} 
                  onDragLeave={handleDragLeave} 
                  onDrop={handleDrop} 
                  disabled={hasConnections()}
                >
                  <Plus className="h-3 w-3 text-gray-600" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
