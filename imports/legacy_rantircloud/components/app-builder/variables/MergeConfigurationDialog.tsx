import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link2, ArrowLeft, ArrowRight, ArrowUpDown, RotateCw } from 'lucide-react';

interface JoinConfig {
  type: 'inner' | 'left' | 'right' | 'full';
  leftField: string;
  rightField: string;
  alias?: string;
}

interface MergeConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  joinConfig: JoinConfig;
  onConfigChange: (config: JoinConfig) => void;
  onSave: () => void;
  sourceTable?: { name: string; fields: Array<{ name: string; type: string }> };
  targetTable?: { name: string; fields: Array<{ name: string; type: string }> };
}

export function MergeConfigurationDialog({
  isOpen,
  onClose,
  joinConfig,
  onConfigChange,
  onSave,
  sourceTable,
  targetTable,
}: MergeConfigurationDialogProps) {
  const joinTypes = [
    {
      value: 'inner',
      label: 'Inner Join',
      description: 'Returns only matching records from both tables',
      icon: <ArrowUpDown className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      value: 'left',
      label: 'Left Join',
      description: 'Returns all records from left table and matching from right',
      icon: <ArrowLeft className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
    },
    {
      value: 'right',
      label: 'Right Join',
      description: 'Returns all records from right table and matching from left',
      icon: <ArrowRight className="h-4 w-4" />,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    {
      value: 'full',
      label: 'Full Outer Join',
      description: 'Returns all records from both tables',
      icon: <RotateCw className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
    },
  ];

  const selectedJoinType = joinTypes.find(type => type.value === joinConfig.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Configure Table Join
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tables Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Table</Label>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium text-sm">{sourceTable?.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">
                  {sourceTable?.fields?.length || 0} fields
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Table</Label>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium text-sm">{targetTable?.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">
                  {targetTable?.fields?.length || 0} fields
                </div>
              </div>
            </div>
          </div>

          {/* Join Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Join Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {joinTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onConfigChange({ ...joinConfig, type: type.value as any })}
                  className={`p-3 border-2 rounded-lg text-left transition-all hover:border-primary/50 ${
                    joinConfig.type === type.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {type.icon}
                    <span className="font-medium text-sm">{type.label}</span>
                    {joinConfig.type === type.value && (
                      <Badge className={type.color}>Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Field</Label>
              <Select 
                value={joinConfig.leftField} 
                onValueChange={(value) => onConfigChange({ ...joinConfig, leftField: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTable?.fields?.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{field.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Field</Label>
              <Select 
                value={joinConfig.rightField} 
                onValueChange={(value) => onConfigChange({ ...joinConfig, rightField: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target field" />
                </SelectTrigger>
                <SelectContent>
                  {targetTable?.fields?.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{field.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {field.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Connection Alias */}
          <div className="space-y-2">
            <Label>Connection Alias (Optional)</Label>
            <Input
              value={joinConfig.alias || ''}
              onChange={(e) => onConfigChange({ ...joinConfig, alias: e.target.value })}
              placeholder="Enter a name for this connection..."
            />
          </div>

          {/* Join Preview */}
          {joinConfig.leftField && joinConfig.rightField && (
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="text-sm font-medium mb-2">Join Preview</div>
              <div className="text-xs font-mono text-muted-foreground">
                {selectedJoinType?.label.toUpperCase()} JOIN {targetTable?.name} ON{' '}
                {sourceTable?.name}.{joinConfig.leftField} = {targetTable?.name}.{joinConfig.rightField}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onSave}
              disabled={!joinConfig.leftField || !joinConfig.rightField}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}