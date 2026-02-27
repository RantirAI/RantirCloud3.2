
import React from 'react';
import { BaseEdge, EdgeProps } from '@xyflow/react';

export function StraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
}: EdgeProps) {
  // Create a perfectly straight vertical path
  const edgePath = `M${sourceX},${sourceY}L${targetX},${targetY}`;

  return (
    <BaseEdge 
      path={edgePath} 
      markerEnd={markerEnd} 
      style={{
        ...style,
        strokeWidth: style?.strokeWidth || 2,
        stroke: style?.stroke || 'hsl(var(--primary))',
        strokeLinecap: 'round',
        strokeDasharray: '0',
      }} 
    />
  );

}
