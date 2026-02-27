
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoopConfiguration } from '@/types/flowTypes';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';

interface LoopDataSourceSelectorProps {
  nodeId: string;
  config: LoopConfiguration;
  onChange: (updates: Partial<LoopConfiguration>) => void;
}

export function LoopDataSourceSelector({ nodeId, config, onChange }: LoopDataSourceSelectorProps) {
  const { nodes, edges } = useFlowStore();

  // Get available data sources (arrays and objects from connected nodes)
  const getAvailableDataSources = () => {
    const connectedNodeIds = edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);

    const dataSources: { nodeId: string; nodeName: string; fields: { name: string; type: string; isArray: boolean }[] }[] = [];

    connectedNodeIds.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return;

      const nodeType = sourceNode.data.type as string;
      const sourcePlugin = nodeRegistry.getPlugin(nodeType);
      if (!sourcePlugin || !sourcePlugin.outputs) return;

      const fields = sourcePlugin.outputs
        .filter(output => output.type === 'array' || output.type === 'object')
        .map(output => ({
          name: output.name,
          type: output.type,
          isArray: output.type === 'array'
        }));

      if (fields.length > 0) {
        dataSources.push({
          nodeId: sourceId,
          nodeName: sourceNode.data.label as string,
          fields
        });
      }
    });

    return dataSources;
  };

  const dataSources = getAvailableDataSources();

  // Get info about the selected data source
  const getSelectedDataSourceInfo = () => {
    if (!config.sourceNodeId || !config.sourceField) return null;

    const sourceNode = nodes.find(n => n.id === config.sourceNodeId);
    if (!sourceNode) return null;

    const nodeType = sourceNode.data.type as string;
    const sourcePlugin = nodeRegistry.getPlugin(nodeType);
    if (!sourcePlugin || !sourcePlugin.outputs) return null;

    const outputField = sourcePlugin.outputs.find(output => output.name === config.sourceField);
    if (!outputField) return null;

    return {
      nodeName: sourceNode.data.label as string,
      fieldName: outputField.name,
      fieldType: outputField.type,
      isArray: outputField.type === 'array'
    };
  };

  const selectedDataInfo = getSelectedDataSourceInfo();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Data Source to Loop Through</Label>
      <Select
        value={config.sourceNodeId && config.sourceField ? `${config.sourceNodeId}|${config.sourceField}` : ''}
        onValueChange={(value) => {
          const [nodeId, field] = value.split('|');
          onChange({ 
            sourceNodeId: nodeId, 
            sourceField: field 
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select data to loop through" />
        </SelectTrigger>
        <SelectContent>
          {dataSources.map((source) =>
            source.fields.map((field) => (
              <SelectItem
                key={`${source.nodeId}|${field.name}`}
                value={`${source.nodeId}|${field.name}`}
              >
                <div className="flex items-center gap-2">
                  <span>{source.nodeName} → {field.name}</span>
                  {field.isArray && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                      Array
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
          {dataSources.length === 0 && (
            <SelectItem value="none" disabled>
              No array/object data available from connected nodes
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {selectedDataInfo && (
        <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded">
          <strong>Selected:</strong> {selectedDataInfo.nodeName} → {selectedDataInfo.fieldName} 
          <span className="ml-2 text-blue-600">({selectedDataInfo.fieldType})</span>
          {selectedDataInfo.isArray && (
            <div className="mt-1 text-blue-700">
              ✓ This will loop through each element in the array
            </div>
          )}
        </div>
      )}
    </div>
  );
}
