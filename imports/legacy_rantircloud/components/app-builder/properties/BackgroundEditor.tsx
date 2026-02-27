import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { GripVertical, Paintbrush, Image, Blend, X, Upload, Link2, FolderOpen, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientBuilder } from './GradientBuilder';
import { FileUploader } from '@/components/FileUploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetPickerDialog } from '@/components/app-builder/AssetPickerDialog';
import { ProjectAssetPicker } from '@/components/app-builder/ProjectAssetPicker';
import { ThemeColorSwatches } from '@/components/app-builder/design-system/ThemeColorSwatches';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
interface BackgroundImageValue {
  value: string;
  opacity?: number;
  size?: 'cover' | 'contain' | 'auto' | '100%';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  isPending?: boolean;
}

interface BackgroundLayer {
  id: string;
  type: 'fill' | 'gradient' | 'image';
  value: string | { type?: 'solid' | 'gradient'; value: string; opacity?: number; isPending?: boolean } | BackgroundImageValue;
  enabled: boolean;
  opacity?: number; // Layer-level opacity (0-100) for stacking effect
}

interface BackgroundEditorProps {
  backgroundColor: string | { type?: 'solid' | 'gradient'; value: string; opacity?: number };
  backgroundGradient: string | { value: string; opacity?: number };
  backgroundImage: string | BackgroundImageValue;
  backgroundLayerOrder?: string[];
  onBackgroundColorChange: (value: any) => void;
  onBackgroundGradientChange: (value: any) => void;
  onBackgroundImageChange: (value: any) => void;
  onLayerOrderChange?: (order: string[]) => void;
}

interface SortableLayerProps {
  layer: BackgroundLayer;
  onUpdate: (id: string, value: any) => void;
  onRemove: (id: string) => void;
}

