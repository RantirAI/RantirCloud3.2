
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import { LoopConfiguration } from '@/types/flowTypes';

interface LoopInfoAlertsProps {
  config: LoopConfiguration;
  nodeId: string;
  isArrayData?: boolean;
}

export function LoopInfoAlerts({ config, nodeId, isArrayData }: LoopInfoAlertsProps) {
  return (
    <>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          When enabled, this node will execute once for each item in the selected data source.
          {isArrayData && (
            <span className="block mt-1 font-medium text-blue-600">
              Array data detected - loop will iterate through each array element.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {isArrayData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Array Loop Behavior:</strong> The loop will process each element in the array sequentially {config.loopType === 'sync' ? '(one by one)' : `(in batches of ${config.batchSize})`}. 
            Each iteration will have access to the current array element via <code>&#123;&#123;{nodeId}._loop.current&#125;&#125;</code>.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
