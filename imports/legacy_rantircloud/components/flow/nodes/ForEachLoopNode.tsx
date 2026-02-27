import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/lib/flow-store';
import { Plus, Trash2, Power, MoreVertical, Repeat } from 'lucide-react';
import { NodeData } from '@/types/flowTypes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ForEachLoopNodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

export function ForEachLoopNode({ id, data, selected }: ForEachLoopNodeProps) {
  const {
    setCurrentSelectedNodeId,
    removeNode,
    toggleNodeEnabled,
    errorNodes,
    setCurrentSourceNodeId,
    setCurrentSourceHandle,
    setIsAddNodeDialogOpen,
    nodes,
    edges,
    setNodes,
    setEdges
  } = useFlowStore();
  
  const isErrorNode = errorNodes.includes(id);

  // Handle node click
  const handleNodeClick = useCallback(() => {
    setCurrentSelectedNodeId(id);
  }, [id, setCurrentSelectedNodeId]);

  // Handle delete node
  const handleDeleteNode = useCallback((deleteChain: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (deleteChain) {
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

  // Handle add node
  const handleAddNode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSourceNodeId(id);
    setCurrentSourceHandle(null);
    setIsAddNodeDialogOpen(true);
  }, [id, setCurrentSourceNodeId, setCurrentSourceHandle, setIsAddNodeDialogOpen]);

  const hasOutgoingConnections = edges.some(edge => edge.source === id);

  // Get display info from new loopVariables format
  const loopVariables = data.inputs?.loopVariables || [];
  const hasVariables = loopVariables.length > 0 && loopVariables.some((v: any) => v.sourceNodeId && v.variableName);
  const variableNames = loopVariables
    .filter((v: any) => v.variableName)
    .map((v: any) => `{{${v.variableName}}}`)
    .join(', ');
  const displayLabel = hasVariables 
    ? (variableNames.length > 25 ? variableNames.slice(0, 22) + '...' : variableNames)
    : 'for-each-loop';

  return (
    <div className="relative">
      {/* Category badge */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '-34px' }}>
        <Badge className="text-xs px-2 py-1 text-white border-0" style={{ backgroundColor: '#9333ea' }}>
          loop
        </Badge>
      </div>
      
      {/* Main loop node */}
      <Card className={cn(
        "px-4 py-3 w-[200px] bg-card shadow-sm relative",
        selected && "ring-[0.7px] ring-primary",
        isErrorNode && "border-destructive bg-destructive/10",
        data.disabled && "opacity-60"
      )}
      onClick={handleNodeClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/50"
              style={{ backgroundColor: 'hsl(270 70% 55% / 0.15)' }}
            >
              <Repeat className="h-4 w-4" style={{ color: '#9333ea' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-normal truncate">{data.label || "For Each"}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {displayLabel}
              </p>
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

      {/* Output handle - centered at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-primary !border-0 !rounded-full"
        style={{ 
          position: 'absolute',
          left: '50%',
          bottom: '0px',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      />

      {/* Add button - at bottom center */}
      <div className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: '-40px' }}>
        <Button 
          variant="outline" 
          size="icon" 
          className="w-8 h-8 rounded-full border-border bg-card"
          onClick={handleAddNode}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
