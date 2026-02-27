import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoopConfiguration } from '@/types/flowTypes';
import { Link2, Unlink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoopVariable } from './LoopVariableRow';

interface LoopLimitsConfigProps {
  config: LoopConfiguration;
  onChange: (updates: Partial<LoopConfiguration>) => void;
  isArrayData?: boolean;
  loopVariables?: LoopVariable[];
}

type MaxIterationsMode = 'manual' | 'count_from_list';

export function LoopLimitsConfig({ config, onChange, isArrayData, loopVariables = [] }: LoopLimitsConfigProps) {
  // Determine if we're in "count from list" mode based on linkedVariableId
  const [mode, setMode] = useState<MaxIterationsMode>(
    config.linkedVariableId ? 'count_from_list' : 'manual'
  );

  const handleModeChange = (newMode: MaxIterationsMode) => {
    setMode(newMode);
    if (newMode === 'manual') {
      // Clear the linked variable
      onChange({ linkedVariableId: undefined });
    } else if (newMode === 'count_from_list' && loopVariables.length > 0) {
      // Default to first variable
      onChange({ linkedVariableId: loopVariables[0].id });
    }
  };

  const handleLinkedVariableChange = (variableId: string) => {
    onChange({ linkedVariableId: variableId });
  };

  // Get the display name for a loop variable
  const getVariableDisplayName = (varId: string) => {
    const v = loopVariables.find(lv => lv.id === varId);
    return v ? v.variableName || 'item' : 'Unknown';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          Maximum number of Loop iterations
          <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">1 2 3</span>
        </Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5"
          onClick={() => handleModeChange(mode === 'manual' ? 'count_from_list' : 'manual')}
          title={mode === 'manual' ? 'Use count from bound list' : 'Set manual limit'}
        >
          {mode === 'manual' ? (
            <>
              <Link2 className="h-3 w-3" />
              Use List Count
            </>
          ) : (
            <>
              <Unlink className="h-3 w-3" />
              Use Manual
            </>
          )}
        </Button>
      </div>
      
      {mode === 'manual' ? (
        <Input
          type="number"
          min="1"
          value={config.maxIterations}
          onChange={(e) => onChange({ maxIterations: parseInt(e.target.value) || 500 })}
          placeholder="500"
        />
      ) : (
        <div className="space-y-2">
          <Select
            value={config.linkedVariableId || ''}
            onValueChange={handleLinkedVariableChange}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a loop variable..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              {loopVariables.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Add loop variables first
                </div>
              ) : (
                loopVariables.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded font-mono">
                        {`{{${v.variableName || 'item'}}}`}
                      </code>
                      <span className="text-muted-foreground">→ count items</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {config.linkedVariableId && (
            <p className="text-xs text-primary flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Will process all items in <code className="bg-muted px-1 rounded">{`{{${getVariableDisplayName(config.linkedVariableId)}}}`}</code>
            </p>
          )}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        {mode === 'manual'
          ? "Set this value to limit the number of loops performed. Data in iterations past the limit will be ignored."
          : "The loop will automatically process all items in the selected list (array length determines iteration count)."}
      </p>
    </div>
  );
}
