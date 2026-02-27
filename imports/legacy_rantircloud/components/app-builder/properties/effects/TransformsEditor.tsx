import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Minus, Eye, EyeOff, Link2, Link2Off, Move, Maximize2, RotateCw, Sliders } from 'lucide-react';
import { TransformValues, defaultTransforms, generateTransformCSS } from '@/types/effects';
import { PropertyIndicator } from '../PropertyIndicator';

interface TransformsEditorProps {
  label?: string;
  value: TransformValues;
  onChange: (value: TransformValues) => void;
  classLevel?: number;
  status?: 'active' | 'inherited' | 'manual' | 'none';
  sourceInfo?: { className?: string; source?: string };
}

interface TransformRowProps {
  icon: React.ReactNode;
  label: string;
  summary: string;
  hasChanges: boolean;
  enabled: boolean;
  status: 'active' | 'inherited' | 'manual' | 'none';
  onReset: () => void;
  onToggleEnabled: () => void;
  children: React.ReactNode;
}

function TransformRow({ icon, label, summary, hasChanges, enabled, status, onReset, onToggleEnabled, children }: TransformRowProps) {
  const [open, setOpen] = useState(false);
  
  const getLabelColor = () => {
    if (!enabled) return 'text-muted-foreground/50';
    if (status === 'inherited') return 'text-[#F39C12]';
    if (hasChanges) return 'text-[#2979FF]';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex items-center gap-2 group">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            className={cn(
              "flex-1 flex items-center gap-2 py-1.5 px-2 text-left rounded border border-border/50 hover:border-border hover:bg-muted/30 transition-colors",
              open && "bg-muted/30 border-border",
              !enabled && "opacity-50"
            )}
          >
            <span className={cn("text-muted-foreground")}>{icon}</span>
            <span className={cn("text-xs", getLabelColor())}>{label}:</span>
            <span className={cn("text-xs ml-auto", getLabelColor())}>{summary}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="left" align="start" className="w-64 p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </div>
          </div>
          {children}
        </PopoverContent>
      </Popover>
      
      <div className={cn(
        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        (hasChanges || !enabled) && "opacity-100"
      )}>
        <button
          onClick={onToggleEnabled}
          className={cn(
            "p-1 rounded hover:bg-muted transition-colors",
            enabled ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
          )}
          title={enabled ? "Disable" : "Enable"}
        >
          {enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        {hasChanges && (
          <button
            onClick={onReset}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Reset"
          >
            <Minus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface AxisInputProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  icon?: React.ReactNode;
}

function AxisInput({ label, value, unit, onChange, min = -1000, max = 1000, step = 1, icon }: AxisInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 w-16">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 flex items-center gap-1">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 text-xs"
        />
        <span className="text-[10px] text-muted-foreground w-6">{unit}</span>
      </div>
    </div>
  );
}

export function TransformsEditor({ label = 'Transforms', value, onChange, classLevel, status, sourceInfo }: TransformsEditorProps) {
  const transforms = value || defaultTransforms;

  const updateTranslate = (axis: 'x' | 'y' | 'z', val: number) => {
    const newTranslate = { ...transforms.translate, [axis]: val };
    if (transforms.translate.linked) {
      newTranslate.x = val;
      newTranslate.y = val;
      newTranslate.z = val;
    }
    onChange({ ...transforms, translate: newTranslate });
  };

  const updateScale = (axis: 'x' | 'y' | 'z', val: number) => {
    const newScale = { ...transforms.scale, [axis]: val };
    if (transforms.scale.linked) {
      newScale.x = val;
      newScale.y = val;
      newScale.z = val;
    }
    onChange({ ...transforms, scale: newScale });
  };

  const updateRotate = (axis: 'x' | 'y' | 'z', val: number) => {
    const newRotate = { ...transforms.rotate, [axis]: val };
    if (transforms.rotate.linked) {
      newRotate.x = val;
      newRotate.y = val;
      newRotate.z = val;
    }
    onChange({ ...transforms, rotate: newRotate });
  };

  const updateSkew = (axis: 'x' | 'y', val: number) => {
    const newSkew = { ...transforms.skew, [axis]: val };
    if (transforms.skew.linked) {
      newSkew.x = val;
      newSkew.y = val;
    }
    onChange({ ...transforms, skew: newSkew });
  };

  const toggleLink = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    onChange({
      ...transforms,
      [group]: { ...transforms[group], linked: !transforms[group].linked }
    });
  };

  const toggleEnabled = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    onChange({
      ...transforms,
      [group]: { ...transforms[group], enabled: !transforms[group].enabled }
    });
  };

  const resetGroup = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    onChange({
      ...transforms,
      [group]: defaultTransforms[group]
    });
  };

  const getSummary = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    const t = transforms[group];
    const unit = group === 'translate' ? transforms.translate.unit : 
                 group === 'scale' ? '%' : 'deg';
    
    if (group === 'skew') {
      return `${t.x}${unit} ${t.y}${unit}`;
    }
    const zVal = 'z' in t ? t.z : undefined;
    return `${t.x}${unit} ${t.y}${unit} ${zVal !== undefined ? zVal + unit : ''}`.trim();
  };

  const hasChanges = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    const t = transforms[group];
    const d = defaultTransforms[group];
    const tZ = 'z' in t ? t.z : undefined;
    const dZ = 'z' in d ? d.z : undefined;
    return t.x !== d.x || t.y !== d.y || (tZ !== undefined && dZ !== undefined && tZ !== dZ);
  };

  const hasAnyChanges = hasChanges('translate') || hasChanges('scale') || hasChanges('rotate') || hasChanges('skew');

  const getEffectiveStatus = () => {
    if (status === 'inherited') return 'inherited';
    if (hasAnyChanges) return status === 'active' ? 'active' : 'manual';
    return 'none';
  };

  const effectiveStatus = getEffectiveStatus();

  const getLabelColor = () => {
    switch (effectiveStatus) {
      case 'active':
      case 'manual':
        return 'text-[#2979FF]';
      case 'inherited':
        return 'text-[#F39C12]';
      default:
        return 'text-muted-foreground';
    }
  };

  const getRowStatus = (group: 'translate' | 'scale' | 'rotate' | 'skew') => {
    if (status === 'inherited') return 'inherited';
    if (hasChanges(group)) return 'active';
    return 'none';
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PropertyIndicator classLevel={classLevel} status={effectiveStatus} sourceInfo={sourceInfo} />
            <Label className={cn("text-xs font-medium", getLabelColor())}>{label}</Label>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {/* Translate */}
        <TransformRow
          icon={<Move className="h-4 w-4 text-muted-foreground" />}
          label="Translate"
          summary={getSummary('translate')}
          hasChanges={hasChanges('translate')}
          enabled={transforms.translate.enabled !== false}
          status={getRowStatus('translate')}
          onReset={() => resetGroup('translate')}
          onToggleEnabled={() => toggleEnabled('translate')}
        >
          <div className="space-y-2">
            <AxisInput
              label="X"
              icon={<Move className="h-3 w-3 text-muted-foreground rotate-90" />}
              value={transforms.translate.x}
              unit={transforms.translate.unit}
              onChange={(val) => updateTranslate('x', val)}
              min={-500}
              max={500}
            />
            <AxisInput
              label="Y"
              icon={<Move className="h-3 w-3 text-muted-foreground" />}
              value={transforms.translate.y}
              unit={transforms.translate.unit}
              onChange={(val) => updateTranslate('y', val)}
              min={-500}
              max={500}
            />
            <AxisInput
              label="Z"
              icon={<Move className="h-3 w-3 text-muted-foreground -rotate-45" />}
              value={transforms.translate.z}
              unit={transforms.translate.unit}
              onChange={(val) => updateTranslate('z', val)}
              min={-500}
              max={500}
            />
            <div className="flex justify-end pt-1 border-t border-border/50">
              <button
                onClick={() => toggleLink('translate')}
                className={cn(
                  "p-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-muted transition-colors",
                  transforms.translate.linked ? "text-primary" : "text-muted-foreground"
                )}
              >
                {transforms.translate.linked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                {transforms.translate.linked ? "Linked" : "Unlinked"}
              </button>
            </div>
          </div>
        </TransformRow>

        {/* Scale */}
        <TransformRow
          icon={<Maximize2 className="h-4 w-4 text-muted-foreground" />}
          label="Scale"
          summary={getSummary('scale')}
          hasChanges={hasChanges('scale')}
          enabled={transforms.scale.enabled !== false}
          status={getRowStatus('scale')}
          onReset={() => resetGroup('scale')}
          onToggleEnabled={() => toggleEnabled('scale')}
        >
          <div className="space-y-2">
            <AxisInput
              label="X"
              icon={<Maximize2 className="h-3 w-3 text-muted-foreground rotate-90" />}
              value={transforms.scale.x}
              unit="%"
              onChange={(val) => updateScale('x', val)}
              min={0}
              max={500}
            />
            <AxisInput
              label="Y"
              icon={<Maximize2 className="h-3 w-3 text-muted-foreground" />}
              value={transforms.scale.y}
              unit="%"
              onChange={(val) => updateScale('y', val)}
              min={0}
              max={500}
            />
            <AxisInput
              label="Z"
              icon={<Maximize2 className="h-3 w-3 text-muted-foreground -rotate-45" />}
              value={transforms.scale.z}
              unit="%"
              onChange={(val) => updateScale('z', val)}
              min={0}
              max={500}
            />
            <div className="flex justify-end pt-1 border-t border-border/50">
              <button
                onClick={() => toggleLink('scale')}
                className={cn(
                  "p-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-muted transition-colors",
                  transforms.scale.linked ? "text-primary" : "text-muted-foreground"
                )}
              >
                {transforms.scale.linked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                {transforms.scale.linked ? "Linked" : "Unlinked"}
              </button>
            </div>
          </div>
        </TransformRow>

        {/* Rotate */}
        <TransformRow
          icon={<RotateCw className="h-4 w-4 text-muted-foreground" />}
          label="Rotate"
          summary={getSummary('rotate')}
          hasChanges={hasChanges('rotate')}
          enabled={transforms.rotate.enabled !== false}
          status={getRowStatus('rotate')}
          onReset={() => resetGroup('rotate')}
          onToggleEnabled={() => toggleEnabled('rotate')}
        >
          <div className="space-y-2">
            <AxisInput
              label="X"
              icon={<RotateCw className="h-3 w-3 text-muted-foreground" />}
              value={transforms.rotate.x}
              unit="deg"
              onChange={(val) => updateRotate('x', val)}
              min={-360}
              max={360}
            />
            <AxisInput
              label="Y"
              icon={<RotateCw className="h-3 w-3 text-muted-foreground" />}
              value={transforms.rotate.y}
              unit="deg"
              onChange={(val) => updateRotate('y', val)}
              min={-360}
              max={360}
            />
            <AxisInput
              label="Z"
              icon={<RotateCw className="h-3 w-3 text-muted-foreground" />}
              value={transforms.rotate.z}
              unit="deg"
              onChange={(val) => updateRotate('z', val)}
              min={-360}
              max={360}
            />
            <div className="flex justify-end pt-1 border-t border-border/50">
              <button
                onClick={() => toggleLink('rotate')}
                className={cn(
                  "p-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-muted transition-colors",
                  transforms.rotate.linked ? "text-primary" : "text-muted-foreground"
                )}
              >
                {transforms.rotate.linked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                {transforms.rotate.linked ? "Linked" : "Unlinked"}
              </button>
            </div>
          </div>
        </TransformRow>

        {/* Skew */}
        <TransformRow
          icon={<Sliders className="h-4 w-4 text-muted-foreground" />}
          label="Skew"
          summary={getSummary('skew')}
          hasChanges={hasChanges('skew')}
          enabled={transforms.skew.enabled !== false}
          status={getRowStatus('skew')}
          onReset={() => resetGroup('skew')}
          onToggleEnabled={() => toggleEnabled('skew')}
        >
          <div className="space-y-2">
            <AxisInput
              label="X"
              icon={<Sliders className="h-3 w-3 text-muted-foreground" />}
              value={transforms.skew.x}
              unit="deg"
              onChange={(val) => updateSkew('x', val)}
              min={-90}
              max={90}
            />
            <AxisInput
              label="Y"
              icon={<Sliders className="h-3 w-3 text-muted-foreground rotate-90" />}
              value={transforms.skew.y}
              unit="deg"
              onChange={(val) => updateSkew('y', val)}
              min={-90}
              max={90}
            />
            <div className="flex justify-end pt-1 border-t border-border/50">
              <button
                onClick={() => toggleLink('skew')}
                className={cn(
                  "p-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-muted transition-colors",
                  transforms.skew.linked ? "text-primary" : "text-muted-foreground"
                )}
              >
                {transforms.skew.linked ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
                {transforms.skew.linked ? "Linked" : "Unlinked"}
              </button>
            </div>
          </div>
        </TransformRow>
      </div>
    </div>
  );
}
