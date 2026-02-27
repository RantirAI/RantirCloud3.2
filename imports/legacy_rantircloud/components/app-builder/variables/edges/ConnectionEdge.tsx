import React from 'react';
import { EdgeProps, getBezierPath } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';

interface ConnectionEdgeData {
  joinConfig?: {
    type: 'inner' | 'left' | 'right' | 'full';
    leftField: string;
    rightField: string;
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
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as ConnectionEdgeData;
  const joinType = edgeData?.joinConfig?.type || 'inner';
  const hasConfig = edgeData?.joinConfig?.leftField && edgeData?.joinConfig?.rightField;

  const getJoinTypeColor = (type: string) => {
    switch (type) {
      case 'inner': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'left': return 'bg-green-100 text-green-800 border-green-200';
      case 'right': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'full': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <path
        id={id}
        className={`fill-none stroke-2 ${
          selected 
            ? 'stroke-primary' 
            : hasConfig 
              ? 'stroke-success' 
              : 'stroke-muted-foreground'
        }`}
        d={edgePath}
        strokeDasharray={hasConfig ? undefined : '5,5'}
      />
      
      {/* Join type label */}
      <foreignObject
        width={80}
        height={20}
        x={labelX - 40}
        y={labelY - 10}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <Badge 
          variant="outline" 
          className={`text-xs ${getJoinTypeColor(joinType)} ${
            selected ? 'ring-2 ring-primary' : ''
          }`}
        >
          {joinType.toUpperCase()}
        </Badge>
      </foreignObject>
      
      {/* Field mapping label */}
      {hasConfig && (
        <foreignObject
          width={120}
          height={30}
          x={labelX - 60}
          y={labelY + 15}
          className="overflow-visible"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="text-xs bg-background/90 border rounded px-1 py-0.5 text-center">
            {edgeData.joinConfig?.leftField} = {edgeData.joinConfig?.rightField}
          </div>
        </foreignObject>
      )}
    </>
  );
}