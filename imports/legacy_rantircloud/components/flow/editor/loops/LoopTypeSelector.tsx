
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LoopConfiguration } from '@/types/flowTypes';

interface LoopTypeSelectorProps {
  config: LoopConfiguration;
  onChange: (updates: Partial<LoopConfiguration>) => void;
}

export function LoopTypeSelector({ config, onChange }: LoopTypeSelectorProps) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Loop Type</Label>
        <Select
          value={config.loopType}
          onValueChange={(value: 'sync' | 'async') => onChange({ loopType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sync">
              <div>
                <div>Synchronous (sequential)</div>
                <div className="text-xs text-muted-foreground">Process one item at a time</div>
              </div>
            </SelectItem>
            <SelectItem value="async">
              <div>
                <div>Asynchronous (parallel)</div>
                <div className="text-xs text-muted-foreground">Process multiple items simultaneously</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.loopType === 'async' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Batch Size</Label>
          <Input
            type="number"
            min="1"
            max="100"
            value={config.batchSize}
            onChange={(e) => onChange({ batchSize: parseInt(e.target.value) || 1 })}
            placeholder="Number of parallel executions"
          />
          <p className="text-xs text-muted-foreground">
            How many items to process in parallel at once
          </p>
        </div>
      )}

      {config.loopType === 'sync' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Delay Between Iterations (ms)</Label>
          <Input
            type="number"
            min="0"
            value={config.delayMs}
            onChange={(e) => onChange({ delayMs: parseInt(e.target.value) || 0 })}
            placeholder="Delay in milliseconds"
          />
          <p className="text-xs text-muted-foreground">
            Wait time between processing each item (0 = no delay)
          </p>
        </div>
      )}
    </>
  );
}
