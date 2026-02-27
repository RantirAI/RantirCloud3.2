import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Database } from 'lucide-react';

interface TableNodeData {
  table: {
    id: string;
    name: string;
    schema?: any;
  };
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
  }>;
}

export function TableNode({ data, selected }: NodeProps) {
  const nodeData = data as any;
  
  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{nodeData.table?.name || 'Table'}</h3>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {(nodeData.fields || []).slice(0, 5).map((field: any) => (
            <div key={field.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                {field.name}
              </span>
              <Badge variant="outline" className="text-xs h-5">
                {field.type}
              </Badge>
            </div>
          ))}
          {(nodeData.fields || []).length > 5 && (
            <div className="text-xs text-muted-foreground text-center">
              +{nodeData.fields.length - 5} more fields
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Connection handles */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !border-primary"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-primary !border-primary"
      />
    </Card>
  );
}