import React, { useMemo } from 'react';
import { Edge } from '@xyflow/react';
import { FlowNode } from '@/types/flowTypes';
import { nodeRegistry } from '@/lib/node-registry';
import { LogoIcon } from '@/components/flow/LogoIcon';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataSourceOption {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  fieldName: string;
  fieldType: string;
  description?: string;
  icon: any;
  color: string;
}

interface LoopDataSourceSelectProps {
  value: string; // "nodeId.fieldName"
  nodes: FlowNode[];
  edges: Edge[];
  currentNodeId: string;
  onChange: (sourceNodeId: string, sourceField: string) => void;
}

export function LoopDataSourceSelect({
  value,
  nodes,
  edges,
  currentNodeId,
  onChange
}: LoopDataSourceSelectProps) {
  // Get all upstream nodes and their array/object outputs
  const dataSourceOptions = useMemo(() => {
    const options: DataSourceOption[] = [];
    
    // Find all nodes connected as inputs to this node
    const connectedNodeIds = edges
      .filter(edge => edge.target === currentNodeId)
      .map(edge => edge.source);

    connectedNodeIds.forEach(sourceNodeId => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;

      const nodeType = sourceNode.data.type as string;
      const plugin = nodeRegistry.getPlugin(nodeType);
      if (!plugin) return;

      const nodeName = (sourceNode.data.label as string) || plugin.name;
      const icon = plugin.icon;
      const color = plugin.color || '#6b7280';

      // Get outputs that are arrays or objects (loopable)
      if (plugin.outputs) {
        plugin.outputs
          .filter(output => output.type === 'array' || output.type === 'object')
          .forEach(output => {
            options.push({
              nodeId: sourceNodeId,
              nodeName,
              nodeType,
              fieldName: output.name,
              fieldType: output.type,
              description: output.description,
              icon,
              color
            });
          });
      }

      // Also add common fallback fields for nodes without explicit outputs
      if (!plugin.outputs || plugin.outputs.length === 0) {
        const fallbackFields = [
          { name: 'body', type: 'object', description: 'Response body' },
          { name: 'data', type: 'array', description: 'Data array' },
          { name: 'items', type: 'array', description: 'Items array' },
          { name: 'results', type: 'array', description: 'Results array' },
        ];

        fallbackFields.forEach(field => {
          options.push({
            nodeId: sourceNodeId,
            nodeName,
            nodeType,
            fieldName: field.name,
            fieldType: field.type,
            description: field.description,
            icon,
            color
          });
        });
      }
    });

    return options;
  }, [nodes, edges, currentNodeId]);

  // Group options by node
  const groupedOptions = useMemo(() => {
    const groups: Record<string, DataSourceOption[]> = {};
    
    dataSourceOptions.forEach(option => {
      if (!groups[option.nodeId]) {
        groups[option.nodeId] = [];
      }
      groups[option.nodeId].push(option);
    });
    
    return groups;
  }, [dataSourceOptions]);

  // Parse the current value
  const [selectedNodeId, selectedField] = value.split('.');
  const selectedOption = dataSourceOptions.find(
    opt => opt.nodeId === selectedNodeId && opt.fieldName === selectedField
  );

  const handleValueChange = (newValue: string) => {
    const [nodeId, field] = newValue.split('.');
    onChange(nodeId, field);
  };

  // Render the selected value with node icon
  const renderSelectedValue = () => {
    if (!selectedOption) {
      return <span className="text-muted-foreground">Select data source...</span>;
    }

    return (
      <div className="flex items-center gap-2 min-w-0">
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${selectedOption.color}20` }}
        >
          <LogoIcon
            icon={selectedOption.icon}
            alt={selectedOption.nodeName}
            size="sm"
            color={selectedOption.color}
          />
        </div>
        <span className="truncate text-sm">
          {selectedOption.nodeName} &gt; {selectedOption.fieldName}
        </span>
        <Badge variant="outline" className="text-xs flex-shrink-0">
          {selectedOption.fieldType}
        </Badge>
      </div>
    );
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="h-8 text-sm bg-background">
        <SelectValue>
          {renderSelectedValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-50">
        {Object.entries(groupedOptions).length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No array data available from connected nodes.
            <br />
            Connect a node with array output first.
          </div>
        ) : (
          Object.entries(groupedOptions).map(([nodeId, options]) => {
            const firstOption = options[0];
            return (
              <SelectGroup key={nodeId}>
                <SelectLabel className="flex items-center gap-2 px-2 py-1.5">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${firstOption.color}20` }}
                  >
                    <LogoIcon
                      icon={firstOption.icon}
                      alt={firstOption.nodeName}
                      size="sm"
                      color={firstOption.color}
                    />
                  </div>
                  <span>{firstOption.nodeName}</span>
                </SelectLabel>
                {options.map(option => (
                  <SelectItem
                    key={`${option.nodeId}.${option.fieldName}`}
                    value={`${option.nodeId}.${option.fieldName}`}
                    className="pl-8"
                  >
                    <div className="flex items-center gap-2">
                      <span>{option.fieldName}</span>
                      <Badge variant="outline" className="text-xs">
                        {option.fieldType}
                      </Badge>
                    </div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
