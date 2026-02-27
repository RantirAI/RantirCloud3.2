import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, ArrowDown, ArrowUp, ArrowLeft, RotateCcw, Smartphone, Tablet, WrapText, AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, Columns3, Link2, Link2Off, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breakpoint } from '@/lib/breakpoints';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LayoutControlProps {
  value: {
    display: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    alignContent?: string;
    gap?: string;
    rowGap?: string;
    columnGap?: string;
    flexWrap?: string;
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    gridAutoFlow?: string;
    textAlign?: string;
    width?: string;
  };
  onChange: (value: any) => void;
  currentBreakpoint?: Breakpoint;
  hasBreakpointOverride?: (property: string) => boolean;
  onRevertBreakpointProperty?: (property: string) => void;
}

function BreakpointBadge({ breakpoint, property, onRevert }: { breakpoint: Breakpoint; property: string; onRevert?: () => void }) {
  if (breakpoint === 'desktop') return null;
  const icon = breakpoint === 'tablet' ? <Tablet className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-blue-500/20 text-blue-500 rounded ml-1">
          {icon}
          {onRevert && (
            <button className="ml-0.5 hover:text-blue-700 transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRevert(); }} title={`Revert ${property}`}>
              <RotateCcw className="w-2 h-2" />
            </button>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {onRevert ? `Click ↻ to revert ${property}` : `Editing ${property} for ${breakpoint}`}
      </TooltipContent>
    </Tooltip>
  );
}

const gridPositions = [
  { x: 0, y: 0, justify: 'flex-start', align: 'flex-start' },
  { x: 1, y: 0, justify: 'center', align: 'flex-start' },
  { x: 2, y: 0, justify: 'flex-end', align: 'flex-start' },
  { x: 0, y: 1, justify: 'flex-start', align: 'center' },
  { x: 1, y: 1, justify: 'center', align: 'center' },
  { x: 2, y: 1, justify: 'flex-end', align: 'center' },
  { x: 0, y: 2, justify: 'flex-start', align: 'flex-end' },
  { x: 1, y: 2, justify: 'center', align: 'flex-end' },
  { x: 2, y: 2, justify: 'flex-end', align: 'flex-end' },
];

const flexDirections = [
  { value: 'row', icon: ArrowRight, label: 'Row' },
  { value: 'column', icon: ArrowDown, label: 'Column' },
  { value: 'row-reverse', icon: ArrowLeft, label: 'Row Reverse' },
  { value: 'column-reverse', icon: ArrowUp, label: 'Column Reverse' },
];

const distributionOptions = [
  { value: 'flex-start', label: 'Pack Start', icon: () => <div className="flex gap-px items-end"><div className="w-[3px] h-2 bg-current rounded-[0.5px]" /><div className="w-[3px] h-1.5 bg-current rounded-[0.5px]" /><div className="w-[3px] h-2 bg-current rounded-[0.5px] opacity-30" /></div> },
  { value: 'space-between', label: 'Space Between', icon: AlignHorizontalSpaceBetween },
  { value: 'space-around', label: 'Space Around', icon: AlignHorizontalSpaceAround },
  { value: 'space-evenly', label: 'Space Evenly', icon: Columns3 },
];

const wrapOptions = [
  { value: 'nowrap', label: 'No Wrap', icon: () => <div className="flex gap-px"><div className="w-[3px] h-1.5 bg-current rounded-[0.5px]" /><div className="w-[3px] h-1.5 bg-current rounded-[0.5px]" /><div className="w-[3px] h-1.5 bg-current rounded-[0.5px]" /></div> },
  { value: 'wrap', label: 'Wrap', icon: WrapText },
  { value: 'wrap-reverse', label: 'Wrap Reverse', icon: Repeat },
];

const justifyContentOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'End' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'space-evenly', label: 'Space Evenly' },
];

const alignItemsOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'baseline', label: 'Baseline' },
];

const alignContentOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'space-evenly', label: 'Space Evenly' },
];

const gapUnitOptions = ['px', 'rem', 'em', '%', 'vw'];

const allDisplayOptions = [
  { value: 'block', label: 'Block' },
  { value: 'flex', label: 'Flex' },
  { value: 'grid', label: 'Grid' },
  { value: 'inline-block', label: 'Inline-block' },
  { value: 'inline-flex', label: 'Inline-flex' },
  { value: 'inline-grid', label: 'Inline-grid' },
  { value: 'inline', label: 'Inline' },
  { value: 'none', label: 'None' },
];

