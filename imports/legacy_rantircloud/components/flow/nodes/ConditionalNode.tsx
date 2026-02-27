
import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { Plus, Trash2, Power, MoreVertical, Play, Loader2 } from 'lucide-react';
import { NodeData, FlowNode } from '@/types/flowTypes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dataContextManager } from '@/lib/data-context';
import { treeLayoutManager } from '@/lib/tree-layout';
import { ConditionCase } from '@/nodes/condition';

interface ConditionalNodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

// Branch configuration interface for dynamic branches
interface BranchConfig {
  id: string;
  label: string;
  color: string;
}

export function ConditionalNode({ id, data, selected }: ConditionalNodeProps) {
  const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null);
  const [isRunningNode, setIsRunningNode] = useState(false);
  
  const {
    setCurrentSelectedNodeId,
    removeNode,
    toggleNodeEnabled,
    errorNodes,
    setCurrentSourceNodeId,
    setCurrentSourceHandle,
    setIsAddNodeDialogOpen,
    updateNode,
    addDebugLog,
    nodes,
    edges,
    addNode,
    onConnect,
    setNodes,
    setEdges
  } = useFlowStore();
  
  const reactFlowInstance = useReactFlow();
  const plugin = nodeRegistry.getPlugin('condition');
  const isErrorNode = errorNodes.includes(id);

  // Calculate dynamic branches based on mode
  const branches: BranchConfig[] = useMemo(() => {
    const isMultiCondition = data.inputs?.multipleConditions === true;
    const returnType = data.inputs?.returnType || 'boolean';
    
    if (!isMultiCondition) {
      // Simple mode: TRUE/FALSE
      return [
        { id: 'true', label: 'TRUE', color: 'hsl(142 76% 36%)' },
        { id: 'false', label: 'FALSE', color: 'hsl(0 84% 60%)' }
      ];
    }
    
    if (returnType === 'string' || returnType === 'integer') {
      // Multi-condition with string/integer return type
      let cases: ConditionCase[] = [];
      try {
        const casesValue = data.inputs?.cases;
        cases = typeof casesValue === 'string' ? JSON.parse(casesValue || '[]') : (casesValue || []);
      } catch (e) {
        cases = [];
      }
      
      // Create branches for unique return values
      const uniqueValues = [...new Set(cases.map(c => c.returnValue))];
      const colors = [
        'hsl(221 83% 53%)', // blue
        'hsl(262 83% 58%)', // purple
        'hsl(25 95% 53%)',  // orange
        'hsl(47 96% 53%)',  // yellow
        'hsl(173 80% 40%)', // teal
        'hsl(339 90% 51%)', // pink
      ];
      
      const branchList: BranchConfig[] = uniqueValues.map((value, i) => ({
        id: value,
        label: String(value).toUpperCase(),
        color: colors[i % colors.length]
      }));
      
      // Always add ELSE branch
      branchList.push({ id: 'else', label: 'ELSE', color: 'hsl(var(--muted-foreground))' });
      
      return branchList;
    }
    
    // Multi-condition with boolean return type - still TRUE/FALSE
    return [
      { id: 'true', label: 'TRUE', color: 'hsl(142 76% 36%)' },
      { id: 'false', label: 'FALSE', color: 'hsl(0 84% 60%)' }
    ];
  }, [data.inputs?.multipleConditions, data.inputs?.returnType, data.inputs?.cases]);

  // Handle node click
  const handleNodeClick = useCallback(() => {
    setCurrentSelectedNodeId(id);
  }, [id, setCurrentSelectedNodeId]);

  // Handle run single node
  const handleRunSingleNode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!plugin || data.disabled) return;
    
    setIsRunningNode(true);
    
    try {
      addDebugLog({
        nodeId: id,
        nodeName: data.label as string,
        type: 'info',
        message: `Testing conditional node: ${data.label}`,
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
        variables: {},
        getChildNodes: (nodeId: string) => nodes.filter(n => n.data.parentLoopId === nodeId),
        executeNode: async () => ({ message: 'Single node test execution' }),
      };

      const result = await plugin.execute?.(data.inputs || {}, executionContext);

      if (result) {
        dataContextManager.storeNodeData(id, data.label as string, result);
        
        addDebugLog({
          nodeId: id,
          nodeName: data.label as string,
          type: 'output',
          message: `Condition evaluated to: ${result.result ? 'TRUE' : 'FALSE'}`,
          data: result,
        });
      }

    } catch (error: any) {
      addDebugLog({
        nodeId: id,
        nodeName: data.label as string,
        type: 'error',
        message: `Conditional node test failed: ${error.message}`,
      });
    } finally {
      setIsRunningNode(false);
    }
  }, [id, data, plugin, addDebugLog, nodes]);

  // Handle delete node
  const handleDeleteNode = useCallback((deleteChain: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (deleteChain) {
      // Collect this node and all downstream nodes once, then remove in a single state update to avoid UI hangs
      const nodesToDelete = new Set<string>([id]);
      const collectDownstream = (nodeId: string) => {
        edges
          .filter(edge => edge.source === nodeId)
          .forEach(edge => {
            if (!nodesToDelete.has(edge.target)) {
              nodesToDelete.add(edge.target);
              collectDownstream(edge.target);
            }
          });
      };
      collectDownstream(id);

      const remainingNodes = nodes.filter(n => !nodesToDelete.has(n.id));
      const remainingEdges = edges.filter(e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target));

      setNodes(remainingNodes);
      setEdges(remainingEdges);
    } else {
      removeNode(id);
    }
  }, [id, nodes, edges, setNodes, setEdges, removeNode]);

  // Handle toggle enabled
  const handleToggleEnabled = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeEnabled(id);
  }, [id, toggleNodeEnabled]);

  // Handle add node - now accepts any branch id
  const handleAddNode = useCallback((e: React.MouseEvent, sourceHandle: string) => {
    e.stopPropagation();
    setCurrentSourceNodeId(id);
    setCurrentSourceHandle(sourceHandle);
    setIsAddNodeDialogOpen(true);
  }, [id, setCurrentSourceNodeId, setCurrentSourceHandle, setIsAddNodeDialogOpen]);

  // Handle drag over - now accepts any branch id
  const handleDragOver = useCallback((e: React.DragEvent, sourceHandle: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(sourceHandle);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(null);
  }, []);

  // Handle drop with precise positioning using index-based branch positioning
  const handleDrop = useCallback((e: React.DragEvent, sourceHandle: string) => {
    e.preventDefault();
    setIsDraggingOver(null);

    const nodeType = e.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    const droppedPlugin = nodeRegistry.getPlugin(nodeType);
    if (!droppedPlugin) return;

    // Get current node position for precise index-based positioning
    const currentNode = nodes.find(n => n.id === id);
    if (!currentNode) return;

    const nodeWidth = 200;
    const parentCenterX = currentNode.position.x + nodeWidth / 2;
    
    // Calculate position using same formula as the visual SVG rendering
    const branchIndex = branches.findIndex(b => b.id === sourceHandle);
    const branchCount = branches.length;
    const minBranchSpacing = 220; // Increased for better visibility with multiple branches
    const totalWidth = (branchCount - 1) * minBranchSpacing;
    const xOffset = -totalWidth / 2 + branchIndex * minBranchSpacing;
    
    const position = {
      x: parentCenterX + xOffset - nodeWidth / 2,
      y: currentNode.position.y + 350 // Use same vertical spacing as flow-store
    };
    
    // Determine the React Flow node type based on the plugin type
    const getNodeType = (pluginType: string) => {
      if (pluginType === 'condition') return 'conditional';
      if (pluginType === 'for-each-loop') return 'for-each-loop';
      return 'custom';
    };

    const newNodeId = `node-${Date.now()}`;
    const newNode: FlowNode = {
      id: newNodeId,
      type: getNodeType(nodeType),
      position,
      data: {
        label: droppedPlugin.name,
        type: nodeType,
        category: droppedPlugin.category,
        inputs: {},
        color: droppedPlugin.color,
      }
    };

    addNode(newNode);
    onConnect({
      source: id,
      sourceHandle,
      target: newNodeId,
      type: 'step'
    });
  }, [id, addNode, onConnect, nodes, edges, branches]);

  // Check if branch has connections - now accepts any branch id
  const hasConnections = (sourceHandle: string) => {
    return edges.some(edge => edge.source === id && edge.sourceHandle === sourceHandle);
  };

  const nodeCategory = plugin?.category || 'condition';
  const hasOutgoingConnections = edges.some(edge => edge.source === id);

  // Calculate branch positions dynamically based on number of branches
  const branchCount = branches.length;
  const minBranchSpacing = 220; // Minimum space between branches - increased for better visibility
  const nodeHeight = 56;
  const parentNodeWidth = 200;
  const defaultUnconnectedHeight = 140;

  // Get current node position
  const currentNode = useMemo(() => nodes.find(n => n.id === id), [id, nodes]);

  // Calculate branch offsets (evenly distributed from center)
  const branchLayout = useMemo(() => {
    // Calculate default positions (centered around 0)
    const totalWidth = (branchCount - 1) * minBranchSpacing;
    
    return branches.map((branch, index) => {
      // Default x position relative to center (0)
      const defaultXOffset = -totalWidth / 2 + index * minBranchSpacing;
      
      // Find connected child for this branch
      const connectedEdge = edges.find(e => e.source === id && e.sourceHandle === branch.id);
      const connectedChild = connectedEdge ? nodes.find(n => n.id === connectedEdge.target) : null;
      
      // Calculate actual offset based on connected child position
      let actualXOffset = defaultXOffset;
      let childDistance = defaultUnconnectedHeight;
      
      if (connectedChild && currentNode) {
        const parentCenterX = currentNode.position.x + parentNodeWidth / 2;
        const childCenterX = connectedChild.position.x + parentNodeWidth / 2;
        actualXOffset = childCenterX - parentCenterX;
        childDistance = Math.max(120, connectedChild.position.y - currentNode.position.y - nodeHeight);
      }
      
      return {
        ...branch,
        xOffset: actualXOffset,
        defaultXOffset,
        isConnected: !!connectedChild,
        childDistance,
        stemEndY: connectedChild ? childDistance + 10 : defaultUnconnectedHeight
      };
    });
  }, [branches, edges, nodes, id, currentNode, branchCount]);

  // Calculate SVG dimensions - width needs to cover all branches
  const svgDimensions = useMemo(() => {
    const allOffsets = branchLayout.map(b => b.isConnected ? b.xOffset : b.defaultXOffset);
    const minOffset = Math.min(...allOffsets);
    const maxOffset = Math.max(...allOffsets);
    const maxStemY = Math.max(...branchLayout.map(b => b.stemEndY));
    
    // Add padding around branches
    const padding = 60;
    const width = maxOffset - minOffset + padding * 2;
    const height = Math.max(216, maxStemY + 40);
    
    // leftShift is how far left of center the SVG starts
    const leftShift = -minOffset + padding;
    
    return { width, height, minOffset, maxOffset, leftShift };
  }, [branchLayout]);

  return (
    <div className="relative">
      {/* Category badge */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '-34px' }}>
        <Badge className="text-xs px-2 py-1 text-white border-0 bg-orange-500">
          {nodeCategory}
        </Badge>
      </div>
      
      {/* Main conditional node */}
      <Card className={cn(
        "px-4 py-3 w-[200px] bg-card shadow-sm relative",
        selected && "ring-[0.7px] ring-primary",
        isErrorNode && "border-destructive bg-destructive/10",
        data.disabled && "opacity-60"
      )}
      onClick={handleNodeClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {plugin?.icon && (
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${plugin.color}20` }}
              >
                {plugin.type === 'apollo' ? (
                  <img 
                    src="https://cdn.activepieces.com/pieces/apollo.png" 
                    alt="Apollo" 
                    className="h-3 w-3 object-cover"
                  />
                ) : (typeof plugin.icon === 'string') ? (
                  <img 
                    src={plugin.icon} 
                    alt={plugin.name} 
                    className="h-3 w-3 object-cover"
                  />
                ) : (
                  <plugin.icon className="h-3 w-3" style={{ color: plugin.color }} />
                )}
              </div>
            )}
            <div>
              <h3 className="text-xs font-normal">{data.label || "Condition"}</h3>
              <p className="text-xs text-muted-foreground">condition</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600" 
                     onClick={e => e.stopPropagation()}>
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
                    Test Condition
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
              {hasOutgoingConnections && (
                <DropdownMenuItem onClick={e => handleDeleteNode(true, e)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Node & Chain
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Input handle - centered at top */}
      {!data.isFirstNode && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-3 !h-3 !bg-primary !border-0 !rounded-full"
          style={{ 
            position: 'absolute',
            left: '50%',
            top: '0px',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        />
      )}

      {/* Branch guide lines - dynamically rendered for all branches */}
      <div 
        className="absolute pointer-events-none" 
        style={{ 
          top: `${nodeHeight - 1}px`, 
          width: `${svgDimensions.width}px`, 
          height: `${svgDimensions.height}px`,
          left: `calc(50% - ${svgDimensions.leftShift}px)`,
          zIndex: 50
        }}
      >
        <svg 
          width={svgDimensions.width} 
          height={svgDimensions.height} 
          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} 
          fill="none"
        >
          {/* Vertical trunk from node center */}
          <path 
            d={`M${svgDimensions.leftShift} 0 L${svgDimensions.leftShift} 36`}
            stroke="hsl(var(--muted-foreground) / 0.3)" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
          />
          
          {/* Dynamic branch lines */}
          {branchLayout.map((branch) => {
            const branchOffset = branch.isConnected ? branch.xOffset : branch.defaultXOffset;
            const branchX = svgDimensions.leftShift + branchOffset;
            const centerX = svgDimensions.leftShift;
            const direction = branchOffset < 0 ? -1 : branchOffset > 0 ? 1 : 0;
            
            // For centered branch (offset = 0), draw straight down
            if (direction === 0) {
              return (
                <g key={branch.id}>
                  <path 
                    d={`M${centerX} 36 L${centerX} ${branch.stemEndY}`}
                    stroke="hsl(var(--muted-foreground) / 0.3)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    fill="none"
                  />
                  {/* Branch label */}
                  {(() => {
                    const labelY = 60 + (branch.stemEndY - 60) / 2;
                    const labelWidth = Math.max(44, branch.label.length * 8 + 16);
                    return (
                      <g>
                        <rect
                          x={centerX - labelWidth / 2}
                          y={labelY - 9}
                          width={labelWidth}
                          height="18"
                          rx="9"
                          fill="hsl(var(--card))"
                          stroke={branch.color}
                          strokeWidth="1"
                        />
                        <text
                          x={centerX}
                          y={labelY + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill={branch.color}
                        >
                          {branch.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            }
            
            return (
              <g key={branch.id}>
                {/* Branch line with curve */}
                <path 
                  d={`M${centerX} 36 Q${centerX} 48 ${centerX + (direction * 12)} 48 L${branchX - (direction * 12)} 48 Q${branchX} 48 ${branchX} 60 L${branchX} ${branch.stemEndY}`}
                  stroke="hsl(var(--muted-foreground) / 0.3)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
                
                {/* Branch label */}
                {(() => {
                  const labelY = 60 + (branch.stemEndY - 60) / 2;
                  const labelWidth = Math.max(44, branch.label.length * 8 + 16);
                  return (
                    <g>
                      <rect
                        x={branchX - labelWidth / 2}
                        y={labelY - 9}
                        width={labelWidth}
                        height="18"
                        rx="9"
                        fill="hsl(var(--card))"
                        stroke={branch.color}
                        strokeWidth="1"
                      />
                      <text
                        x={branchX}
                        y={labelY + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={branch.color}
                      >
                        {branch.label}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic branch buttons and handles */}
      {branchLayout.map((branch) => {
        const branchX = branch.isConnected ? branch.xOffset : branch.defaultXOffset;
        
        return (
          <div 
            key={branch.id}
            className="absolute" 
            style={{ 
              top: `${nodeHeight + branch.stemEndY + 4}px`, 
              left: `calc(50% + ${branchX}px)`,
              transform: 'translate(-50%, 0)'
            }}
          >
            <div className="flex flex-col items-center relative">
              {!branch.isConnected && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn(
                    "w-8 h-8 rounded-full border-border bg-card",
                    isDraggingOver === branch.id && "border-primary"
                  )}
                  style={{ 
                    borderColor: isDraggingOver === branch.id ? branch.color : undefined,
                  }}
                  onClick={e => handleAddNode(e, branch.id)} 
                  onDragOver={e => handleDragOver(e, branch.id)} 
                  onDragLeave={handleDragLeave} 
                  onDrop={e => handleDrop(e, branch.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Handle 
                type="source" 
                position={Position.Bottom} 
                id={branch.id} 
                className="!w-3 !h-3 !border-0 !rounded-full"
                style={{ 
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  backgroundColor: branch.color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
