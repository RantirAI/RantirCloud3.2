import React, { useState, useEffect } from 'react';
import { ImageOff, Component, Image, FileText, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AssetPickerDialog } from '../AssetPickerDialog';

interface EmptyStateConfig {
  type: 'default' | 'component' | 'asset';
  componentId?: string;
  assetUrl?: string;
  assetAlt?: string;
  customMessage?: string;
  previewInCanvas?: boolean;
}

interface EmptyStateConfiguratorProps {
  config: EmptyStateConfig;
  onChange: (config: EmptyStateConfig) => void;
  projectId: string;
}

export function EmptyStateConfigurator({ config, onChange, projectId }: EmptyStateConfiguratorProps) {
  const { components, loadComponents } = useUserComponentStore();
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  // Load user components when needed
  useEffect(() => {
    if (projectId && config.type === 'component') {
      loadComponents(projectId);
    }
  }, [projectId, config.type, loadComponents]);

  const handleTypeChange = (type: 'default' | 'component' | 'asset') => {
    onChange({
      ...config,
      type,
      // Clear type-specific fields when switching
      componentId: type === 'component' ? config.componentId : undefined,
      assetUrl: type === 'asset' ? config.assetUrl : undefined,
      assetAlt: type === 'asset' ? config.assetAlt : undefined,
    });
  };

  const handleComponentChange = (componentId: string) => {
    onChange({
      ...config,
      componentId,
    });
  };

  const handleAssetSelect = (url: string, name: string) => {
    onChange({
      ...config,
      assetUrl: url,
      assetAlt: name,
    });
    setAssetPickerOpen(false);
  };

  const handleMessageChange = (customMessage: string) => {
    onChange({
      ...config,
      customMessage,
    });
  };

  const selectedComponent = components.find(c => c.id === config.componentId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs text-muted-foreground">Empty State</Label>
      </div>

      {/* Type selector */}
      <Tabs value={config.type} onValueChange={(v) => handleTypeChange(v as any)}>
        <TabsList className="w-full h-7 p-0.5">
          <TabsTrigger value="default" className="flex-1 h-6 text-[10px] gap-1">
            <FileText className="h-3 w-3" />
            Default
          </TabsTrigger>
          <TabsTrigger value="component" className="flex-1 h-6 text-[10px] gap-1">
            <Component className="h-3 w-3" />
            Component
          </TabsTrigger>
          <TabsTrigger value="asset" className="flex-1 h-6 text-[10px] gap-1">
            <Image className="h-3 w-3" />
            Asset
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Component selector */}
      {config.type === 'component' && (
        <div className="space-y-2">
          <Select value={config.componentId || ''} onValueChange={handleComponentChange}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select component..." />
            </SelectTrigger>
            <SelectContent>
              {components.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No components created yet
                </div>
              ) : (
                components.map(comp => (
                  <SelectItem key={comp.id} value={comp.id} className="text-xs">
                    {comp.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          {selectedComponent && (
            <div className="text-[10px] text-muted-foreground px-1">
              Using: {selectedComponent.name}
            </div>
          )}
        </div>
      )}

      {/* Asset selector */}
      {config.type === 'asset' && (
        <div className="space-y-2">
          {config.assetUrl ? (
            <div className="relative group">
              <img 
                src={config.assetUrl} 
                alt={config.assetAlt || 'Empty state image'}
                className="w-full h-20 object-contain rounded border border-border bg-muted/30"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setAssetPickerOpen(true)}
                >
                  Change
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => onChange({ ...config, assetUrl: undefined, assetAlt: undefined })}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-16 text-xs gap-2 border-dashed"
              onClick={() => setAssetPickerOpen(true)}
            >
              <Image className="h-4 w-4" />
              Select from Assets
            </Button>
          )}
          
          {config.assetUrl && (
            <Input
              value={config.assetAlt || ''}
              onChange={(e) => onChange({ ...config, assetAlt: e.target.value })}
              placeholder="Alt text..."
              className="h-6 text-xs"
            />
          )}
        </div>
      )}

      {/* Custom message (available for all types) */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Custom Message</Label>
        <Input
          value={config.customMessage || ''}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder={config.type === 'default' ? 'No records found' : 'Optional message...'}
          className="h-6 text-xs"
        />
      </div>

      {/* Preview toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Preview in Canvas</Label>
        </div>
        <Switch
          checked={config.previewInCanvas || false}
          onCheckedChange={(checked) => onChange({ ...config, previewInCanvas: checked })}
          className="scale-75"
        />
      </div>

      {/* Asset picker dialog */}
      <AssetPickerDialog
        open={assetPickerOpen}
        onOpenChange={setAssetPickerOpen}
        onSelect={handleAssetSelect}
        filterType="image"
      />
    </div>
  );
}
