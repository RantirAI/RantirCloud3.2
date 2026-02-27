import React, { useMemo, useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { Move, Anchor, Pin, StickyNote, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// ─── Types ───────────────────────────────────────────────────────────
interface OffsetValue {
  value: string;
  unit: string;
}

interface PositionControlProps {
  value: {
    position?: string;
    top?: OffsetValue | string;
    right?: OffsetValue | string;
    bottom?: OffsetValue | string;
    left?: OffsetValue | string;
    zIndex?: string | number;
  };
  onChange: (updates: Record<string, any>) => void;
  componentProps?: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function normalizeOffsetValue(value: OffsetValue | string | undefined): OffsetValue {
  if (!value) return { value: '', unit: 'px' };
  if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) return value;
  const str = String(value).trim();
  if (str === 'auto' || str === '') return { value: '', unit: 'px' };
  const match = str.match(/^(-?[\d.]+)(px|%|vh|vw)?$/);
  if (match) return { value: match[1], unit: match[2] || 'px' };
  if (!isNaN(Number(str))) return { value: str, unit: 'px' };
  return { value: '', unit: 'px' };
}

function hasValue(offset: OffsetValue | string | undefined): boolean {
  const n = normalizeOffsetValue(offset);
  return n.value !== '' && n.value !== undefined;
}

// ─── Constants ───────────────────────────────────────────────────────
type AnchorPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const ANCHOR_POSITIONS: AnchorPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right'
];

const ANCHOR_DEFAULTS: Record<AnchorPosition, Record<string, OffsetValue>> = {
  'top-left':      { top: { value: '0', unit: 'px' }, left: { value: '0', unit: 'px' } },
  'top-center':    { top: { value: '0', unit: 'px' }, left: { value: '50', unit: '%' } },
  'top-right':     { top: { value: '0', unit: 'px' }, right: { value: '0', unit: 'px' } },
  'middle-left':   { top: { value: '50', unit: '%' }, left: { value: '0', unit: 'px' } },
  'center':        { top: { value: '50', unit: '%' }, left: { value: '50', unit: '%' } },
  'middle-right':  { top: { value: '50', unit: '%' }, right: { value: '0', unit: 'px' } },
  'bottom-left':   { bottom: { value: '0', unit: 'px' }, left: { value: '0', unit: 'px' } },
  'bottom-center': { bottom: { value: '0', unit: 'px' }, left: { value: '50', unit: '%' } },
  'bottom-right':  { bottom: { value: '0', unit: 'px' }, right: { value: '0', unit: 'px' } },
};

const ZINDEX_PRESETS = ['auto', '0', '1', '10', '50', '100', '500', '1000'];
const OFFSET_UNITS = ['px', '%', 'vh', 'vw'];

const POSITION_OPTIONS = [
  { value: 'static', label: 'Static', icon: Move, desc: 'Default document flow' },
  { value: 'relative', label: 'Relative', icon: Move, desc: 'Offset from normal position' },
  { value: 'absolute', label: 'Absolute', icon: Anchor, desc: 'Relative to positioned ancestor' },
  { value: 'fixed', label: 'Fixed', icon: Pin, desc: 'Relative to viewport' },
  { value: 'sticky', label: 'Sticky', icon: StickyNote, desc: 'Sticks on scroll' },
] as const;

// ─── Main Component ──────────────────────────────────────────────────
export function PositionControl({ value, onChange, componentProps }: PositionControlProps) {
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps);

  const [userSetOffsets, setUserSetOffsets] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (hasValue(value.top)) set.add('top');
    if (hasValue(value.right)) set.add('right');
    if (hasValue(value.bottom)) set.add('bottom');
    if (hasValue(value.left)) set.add('left');
    return set;
  });

  const position = value.position || 'static';
  const isRelative = position === 'relative';
  const isAbsoluteOrFixed = position === 'absolute' || position === 'fixed';
  const isSticky = position === 'sticky';
  const isStatic = position === 'static' || !position;

  const topValue = useMemo(() => normalizeOffsetValue(value.top), [value.top]);
  const rightValue = useMemo(() => normalizeOffsetValue(value.right), [value.right]);
  const bottomValue = useMemo(() => normalizeOffsetValue(value.bottom), [value.bottom]);
  const leftValue = useMemo(() => normalizeOffsetValue(value.left), [value.left]);

  const zIndexValue = useMemo(() => {
    if (value.zIndex === undefined || value.zIndex === null || value.zIndex === '') return 'auto';
    return String(value.zIndex);
  }, [value.zIndex]);

  // Detect active anchor
  const currentAnchor = useMemo((): AnchorPosition | null => {
    if (!isAbsoluteOrFixed) return null;
    const hT = hasValue(value.top), hB = hasValue(value.bottom);
    const hL = hasValue(value.left), hR = hasValue(value.right);
    const top = normalizeOffsetValue(value.top);
    const bottom = normalizeOffsetValue(value.bottom);
    const left = normalizeOffsetValue(value.left);
    const right = normalizeOffsetValue(value.right);

    let vertical: 'top' | 'middle' | 'bottom' | null = null;
    if (hT && top.value === '0') vertical = 'top';
    else if (hT && top.value === '50' && top.unit === '%') vertical = 'middle';
    else if (hB && bottom.value === '0') vertical = 'bottom';

    let horizontal: 'left' | 'center' | 'right' | null = null;
    if (hL && left.value === '0') horizontal = 'left';
    else if (hL && left.value === '50' && left.unit === '%') horizontal = 'center';
    else if (hR && right.value === '0') horizontal = 'right';

    if (vertical && horizontal) return `${vertical}-${horizontal}` as AnchorPosition;
    return null;
  }, [value.top, value.bottom, value.left, value.right, isAbsoluteOrFixed]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handlePositionChange = useCallback((newPosition: string) => {
    const updates: Record<string, any> = { position: newPosition };
    if (newPosition === 'static') {
      updates.top = { value: '', unit: 'px' };
      updates.right = { value: '', unit: 'px' };
      updates.bottom = { value: '', unit: 'px' };
      updates.left = { value: '', unit: 'px' };
      updates.zIndex = '';
      setUserSetOffsets(new Set());
    }
    if (newPosition === 'sticky' && !hasValue(value.top)) {
      updates.top = { value: '0', unit: 'px' };
      setUserSetOffsets(prev => new Set([...prev, 'top']));
    }
    onChange(updates);
  }, [onChange, value.top]);

  const handleAnchorClick = useCallback((anchor: AnchorPosition) => {
    const defaults = ANCHOR_DEFAULTS[anchor];
    // Reset all offsets then apply anchor defaults
    const updates: Record<string, any> = {
      top: { value: '', unit: 'px' },
      right: { value: '', unit: 'px' },
      bottom: { value: '', unit: 'px' },
      left: { value: '', unit: 'px' },
    };
    Object.entries(defaults).forEach(([key, val]) => { updates[key] = val; });
    setUserSetOffsets(new Set(Object.keys(defaults)));
    onChange(updates);
  }, [onChange]);

  const handleOffsetChange = useCallback((offsetKey: string, newValue: string) => {
    const current = normalizeOffsetValue(value[offsetKey as keyof typeof value] as OffsetValue | string);
    setUserSetOffsets(prev => new Set([...prev, offsetKey]));
    onChange({ [offsetKey]: { ...current, value: newValue } });
  }, [onChange, value]);

  const handleUnitChange = useCallback((offsetKey: string, newUnit: string) => {
    const current = normalizeOffsetValue(value[offsetKey as keyof typeof value] as OffsetValue | string);
    setUserSetOffsets(prev => new Set([...prev, offsetKey]));
    onChange({ [offsetKey]: { ...current, unit: newUnit } });
  }, [onChange, value]);

  const handleZIndexChange = useCallback((newZIndex: string) => {
    onChange({ zIndex: newZIndex === 'auto' ? '' : newZIndex });
  }, [onChange]);

  const handleResetAll = useCallback(() => {
    onChange({
      position: 'static',
      top: { value: '', unit: 'px' },
      right: { value: '', unit: 'px' },
      bottom: { value: '', unit: 'px' },
      left: { value: '', unit: 'px' },
      zIndex: '',
    });
    setUserSetOffsets(new Set());
  }, [onChange]);

  const getLabelColor = useCallback((propName: string, propValue: any) => {
    const origin = getPropertyOrigin(propName, propValue);
    if (origin.origin === 'active') return 'text-[#1677ff]';
    if (origin.origin === 'inherited' || origin.origin === 'parent') return 'text-[#d9a800]';
    return 'text-muted-foreground';
  }, [getPropertyOrigin]);

  const activeOption = POSITION_OPTIONS.find(o => o.value === position) || POSITION_OPTIONS[0];

  return (
    <div className="space-y-0">
      {/* ─── Position Type Selector ─────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className={cn("text-[10px] uppercase tracking-wider font-medium", getLabelColor('position', position))}>
            Position
          </Label>
          {!isStatic && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleResetAll}
                    className="h-4 w-4 flex items-center justify-center rounded-sm text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">Reset to Static</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <Select value={position} onValueChange={handlePositionChange}>
          <SelectTrigger className="h-7 text-xs">
            <div className="flex items-center gap-1.5">
              <activeOption.icon className="h-3 w-3 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {POSITION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <opt.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs">{opt.label}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Contextual description */}
        <p className="text-[10px] text-muted-foreground/70 leading-tight">
          {activeOption.desc}
        </p>
      </div>

      {/* ─── Progressive Content ────────────────────────────────── */}

      {/* STATIC: nothing extra */}

      {/* RELATIVE: z-index only */}
      {isRelative && (
        <>
          <Separator className="my-2.5 bg-border/40" />
          <ContextLabel text="Normal Flow" />
          <div className="mt-2">
            <ZIndexControl value={zIndexValue} onChange={handleZIndexChange} getLabelColor={getLabelColor} />
          </div>
        </>
      )}

      {/* ABSOLUTE / FIXED: anchor grid + offsets + z-index */}
      {isAbsoluteOrFixed && (
        <>
          <Separator className="my-2.5 bg-border/40" />

          {/* Anchor Grid */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Anchor
            </Label>
            <AnchorGrid currentAnchor={currentAnchor} onAnchorClick={handleAnchorClick} />
          </div>

          <Separator className="my-2.5 bg-border/40" />

          {/* Offsets */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Offsets
            </Label>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              <OffsetInput label="T" fullLabel="Top" value={topValue}
                onValueChange={(v) => handleOffsetChange('top', v)}
                onUnitChange={(u) => handleUnitChange('top', u)}
                labelColor={getLabelColor('top', value.top)}
              />
              <OffsetInput label="R" fullLabel="Right" value={rightValue}
                onValueChange={(v) => handleOffsetChange('right', v)}
                onUnitChange={(u) => handleUnitChange('right', u)}
                labelColor={getLabelColor('right', value.right)}
              />
              <OffsetInput label="B" fullLabel="Bottom" value={bottomValue}
                onValueChange={(v) => handleOffsetChange('bottom', v)}
                onUnitChange={(u) => handleUnitChange('bottom', u)}
                labelColor={getLabelColor('bottom', value.bottom)}
              />
              <OffsetInput label="L" fullLabel="Left" value={leftValue}
                onValueChange={(v) => handleOffsetChange('left', v)}
                onUnitChange={(u) => handleUnitChange('left', u)}
                labelColor={getLabelColor('left', value.left)}
              />
            </div>
          </div>

          <Separator className="my-2.5 bg-border/40" />

          <ContextLabel text={position === 'fixed' ? 'Viewport' : 'Nearest positioned ancestor'} />

          <div className="mt-2">
            <ZIndexControl value={zIndexValue} onChange={handleZIndexChange} getLabelColor={getLabelColor} />
          </div>
        </>
      )}

      {/* STICKY: top offset + z-index */}
      {isSticky && (
        <>
          <Separator className="my-2.5 bg-border/40" />

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              Stick Offset
            </Label>
            <div className="w-1/2">
              <OffsetInput label="T" fullLabel="Top" value={topValue}
                onValueChange={(v) => handleOffsetChange('top', v)}
                onUnitChange={(u) => handleUnitChange('top', u)}
                labelColor={getLabelColor('top', value.top)}
              />
            </div>
          </div>

          <Separator className="my-2.5 bg-border/40" />

          <ContextLabel text="Scroll Container" />

          <div className="mt-2">
            <ZIndexControl value={zIndexValue} onChange={handleZIndexChange} getLabelColor={getLabelColor} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Context Label ───────────────────────────────────────────────────
function ContextLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1 px-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
      <span>Relative to:</span>
      <span className="font-medium text-foreground/70">{text}</span>
    </div>
  );
}

// ─── Anchor Grid ─────────────────────────────────────────────────────
interface AnchorGridProps {
  currentAnchor: AnchorPosition | null;
  onAnchorClick: (anchor: AnchorPosition) => void;
}

function AnchorGrid({ currentAnchor, onAnchorClick }: AnchorGridProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex p-[3px] rounded-md border border-border/50 bg-muted/20">
        <div className="grid grid-cols-3 gap-[2px]">
          {ANCHOR_POSITIONS.map((anchor) => {
            const isActive = currentAnchor === anchor;
            const label = anchor === 'center' ? 'Center' :
              anchor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return (
              <Tooltip key={anchor}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAnchorClick(anchor)}
                    className={cn(
                      "w-[18px] h-[18px] rounded-[3px] border transition-all duration-100 flex items-center justify-center",
                      isActive
                        ? "bg-primary border-primary shadow-sm"
                        : "bg-background/60 border-border/40 hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <span className={cn(
                      "block w-[5px] h-[5px] rounded-full transition-colors",
                      isActive ? "bg-primary-foreground" : "bg-muted-foreground/40"
                    )} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] py-0.5 px-1.5">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Offset Input ────────────────────────────────────────────────────
interface OffsetInputProps {
  label: string;
  fullLabel: string;
  value: OffsetValue;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  labelColor: string;
}

function OffsetInput({ label, fullLabel, value, onValueChange, onUnitChange, labelColor }: OffsetInputProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "text-[10px] font-mono font-medium w-3 text-center shrink-0 cursor-default select-none",
              labelColor
            )}>
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-[10px] py-0.5 px-1.5">{fullLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Input
        type="text"
        value={value.value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="auto"
        className="flex-1 h-6 text-[11px] text-center min-w-0 px-1"
      />
      <Select value={value.unit} onValueChange={onUnitChange}>
        <SelectTrigger className="h-6 w-11 text-[10px] px-1 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          {OFFSET_UNITS.map((unit) => (
            <SelectItem key={unit} value={unit} className="text-[11px]">{unit}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Z-Index Control ─────────────────────────────────────────────────
interface ZIndexControlProps {
  value: string;
  onChange: (value: string) => void;
  getLabelColor: (prop: string, val: any) => string;
}

function ZIndexControl({ value, onChange, getLabelColor }: ZIndexControlProps) {
  const [isCustom, setIsCustom] = useState(() => value !== 'auto' && !ZINDEX_PRESETS.includes(value));

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-1">
      <Label className={cn("text-[10px] uppercase tracking-wider font-medium", getLabelColor('zIndex', value))}>
        Z-Index
      </Label>
      {isCustom ? (
        <div className="flex gap-1">
          <Input
            type="number"
            value={value === 'auto' ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="flex-1 h-6 text-[11px]"
          />
          <button
            onClick={() => { setIsCustom(false); onChange('auto'); }}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded border border-border/40 transition-colors"
          >
            Preset
          </button>
        </div>
      ) : (
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger className="h-6 text-[11px]">
            <SelectValue placeholder="Auto" />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {ZINDEX_PRESETS.map((preset) => (
              <SelectItem key={preset} value={preset} className="text-[11px]">
                {preset === 'auto' ? 'Auto' : preset}
              </SelectItem>
            ))}
            <SelectItem value="custom" className="text-[11px]">Custom…</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
