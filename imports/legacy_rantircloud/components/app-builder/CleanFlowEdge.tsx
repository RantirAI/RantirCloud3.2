import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export function CleanFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.15,
  });

  return (
    <BaseEdge 
      path={edgePath} 
      markerEnd={markerEnd} 
      style={{
        ...style,
        strokeWidth: 2,
        stroke: 'hsl(var(--primary))',
        strokeLinecap: 'round',
      }} 
    />
  );
}