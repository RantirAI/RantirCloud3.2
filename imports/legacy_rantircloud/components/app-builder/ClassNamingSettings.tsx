import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Info, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  ClassNamingConfig,
  DEFAULT_NAMING_CONFIG,
  NumberingMode,
  SeparatorType,
  getSeparatorChar,
  padNumber,
} from '@/types/class-naming';
import {
  getNamingConfig,
  saveNamingConfig,
  validateNamingConfig,
} from '@/lib/enhancedAutoClassNaming';

interface ClassNamingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function ClassNamingSettings({
  open,
  onOpenChange,
  projectId,
}: ClassNamingSettingsProps) {
  const [config, setConfig] = useState<ClassNamingConfig>(DEFAULT_NAMING_CONFIG);
  const [errors, setErrors] = useState<string[]>([]);

  // Load config when dialog opens
  useEffect(() => {
    if (open) {
      const currentConfig = getNamingConfig(projectId);
      setConfig(currentConfig);
      setErrors([]);
    }
  }, [open, projectId]);

  const handleSave = () => {
    const validationErrors = validateNamingConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    saveNamingConfig(config, projectId);
    toast.success('Class naming settings saved');
    onOpenChange(false);
  };

  const handleReset = () => {
    setConfig(DEFAULT_NAMING_CONFIG);
    setErrors([]);
    toast.info('Settings reset to defaults');
  };

  const updateConfig = (updates: Partial<ClassNamingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setErrors([]);
  };

  // Generate preview
  const getPreviewName = () => {
    const baseName = 'Button';
    const sep = getSeparatorChar(config.separator);
    
    if (config.numberingMode === 'none') {
      return baseName;
    }
    
    const num = padNumber(config.startIndex, config.padding);
    return `${baseName}${sep}${num}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Class Naming Settings
          </DialogTitle>
          <DialogDescription>
            Configure how auto-generated class names are formatted
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="text-2xl font-mono font-bold text-primary">
              {getPreviewName()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Example class name with current settings
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Numbering Mode */}
          <div className="space-y-2">
            <Label htmlFor="numbering-mode">Numbering Mode</Label>
            <Select
              value={config.numberingMode}
              onValueChange={(value: NumberingMode) =>
                updateConfig({ numberingMode: value })
              }
            >
              <SelectTrigger id="numbering-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (just base name)</SelectItem>
                <SelectItem value="sequential">Sequential (1, 2, 3...)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.numberingMode === 'none'
                ? 'Classes will be named by base type only (e.g., "Button")'
                : 'Classes will be numbered sequentially (e.g., "Button 1", "Button 2")'}
            </p>
          </div>

          {config.numberingMode === 'sequential' && (
            <>
              {/* Start Index */}
              <div className="space-y-2">
                <Label htmlFor="start-index">Start Index</Label>
                <Input
                  id="start-index"
                  type="number"
                  min="0"
                  max="1000000"
                  value={config.startIndex}
                  onChange={(e) =>
                    updateConfig({ startIndex: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  First number in the sequence (0-1,000,000)
                </p>
              </div>

              {/* Max Number */}
              <div className="space-y-2">
                <Label htmlFor="max-number">Maximum Number</Label>
                <Input
                  id="max-number"
                  type="number"
                  min="1"
                  max="1000000"
                  value={config.maxNumber}
                  onChange={(e) =>
                    updateConfig({ maxNumber: parseInt(e.target.value) || 1000000 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Highest number allowed (1-1,000,000)
                </p>
              </div>

              {/* Padding */}
              <div className="space-y-2">
                <Label htmlFor="padding">Number Padding</Label>
                <Select
                  value={config.padding.toString()}
                  onValueChange={(value) =>
                    updateConfig({ padding: parseInt(value) })
                  }
                >
                  <SelectTrigger id="padding">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None (1, 2, 3)</SelectItem>
                    <SelectItem value="2">2 digits (01, 02, 03)</SelectItem>
                    <SelectItem value="3">3 digits (001, 002, 003)</SelectItem>
                    <SelectItem value="4">4 digits (0001, 0002, 0003)</SelectItem>
                    <SelectItem value="5">5 digits (00001, 00002, 00003)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Add leading zeros to numbers
                </p>
              </div>

              {/* Separator */}
              <div className="space-y-2">
                <Label htmlFor="separator">Separator</Label>
                <Select
                  value={config.separator}
                  onValueChange={(value: SeparatorType) =>
                    updateConfig({ separator: value })
                  }
                >
                  <SelectTrigger id="separator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="space">Space (Button 1)</SelectItem>
                    <SelectItem value="dash">Dash (Button-1)</SelectItem>
                    <SelectItem value="underscore">Underscore (Button_1)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Character between base name and number
                </p>
              </div>

              {/* Reuse Deleted Numbers */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label htmlFor="reuse-numbers">Reuse Deleted Numbers</Label>
                  <p className="text-xs text-muted-foreground">
                    Fill gaps when classes are deleted (e.g., reuse "Button 2" if deleted)
                  </p>
                </div>
                <Switch
                  id="reuse-numbers"
                  checked={config.reuseDeletedNumbers}
                  onCheckedChange={(checked) =>
                    updateConfig({ reuseDeletedNumbers: checked })
                  }
                />
              </div>
            </>
          )}

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              These settings apply to automatically generated class names when
              components are created or styles are modified. Existing classes are
              not affected.
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
