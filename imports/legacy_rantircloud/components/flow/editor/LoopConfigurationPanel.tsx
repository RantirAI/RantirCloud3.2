
import React, { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoopConfiguration } from '@/types/flowTypes';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { RefreshCw } from 'lucide-react';
import { LoopDataSourceSelector } from './loops/LoopDataSourceSelector';
import { LoopTypeSelector } from './loops/LoopTypeSelector';
import { LoopLimitsConfig } from './loops/LoopLimitsConfig';
import { LoopInfoAlerts } from './loops/LoopInfoAlerts';

interface LoopConfigurationPanelProps {
  nodeId: string;
  loopConfig?: LoopConfiguration;
  onChange: (config: LoopConfiguration) => void;
}

export function LoopConfigurationPanel({ nodeId, loopConfig, onChange }: LoopConfigurationPanelProps) {
  const { nodes } = useFlowStore();
  
  const defaultConfig: LoopConfiguration = {
    enabled: false,
    loopType: 'sync',
    batchSize: 1,
    delayMs: 0,
    maxIterations: 1000,
    ...loopConfig
  };

  const handleConfigChange = (updates: Partial<LoopConfiguration>) => {
    onChange({ ...defaultConfig, ...updates });
  };

  // Get info about the selected data source
  const getSelectedDataSourceInfo = () => {
    if (!defaultConfig.sourceNodeId || !defaultConfig.sourceField) return null;

    const sourceNode = nodes.find(n => n.id === defaultConfig.sourceNodeId);
    if (!sourceNode) return null;

    const nodeType = sourceNode.data.type as string;
    const sourcePlugin = nodeRegistry.getPlugin(nodeType);
    if (!sourcePlugin || !sourcePlugin.outputs) return null;

    const outputField = sourcePlugin.outputs.find(output => output.name === defaultConfig.sourceField);
    if (!outputField) return null;

    return {
      nodeName: sourceNode.data.label as string,
      fieldName: outputField.name,
      fieldType: outputField.type,
      isArray: outputField.type === 'array'
    };
  };

  const selectedDataInfo = getSelectedDataSourceInfo();

  // Auto-update max iterations when data source changes
  useEffect(() => {
    if (selectedDataInfo?.isArray && defaultConfig.enabled) {
      // For arrays, we'll set a reasonable default but allow user override
      if (defaultConfig.maxIterations === 1000) { // Only if it's still the default
        handleConfigChange({ maxIterations: 100 }); // More reasonable default for arrays
      }
    }
  }, [defaultConfig.sourceNodeId, defaultConfig.sourceField, selectedDataInfo?.isArray]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" />
          Loop Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="loop-enabled" className="text-sm font-medium">
            Enable Loop
          </Label>
          <Switch
            id="loop-enabled"
            checked={defaultConfig.enabled}
            onCheckedChange={(checked) => handleConfigChange({ enabled: checked })}
          />
        </div>

        {defaultConfig.enabled && (
          <>
            <LoopInfoAlerts 
              config={defaultConfig}
              nodeId={nodeId}
              isArrayData={selectedDataInfo?.isArray}
            />

            <LoopDataSourceSelector
              nodeId={nodeId}
              config={defaultConfig}
              onChange={handleConfigChange}
            />

            <LoopTypeSelector
              config={defaultConfig}
              onChange={handleConfigChange}
            />

            <LoopLimitsConfig
              config={defaultConfig}
              onChange={handleConfigChange}
              isArrayData={selectedDataInfo?.isArray}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
