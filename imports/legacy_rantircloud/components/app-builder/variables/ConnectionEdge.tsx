import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Settings, X } from 'lucide-react';

interface ConnectionEdgeProps extends EdgeProps {
  data?: {
    sourceField?: string;
    targetField?: string;
    onConfigureJoin?: (edgeId: string, sourceField: string, targetField: string) => void;
  };
}

export function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: ConnectionEdgeProps) {
  const { setEdges, setNodes } = useReactFlow();
  const { sourceField, targetField, onConfigureJoin } = data || {};

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleConfigureJoin = () => {
    if (sourceField && targetField) {
      onConfigureJoin?.(id, sourceField, targetField);
    }
  };

  const handleDeleteConnection = () => {
    // Remove the edge
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    
    // Update nodes to remove connected field status
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.data?.connectedFields && Array.isArray(node.data.connectedFields)) {
          const updatedConnectedFields = node.data.connectedFields.filter(
            (field: string) => field !== sourceField && field !== targetField
          );
          return {
            ...node,
            data: {
              ...node.data,
              connectedFields: updatedConnectedFields,
            },
          };
        }
        return node;
      })
    );
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          strokeWidth: selected ? 3 : 2,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeOpacity="0.2"
        />
      )}
      
      {sourceField && targetField && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  {sourceField} → {targetField}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConfigureJoin}
                  className="h-6 px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteConnection}
                  className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}