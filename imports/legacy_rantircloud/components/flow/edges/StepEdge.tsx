
import React from 'react';
import { BaseEdge, EdgeProps, useReactFlow } from '@xyflow/react';

/**
 * StepEdge - Creates orthogonal paths with rounded corners for conditional branches
 * 
 * Path structure:
 * 1. Vertical drop from source
 * 2. Rounded corner
 * 3. Horizontal line to target X
 * 4. Rounded corner
 * 5. Vertical drop to target
 */
export function StepEdge({
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
  data,
}: EdgeProps) {
  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  
  // Hide edge if source is a conditional node - the ConditionalNode's SVG bracket handles the visual
  const isConditionalSource = sourceNode?.type === 'conditional' || sourceNode?.type === 'condition';
  if (isConditionalSource) {
    return null;
  }

  const borderRadius = 12;
  
  // Calculate if we're going left or right
  const isGoingRight = targetX > sourceX;
  const isGoingLeft = targetX < sourceX;
  const isStraight = Math.abs(targetX - sourceX) < 5;
  
  let edgePath: string;
  
  if (isStraight) {
    // Simple vertical line for straight paths
    edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  } else {
    // Calculate the midpoint Y for the horizontal segment
    const midY = sourceY + (targetY - sourceY) * 0.35;
    
    // Direction multiplier
    const dir = isGoingRight ? 1 : -1;
    
    // Clamp radius to avoid overshooting
    const horizontalDistance = Math.abs(targetX - sourceX);
    const verticalToMid = midY - sourceY;
    const verticalFromMid = targetY - midY;
    
    const r = Math.min(borderRadius, horizontalDistance / 2, verticalToMid / 2, verticalFromMid / 2);
    
    // Build path with rounded corners using quadratic bezier curves
    edgePath = [
      // Start at source
      `M${sourceX},${sourceY}`,
      // Vertical drop to just before the first corner
      `L${sourceX},${midY - r}`,
      // First rounded corner (curve towards horizontal)
      `Q${sourceX},${midY} ${sourceX + (dir * r)},${midY}`,
      // Horizontal line to just before second corner
      `L${targetX - (dir * r)},${midY}`,
      // Second rounded corner (curve towards vertical)
      `Q${targetX},${midY} ${targetX},${midY + r}`,
      // Vertical drop to target
      `L${targetX},${targetY}`
    ].join(' ');
  }

  return (
    <BaseEdge 
      path={edgePath} 
      markerEnd={markerEnd} 
      style={{
        ...style,
        strokeWidth: style?.strokeWidth || 1.5,
        stroke: style?.stroke || 'hsl(var(--muted-foreground) / 0.5)',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
      }} 
    />
  );
}
