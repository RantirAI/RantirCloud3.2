import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Database, Link, Circle, Plus } from 'lucide-react';

interface TableNodeData {
  name: string;
  schema: {
    fields?: Array<{
      name: string;
      type: string;
    }>;
  };
  source?: 'table_project' | 'database';
  databaseName?: string;
  connectedFields?: string[];
}

export function TableNode({ data, id, selected }: NodeProps) {
  const typedData = data as unknown as TableNodeData;
  const fields = typedData.schema?.fields || [];
  const connectedFields = typedData.connectedFields || [];

  const isFieldConnected = (fieldName: string) => {
    return connectedFields.includes(fieldName);
  };

  const hasAnyConnection = connectedFields.length > 0;

  return (
    <Card className={`min-w-[300px] shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-primary shadow-xl' : 'border-border hover:border-primary/50'
    }`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Table className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{typedData.name}</div>
            <div className="text-xs text-muted-foreground">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </div>
          </div>
          {typedData.source === 'database' && (
            <Badge variant="secondary" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              {typedData.databaseName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-3">
        <div className="space-y-1">
          {fields.slice(0, 20).map((field, index) => {
            const fieldConnected = isFieldConnected(field.name);
            
            return (
              <div 
                key={index} 
                className={`relative flex items-center justify-between py-2.5 px-3 rounded-lg border transition-all group ${
                  fieldConnected 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border'
                }`}
              >
                {/* Left connection handle (inlet) - always visible, ring indicator */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${id}-${field.name}-target`}
                  style={{ opacity: 1 }}
                  className={`!absolute !left-0 !top-1/2 !transform !-translate-y-1/2 !-translate-x-1/2 !w-6 !h-6 !border-2 !rounded-full !transition-all !duration-200 ${
                    fieldConnected 
                      ? '!bg-green-500 !border-green-600 !shadow-lg' 
                      : '!bg-background !border-primary'
                  }`}
                />
                {/* Visible inlet ring overlay (non-interactive) */}
                <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 ${fieldConnected ? 'border-green-600 bg-green-500' : 'border-primary bg-background'}`} />
                </div>
                
                {/* Right connection handle (outlet) - always visible, plus icon to start connection */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${id}-${field.name}-source`}
                  style={{ opacity: 1 }}
                  className={`!absolute !right-0 !top-1/2 !transform !-translate-y-1/2 !translate-x-1/2 !w-6 !h-6 !border-2 !rounded-full !transition-all !duration-200 ${
                    fieldConnected 
                      ? '!bg-green-500 !border-green-600 !shadow-lg' 
                      : '!bg-background !border-primary'
                  }`}
                />
                {/* Visible outlet plus overlay (non-interactive) */}
                <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 flex items-center justify-center">
                  <Plus className={`h-3.5 w-3.5 ${fieldConnected ? 'text-white' : 'text-primary'}`} />
                </div>
                
                {/* Field content */}
                <div className="flex items-center gap-3 flex-1 min-w-0 ml-6 mr-6">
                  <div className="flex items-center gap-2">
                    {fieldConnected && (
                      <Link className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate text-foreground">
                      {field.name}
                    </span>
                  </div>
                </div>
                
                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                  {field.type}
                </Badge>
              </div>
            );
          })}
          
          {fields.length > 20 && (
            <div className="text-xs text-muted-foreground text-center py-2 border-t">
              +{fields.length - 20} more fields
            </div>
          )}
        </div>
        
        {hasAnyConnection && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Link className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {connectedFields.length} Connection{connectedFields.length !== 1 ? 's' : ''} Active
              </span>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Multi-table joining: connect to multiple tables for complex merges
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}