function SortableLayer({ layer, onUpdate, onRemove }: SortableLayerProps) {
  // Subscribe to activeTokens to trigger re-render when design system colors change
  const { activeTokens } = useDesignTokenStore();
  
  // Check if this is a newly added pending layer (needs user to pick value)
  const isPendingFill =
    layer.type === 'fill' && typeof layer.value === 'object' && (layer.value as any)?.isPending === true;
  const isPendingGradient =
    layer.type === 'gradient' && typeof layer.value === 'object' && (layer.value as any)?.isPending === true;
  const isPendingImage =
    layer.type === 'image' && typeof layer.value === 'object' && (layer.value as any)?.isPending === true;

  // Start open if pending - use ref to track if we've already auto-opened
  const hasAutoOpened = React.useRef(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [gradientBuilderOpen, setGradientBuilderOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageTab, setImageTab] = useState<'project' | 'url' | 'upload' | 'database'>('project');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [projectAssetPickerOpen, setProjectAssetPickerOpen] = useState(false);
  
  // Get selected database for database assets
  const { selectedDatabaseId } = useAppBuilderStore();

  // Auto-open picker ONCE when layer is pending (newly added)
  useEffect(() => {
    if (isPendingFill && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      // Use setTimeout to ensure the layer is rendered before opening popover
      setTimeout(() => setColorPickerOpen(true), 50);
      return;
    }
    if (isPendingGradient && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setTimeout(() => setGradientBuilderOpen(true), 50);
      return;
    }
    if (isPendingImage && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setTimeout(() => setImagePickerOpen(true), 50);
      return;
    }
  }, [isPendingFill, isPendingGradient, isPendingImage]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
  ];

  const renderLayerContent = () => {
    switch (layer.type) {
      case 'fill':
        // Handle pending layer (newly added, no color selected yet)
        const rawValue = layer.value as any;
        const isPending = rawValue?.isPending === true;
        const colorValue = typeof layer.value === 'string' 
          ? { type: 'solid' as const, value: layer.value, opacity: 100 }
          : { 
              type: (rawValue?.type || 'solid') as 'solid' | 'gradient', 
              value: rawValue?.value || '#ffffff', 
              opacity: rawValue?.opacity ?? 100 
            };
        
        // For display, resolve token refs to actual colors using activeTokens
        // Check if value is a token reference
        const innerValue = colorValue.value;
        let resolvedColorValue = '';
        
        if (typeof innerValue === 'object' && innerValue !== null && 'tokenRef' in innerValue) {
          // It's a token reference - resolve using activeTokens
          const token = activeTokens.get((innerValue as any).tokenRef);
          resolvedColorValue = token?.value || (innerValue as any).value || '';
        } else if (typeof innerValue === 'string') {
          resolvedColorValue = innerValue;
        } else {
          resolvedColorValue = String(innerValue || '');
        }
        
        const displayColor = isPending ? '' : resolvedColorValue;
        const displayText = isPending ? 'Select color...' : (resolvedColorValue?.slice(0, 7) || '#000000');

        return (
          <div className="flex items-center gap-2 flex-1">
            <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded px-2 h-7 transition-colors",
                  isPending && "border-dashed border-primary/50"
                )}>
                  <div 
                    className={cn(
                      "w-4 h-4 rounded border border-border/50",
                      isPending && "bg-muted"
                    )}
                    style={{ backgroundColor: displayColor || undefined }}
                  />
                  <span className={cn("text-xs", isPending && "text-muted-foreground italic")}>
                    {displayText}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 z-50 bg-popover max-h-[400px] overflow-y-auto" align="start">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={resolvedColorValue || '#ffffff'}
                      onChange={(e) => onUpdate(layer.id, { type: 'solid', value: e.target.value, opacity: colorValue.opacity || 100 })}
                      className="w-10 h-7 p-0.5 border rounded cursor-pointer"
                    />
                    <Input
                      value={resolvedColorValue || ''}
                      onChange={(e) => onUpdate(layer.id, { type: 'solid', value: e.target.value, opacity: colorValue.opacity || 100 })}
                      className="flex-1 h-7 text-xs"
                      placeholder="#000000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">
                      Opacity: {colorValue.opacity || 100}%
                    </Label>
                    <Slider
                      value={[colorValue.opacity || 100]}
                      onValueChange={(values) => onUpdate(layer.id, { type: 'solid', value: colorValue.value || '#ffffff', opacity: values[0] })}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full mt-1"
                    />
                  </div>
                  
                  {/* Theme Color Swatches */}
                  <ThemeColorSwatches
                    currentValue={colorValue.value}
                    onColorSelect={(color) => onUpdate(layer.id, { type: 'solid', value: color, opacity: colorValue.opacity || 100 })}
                  />
                  
                  {/* Fallback preset colors */}
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground">Custom Colors</span>
                    <div className="grid grid-cols-6 gap-1 mt-1">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => onUpdate(layer.id, { type: 'solid', value: color, opacity: colorValue.opacity || 100 })}
                          className="w-6 h-6 rounded border border-border/50 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'gradient':
        // Handle pending gradient (newly added, no gradient selected yet)
        const gradientRawValue = layer.value as any;
        const isGradientPending = typeof gradientRawValue === 'object' && gradientRawValue?.isPending === true;
        const gradientValue = typeof layer.value === 'string' ? layer.value : 
          (typeof gradientRawValue?.value === 'string' ? gradientRawValue.value : '');
        const gradientOpacity = typeof layer.value === 'object' ? (gradientRawValue?.opacity ?? 100) : 100;
        
        return (
          <div className="flex items-center gap-2 flex-1">
            <Popover open={gradientBuilderOpen} onOpenChange={setGradientBuilderOpen}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded px-2 h-7 transition-colors",
                  isGradientPending && "border-dashed border-primary/50"
                )}>
                  <div 
                    className={cn(
                      "w-4 h-4 rounded border border-border/50",
                      isGradientPending && "bg-muted"
                    )}
                    style={{ background: isGradientPending ? undefined : (gradientValue || 'linear-gradient(90deg, #000 0%, #fff 100%)') }}
                  />
                  <span className={cn(
                    "text-xs truncate max-w-[80px]",
                    isGradientPending && "text-muted-foreground italic"
                  )}>
                    {isGradientPending ? 'Set...' : (gradientValue ? `${gradientOpacity}%` : 'Set')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <GradientBuilder
                    value={gradientValue || 'linear-gradient(180deg, #000000 0%, #ffffff 100%)'}
                    onChange={(val) => onUpdate(layer.id, { value: val, opacity: gradientOpacity })}
                    open={true}
                    onOpenChange={() => {}}
                  >
                    <div className="w-full h-8 rounded border cursor-pointer" style={{ background: gradientValue || 'linear-gradient(90deg, #000 0%, #fff 100%)' }} />
                  </GradientBuilder>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">
                      Layer Opacity: {gradientOpacity}%
                    </Label>
                    <Slider
                      value={[gradientOpacity]}
                      onValueChange={(values) => onUpdate(layer.id, { value: gradientValue, opacity: values[0] })}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'image':
        const imageRawValue = layer.value as any;
        const isImagePending = typeof imageRawValue === 'object' && imageRawValue?.isPending === true;
        const imageValue = typeof layer.value === 'string' ? layer.value : 
          (typeof imageRawValue?.value === 'string' ? imageRawValue.value : '');
        const imageOpacity = typeof layer.value === 'object' ? (imageRawValue?.opacity ?? 100) : 100;
        const imageSize = typeof layer.value === 'object' ? (imageRawValue?.size ?? 'cover') : 'cover';
        const imagePosition = typeof layer.value === 'object' ? (imageRawValue?.position ?? 'center') : 'center';
        const imageRepeat = typeof layer.value === 'object' ? (imageRawValue?.repeat ?? 'no-repeat') : 'no-repeat';
        
        const updateImageProp = (updates: Partial<BackgroundImageValue>) => {
          onUpdate(layer.id, {
            value: imageValue,
            opacity: imageOpacity,
            size: imageSize,
            position: imagePosition,
            repeat: imageRepeat,
            ...updates
          });
        };
        
        return (
          <div className="flex items-center gap-2 flex-1">
            <Popover open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded px-2 h-7 transition-colors flex-1 max-w-[180px]",
                  isImagePending && "border-dashed border-primary/50"
                )}>
                  {imageValue ? (
                    <div 
                      className="w-4 h-4 rounded border border-border/50 bg-cover bg-center"
                      style={{ backgroundImage: `url(${imageValue})` }}
                    />
                  ) : (
                    <Image className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-xs truncate",
                    isImagePending && "text-muted-foreground italic"
                  )}>
                    {isImagePending ? 'Set...' : (imageValue ? `${imageOpacity}%` : 'Set')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-3">
                  <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as 'project' | 'url' | 'upload' | 'database')}>
                    <TabsList className="grid w-full grid-cols-4 h-8">
                      <TabsTrigger value="project" className="text-xs h-7 px-1">
                        <FolderOpen className="h-3 w-3 mr-0.5" />
                        Project
                      </TabsTrigger>
                      <TabsTrigger value="url" className="text-xs h-7 px-1">
                        <Link2 className="h-3 w-3 mr-0.5" />
                        URL
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="text-xs h-7 px-1">
                        <Upload className="h-3 w-3 mr-0.5" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="database" className="text-xs h-7 px-1">
                        <Database className="h-3 w-3 mr-0.5" />
                        Drive
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="project" className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => setProjectAssetPickerOpen(true)}
                      >
                        <FolderOpen className="h-3.5 w-3.5 mr-2" />
                        Browse Project Assets
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Assets saved to this project
                      </p>
                      <ProjectAssetPicker
                        open={projectAssetPickerOpen}
                        onOpenChange={setProjectAssetPickerOpen}
                        filterType="image"
                        onSelect={(url) => {
                          updateImageProp({ value: url });
                          setProjectAssetPickerOpen(false);
                          setImagePickerOpen(false);
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="url" className="mt-2">
                      <Input
                        value={imageValue}
                        onChange={(e) => updateImageProp({ value: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="h-7 text-xs"
                      />
                    </TabsContent>
                    <TabsContent value="upload" className="mt-2">
                      <FileUploader
                        type="image"
                        value={imageValue || null}
                        onChange={(url) => updateImageProp({ value: url || '' })}
                      />
                    </TabsContent>
                    <TabsContent value="database" className="mt-2">
                      {selectedDatabaseId ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => setAssetPickerOpen(true)}
                          >
                            <Database className="h-3.5 w-3.5 mr-2" />
                            Browse Database Drive
                          </Button>
                          <AssetPickerDialog
                            open={assetPickerOpen}
                            onOpenChange={setAssetPickerOpen}
                            filterType="image"
                            onSelect={(url) => {
                              updateImageProp({ value: url });
                              setAssetPickerOpen(false);
                              setImagePickerOpen(false);
                            }}
                          />
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Connect a database to access Drive assets
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  {/* Image Preview */}
                  {imageValue && (
                    <div 
                      className="w-full h-20 rounded border border-border bg-muted/30"
                      style={{ 
                        backgroundImage: `url(${imageValue})`,
                        backgroundSize: imageSize,
                        backgroundPosition: imagePosition.replace('-', ' '),
                        backgroundRepeat: imageRepeat
                      }}
                    />
                  )}
                  
                  {/* Image Size */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Size</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['cover', 'contain', 'auto', '100%'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateImageProp({ size })}
                          className={cn(
                            "px-2 py-1 text-xs rounded border transition-colors",
                            imageSize === size 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/50 border-border hover:bg-muted"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Image Position */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Position</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { val: 'top-left', icon: '↖' },
                        { val: 'top', icon: '↑' },
                        { val: 'top-right', icon: '↗' },
                        { val: 'left', icon: '←' },
                        { val: 'center', icon: '·' },
                        { val: 'right', icon: '→' },
                        { val: 'bottom-left', icon: '↙' },
                        { val: 'bottom', icon: '↓' },
                        { val: 'bottom-right', icon: '↘' },
                      ].map(({ val, icon }) => (
                        <button
                          key={val}
                          onClick={() => updateImageProp({ position: val as any })}
                          className={cn(
                            "w-full h-7 text-sm rounded border transition-colors",
                            imagePosition === val 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/50 border-border hover:bg-muted"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Image Repeat */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Repeat</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { val: 'no-repeat', label: 'None' },
                        { val: 'repeat', label: 'Both' },
                        { val: 'repeat-x', label: 'X' },
                        { val: 'repeat-y', label: 'Y' },
                      ] as const).map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => updateImageProp({ repeat: val })}
                          className={cn(
                            "px-2 py-1 text-xs rounded border transition-colors",
                            imageRepeat === val 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/50 border-border hover:bg-muted"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Opacity */}
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">
                      Layer Opacity: {imageOpacity}%
                    </Label>
                    <Slider
                      value={[imageOpacity]}
                      onValueChange={(values) => updateImageProp({ opacity: values[0] })}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (layer.type) {
      case 'fill': return <Paintbrush className="h-3.5 w-3.5" />;
      case 'gradient': return <Blend className="h-3.5 w-3.5" />;
      case 'image': return <Image className="h-3.5 w-3.5" />;
    }
  };

  const getLabel = () => {
    switch (layer.type) {
      case 'fill': return 'Fill';
      case 'gradient': return 'Gradient';
      case 'image': return 'Image';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded border bg-card",
        isDragging && "shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <span className="text-muted-foreground">{getIcon()}</span>
        <span className="text-xs uppercase text-muted-foreground">{getLabel()}</span>
      </div>
      
      {renderLayerContent()}
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(layer.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function BackgroundEditor({
  backgroundColor,
  backgroundGradient,
  backgroundImage,
  backgroundLayerOrder,
  onBackgroundColorChange,
  onBackgroundGradientChange,
  onBackgroundImageChange,
  onLayerOrderChange,
}: BackgroundEditorProps) {
  const [layers, setLayers] = useState<BackgroundLayer[]>([]);

  // Keep stable access to latest layers inside callbacks
  const layersRef = useRef<BackgroundLayer[]>([]);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Optimistic UI: keep the layer visible and interactive while class update debounce runs
  // (otherwise the "init from props" effect can temporarily remove the layer and close the popover)
  const OPTIMISTIC_TTL_MS = 2500;
  const optimisticRef = useRef<
    Partial<Record<BackgroundLayer['type'], { value: any; ts: number }>>
  >({});

  // Track which layer types have been explicitly deleted to prevent re-adding from class styles
  const [deletedTypes, setDeletedTypes] = useState<Set<string>>(new Set());

  // Sync layer order to parent whenever layers change
  const syncLayerOrder = (newLayers: BackgroundLayer[]) => {
    if (onLayerOrderChange) {
      const order = newLayers.map(l => l.type);
      onLayerOrderChange(order);
    }
  };

  // Helper to check if a value is "set" (not empty/default)
  const isValueSet = (value: any, type: 'fill' | 'gradient' | 'image'): boolean => {
    if (value === undefined || value === null || value === '') return false;
    
    if (type === 'fill') {
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        return v !== '' && v !== 'transparent' && v !== 'none' && v !== '__deleted__';
      }
      if (typeof value === 'object' && value.value) {
        const v = String(value.value).trim().toLowerCase();
        return v !== '' && v !== 'transparent' && v !== 'none' && v !== '__deleted__';
      }
      return false;
    }
    
    if (type === 'gradient') {
      // Support both string and object { value, opacity } format
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        return v !== '' && v !== '__deleted__';
      }
      if (typeof value === 'object' && value.value) {
        const v = String(value.value).trim().toLowerCase();
        return v !== '' && v !== '__deleted__';
      }
      return false;
    }
    
    if (type === 'image') {
      // Support both string and object { value, opacity } format
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        return v !== '' && v !== '__deleted__';
      }
      if (typeof value === 'object' && value.value) {
        const v = String(value.value).trim().toLowerCase();
        return v !== '' && v !== '__deleted__';
      }
      return false;
    }
    
    return false;
  };

  // Initialize layers from props - only show layers that are actually set and not deleted
  // CRITICAL: Preserve pending layers during sync to avoid blinking/closing popovers
  // CRITICAL: Also preserve recently user-set values while class updates are debounced
  useEffect(() => {
    const now = Date.now();

    const getOptimistic = (type: BackgroundLayer['type']) => {
      const entry = optimisticRef.current[type];
      if (!entry) return undefined;
      if (now - entry.ts > OPTIMISTIC_TTL_MS) {
        delete (optimisticRef.current as any)[type];
        return undefined;
      }
      return entry.value;
    };

    const isSame = (a: any, b: any) => {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return a === b;
      }
    };

    // If props have caught up to optimistic values, clear them
    const optFill = getOptimistic('fill');
    if (optFill !== undefined && isSame(backgroundColor, optFill)) {
      delete (optimisticRef.current as any).fill;
    }

    const optGradient = getOptimistic('gradient');
    if (optGradient !== undefined && typeof optGradient === 'string' && backgroundGradient === optGradient) {
      delete (optimisticRef.current as any).gradient;
    }

    const optImage = getOptimistic('image');
    if (optImage !== undefined && typeof optImage === 'string' && backgroundImage === optImage) {
      delete (optimisticRef.current as any).image;
    }

    setLayers((prevLayers) => {
      // Keep any pending layers (user is currently selecting a value)
      const pendingLayers = prevLayers.filter((l) => {
        return typeof l.value === 'object' && (l.value as any)?.isPending;
      });
      const pendingTypes = new Set(pendingLayers.map((l) => l.type));

      const initialLayers: BackgroundLayer[] = [];

      // Build layers from props (or optimistic values) in saved order
      // IMPORTANT: CSS background stack renders the first item on top.
      // Keep default order consistent with ComponentRenderer (image on top by default)
      const savedOrder = backgroundLayerOrder || ['image', 'gradient', 'fill'];

      for (const layerType of savedOrder) {
        if (deletedTypes.has(layerType)) continue;
        if (pendingTypes.has(layerType as any)) continue;

        if (layerType === 'fill') {
          if (isValueSet(backgroundColor, 'fill')) {
            initialLayers.push({ id: 'fill', type: 'fill', value: backgroundColor, enabled: true });
          } else {
            const optimistic = getOptimistic('fill');
            if (optimistic !== undefined && isValueSet(optimistic, 'fill')) {
              initialLayers.push({ id: 'fill', type: 'fill', value: optimistic, enabled: true });
            }
          }
        }

        if (layerType === 'gradient') {
          if (isValueSet(backgroundGradient, 'gradient')) {
            initialLayers.push({ id: 'gradient', type: 'gradient', value: backgroundGradient, enabled: true });
          } else {
            const optimistic = getOptimistic('gradient');
            if (optimistic !== undefined && isValueSet(optimistic, 'gradient')) {
              initialLayers.push({ id: 'gradient', type: 'gradient', value: optimistic, enabled: true });
            }
          }
        }

        if (layerType === 'image') {
          if (isValueSet(backgroundImage, 'image')) {
            initialLayers.push({ id: 'image', type: 'image', value: backgroundImage, enabled: true });
          } else {
            const optimistic = getOptimistic('image');
            if (optimistic !== undefined && isValueSet(optimistic, 'image')) {
              initialLayers.push({ id: 'image', type: 'image', value: optimistic, enabled: true });
            }
          }
        }
      }

      // Merge: synced layers + pending layers
      return [...initialLayers, ...pendingLayers];
    });
  }, [backgroundColor, backgroundGradient, backgroundImage, backgroundLayerOrder, deletedTypes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLayers((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newLayers = arrayMove(items, oldIndex, newIndex);
        // Sync layer order to parent
        syncLayerOrder(newLayers);
        return newLayers;
      });
    }
  };

  const handleUpdateLayer = (id: string, value: any) => {
    // Strip isPending flag when user actually selects a value
    let cleanValue = value;
    if (typeof value === 'object' && value !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isPending: _isPending, ...rest } = value as any;
      cleanValue = rest;
    }

    // Sync to parent (use ref to avoid stale state)
    const layer = layersRef.current.find((l) => l.id === id);
    if (!layer) return;

    // Optimistic: keep this value around while class update debounce runs
    optimisticRef.current[layer.type] = { value: cleanValue, ts: Date.now() };

    // Update local state immediately (keeps UI stable)
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, value: cleanValue } : l)));

    switch (layer.type) {
      case 'fill':
        onBackgroundColorChange(cleanValue);
        break;
      case 'gradient':
        // Pass full object with opacity for layered backgrounds
        onBackgroundGradientChange(cleanValue);
        break;
      case 'image':
        // Pass full object with opacity for layered backgrounds
        onBackgroundImageChange(cleanValue);
        break;
    }
  };

  const handleRemoveLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      // Keep parent order in sync so layers don't "jump" on next prop sync
      syncLayerOrder(next);
      return next;
    });
    
    // Mark this type as deleted to prevent re-adding from class styles
    if (layer) {
      setDeletedTypes(prev => new Set([...prev, layer.type]));
      
      // Clear the corresponding prop with a special marker value
      switch (layer.type) {
        case 'fill':
          onBackgroundColorChange('__deleted__');
          break;
        case 'gradient':
          onBackgroundGradientChange('__deleted__');
          break;
        case 'image':
          onBackgroundImageChange('__deleted__');
          break;
      }
    }
  };

  const handleAddLayer = (type: 'fill' | 'gradient' | 'image') => {
    // Remove from deleted types since user is explicitly adding it back
    setDeletedTypes(prev => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
    
    const existingIds = layers.map(l => l.id);
    let newId: string = type;
    let counter = 1;
    while (existingIds.includes(newId)) {
      newId = `${type}-${counter}`;
      counter++;
    }

    // CRITICAL: Do NOT call onChange handlers here - only add layer locally
    // The user must pick a color/gradient/image first, then handleUpdateLayer will sync to parent
    // This prevents the popover from closing immediately due to re-renders
    let defaultValue: any;
    switch (type) {
      case 'fill':
        // Use null/empty placeholder - will be set when user picks a color
        defaultValue = { type: 'solid', value: '', opacity: 100, isPending: true };
        break;
      case 'gradient':
        defaultValue = { isPending: true, value: '' };
        break;
      case 'image':
        defaultValue = { isPending: true, value: '' };
        break;
    }

    setLayers((prev) => {
      // New layers are added to the top of the list (top of the stack in UI)
      const next = [
        {
          id: newId,
          type,
          value: defaultValue,
          enabled: true,
        },
        ...prev,
      ];
      // Sync order immediately so subsequent prop sync keeps stable ordering
      syncLayerOrder(next);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={layers.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {layers.map((layer) => (
              <SortableLayer
                key={layer.id}
                layer={layer}
                onUpdate={handleUpdateLayer}
                onRemove={handleRemoveLayer}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add layer buttons - always visible for unlimited layers */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => handleAddLayer('fill')}
        >
          <Paintbrush className="h-3 w-3 mr-1" />
          Fill
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => handleAddLayer('gradient')}
        >
          <Blend className="h-3 w-3 mr-1" />
          Gradient
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => handleAddLayer('image')}
        >
          <Image className="h-3 w-3 mr-1" />
          Image
        </Button>
      </div>
    </div>
  );
}