const gridTemplateOptions = [
  { value: '1fr', label: '1 column' },
  { value: '1fr 1fr', label: '2 columns' },
  { value: '1fr 1fr 1fr', label: '3 columns' },
  { value: '1fr 1fr 1fr 1fr', label: '4 columns' },
  { value: 'repeat(auto-fit, minmax(200px, 1fr))', label: 'Auto-fit' },
];

const gridAutoFlowOptions = [
  { value: 'row', label: 'Row' },
  { value: 'column', label: 'Column' },
  { value: 'row dense', label: 'Row Dense' },
  { value: 'column dense', label: 'Column Dense' },
];

export function LayoutControl({ value, onChange, currentBreakpoint = 'desktop', hasBreakpointOverride, onRevertBreakpointProperty }: LayoutControlProps) {
  const [gapLinked, setGapLinked] = useState(true);
  const [gapUnit, setGapUnit] = useState('px');
  const isResponsiveMode = currentBreakpoint !== 'desktop';
  const currentDisplay = value.display || 'block';
  const [uiDisplay, setUiDisplay] = useState(currentDisplay);
  React.useEffect(() => { setUiDisplay(currentDisplay); }, [currentDisplay]);
  const isFlex = uiDisplay === 'flex' || uiDisplay === 'inline-flex';
  const isGrid = uiDisplay === 'grid' || uiDisplay === 'inline-grid';
  const isBlock = uiDisplay === 'block' || uiDisplay === 'inline-block';

  const handleDisplayChange = (newDisplay: string) => {
    setUiDisplay(newDisplay);
    const updates: any = { display: newDisplay };
    if (newDisplay === 'flex' || newDisplay === 'inline-flex') {
      updates.flexDirection = value.flexDirection || 'row';
      updates.justifyContent = value.justifyContent || 'flex-start';
      updates.alignItems = value.alignItems || 'flex-start';
    } else {
      updates.flexDirection = undefined;
      updates.justifyContent = undefined;
      updates.alignItems = undefined;
    }
    if (newDisplay === 'grid' || newDisplay === 'inline-grid') {
      updates.gridTemplateColumns = value.gridTemplateColumns || '1fr';
      updates.gridAutoFlow = value.gridAutoFlow || 'row';
    } else {
      updates.gridTemplateColumns = undefined;
      updates.gridTemplateRows = undefined;
      updates.gridAutoFlow = undefined;
    }
    onChange({ ...value, ...updates });
  };

  const handleProp = (property: string, val: string) => {
    onChange({ ...value, [property]: val });
  };

  const handleGridPositionClick = (position: { justify: string; align: string }) => {
    onChange({ ...value, justifyContent: position.justify, alignItems: position.align });
  };

  const getCurrentGridPosition = () => {
    const justify = value.justifyContent || 'flex-start';
    const align = value.alignItems || 'flex-start';
    return gridPositions.find(pos => pos.justify === justify && pos.align === align) || gridPositions[0];
  };

  const parseGapNum = (v: string | undefined) => parseFloat(String(v ?? '0').replace(/[a-z%]+$/i, '') || '0');
  const gapValue = parseGapNum(value.gap);
  const rowGapValue = parseGapNum(value.rowGap ?? value.gap);
  const colGapValue = parseGapNum(value.columnGap ?? value.gap);
  const isWrapping = value.flexWrap === 'wrap' || value.flexWrap === 'wrap-reverse';

  return (
    <div className="space-y-4 px-1 py-[6%] pointer-events-auto" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {/* Display dropdown */}
      <div className="flex items-center gap-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 w-14 font-medium">Display</Label>
        <Select value={uiDisplay} onValueChange={handleDisplayChange}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {allDisplayOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flex Controls */}
      {isFlex && (
        <div className="space-y-4">
          {/* Alignment grid + Direction/Distribution icons */}
          <div className="flex items-start gap-4">
            {/* 3x3 dot grid */}
            <div className="shrink-0">
              <div className="grid grid-cols-3 gap-[5px] p-1.5 border border-border rounded-md bg-muted/30">
                {gridPositions.map((position, index) => {
                  const isActive = getCurrentGridPosition().x === position.x && getCurrentGridPosition().y === position.y;
                  return (
                    <button
                      type="button"
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        isActive
                          ? "bg-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                          : "bg-muted-foreground/25 hover:bg-muted-foreground/50"
                      )}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGridPositionClick(position); }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Direction + Distribution + Wrap */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-1">
                {flexDirections.map((dir) => {
                  const Icon = dir.icon;
                  return (
                    <Tooltip key={dir.value}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded transition-all",
                            value.flexDirection === dir.value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleProp('flexDirection', dir.value); }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{dir.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="flex gap-1">
                {distributionOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded transition-all",
                            value.justifyContent === opt.value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleProp('justifyContent', opt.value); }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{opt.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
                <div className="w-px bg-border mx-1" />
                {wrapOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded transition-all",
                            (value.flexWrap || 'nowrap') === opt.value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleProp('flexWrap', opt.value); }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{opt.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Precise dropdowns for justify-content and align-items */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Justify</Label>
              <Select value={value.justifyContent || 'flex-start'} onValueChange={(val) => handleProp('justifyContent', val)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {justifyContentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Align</Label>
              <Select value={value.alignItems || 'flex-start'} onValueChange={(val) => handleProp('alignItems', val)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {alignItemsOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Align Content — only when wrapping */}
          {isWrapping && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">Align Content</Label>
              <Select value={value.alignContent || 'stretch'} onValueChange={(val) => handleProp('alignContent', val)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {alignContentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gap row with unit selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Gap</Label>
              <Select value={gapUnit} onValueChange={setGapUnit}>
                <SelectTrigger className="h-5 w-14 text-[10px] border-0 bg-transparent px-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {gapUnitOptions.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground font-mono w-3 shrink-0 cursor-default">↕</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Row Gap</TooltipContent>
                </Tooltip>
                <Input
                  type="number"
                  value={gapLinked ? gapValue : rowGapValue}
                  onChange={(e) => {
                    const v = `${e.target.value}${gapUnit}`;
                    if (gapLinked) onChange({ ...value, gap: v, rowGap: v, columnGap: v });
                    else onChange({ ...value, rowGap: v });
                  }}
                  className="w-full h-6 text-xs"
                  min="0"
                  step={gapUnit === 'rem' || gapUnit === 'em' ? 0.25 : 1}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-6 w-6 flex items-center justify-center rounded shrink-0 transition-colors",
                      gapLinked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setGapLinked(!gapLinked)}
                  >
                    {gapLinked ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{gapLinked ? 'Unlink gaps' : 'Link gaps'}</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground font-mono w-3 shrink-0 cursor-default">↔</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Column Gap</TooltipContent>
                </Tooltip>
                <Input
                  type="number"
                  value={gapLinked ? gapValue : colGapValue}
                  onChange={(e) => {
                    const v = `${e.target.value}${gapUnit}`;
                    if (gapLinked) onChange({ ...value, gap: v, rowGap: v, columnGap: v });
                    else onChange({ ...value, columnGap: v });
                  }}
                  className="w-full h-6 text-xs"
                  min="0"
                  step={gapUnit === 'rem' || gapUnit === 'em' ? 0.25 : 1}
                  disabled={gapLinked}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Controls */}
      {isGrid && (
        <div className="space-y-3 pl-1">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Columns</Label>
            <Select value={value.gridTemplateColumns || '1fr'} onValueChange={(val) => handleProp('gridTemplateColumns', val)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {gridTemplateOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Rows</Label>
            <Input type="text" value={value.gridTemplateRows || 'auto'} onChange={(e) => handleProp('gridTemplateRows', e.target.value)} className="h-7 text-xs" placeholder="auto" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Flow</Label>
            <Select value={value.gridAutoFlow || 'row'} onValueChange={(val) => handleProp('gridAutoFlow', val)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {gridAutoFlowOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-2">
              <Label className={cn("text-xs", hasBreakpointOverride?.('gap') ? "text-[hsl(var(--primary))]" : "text-muted-foreground")}>Gap</Label>
              {isResponsiveMode && hasBreakpointOverride?.('gap') && (
                <BreakpointBadge breakpoint={currentBreakpoint} property="gap" onRevert={onRevertBreakpointProperty ? () => onRevertBreakpointProperty('gap') : undefined} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Slider value={[gapValue]} onValueChange={(vals) => handleProp('gap', `${vals[0]}px`)} max={100} step={1} className="flex-1" />
              <Input type="number" value={gapValue} onChange={(e) => handleProp('gap', `${e.target.value}px`)} className="w-12 h-7 text-xs" min="0" />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </div>
        </div>
      )}

      {isBlock && <div className="space-y-3 pl-1" />}
    </div>
  );
}
