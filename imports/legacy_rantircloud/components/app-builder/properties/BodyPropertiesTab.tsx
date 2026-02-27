import React, { useState, useMemo } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { VisualSpacingEditor } from './VisualSpacingEditor';
import { LayoutControl } from './LayoutControl';
import { DimensionControl } from './DimensionControl';
import { VisualBorderEditor } from './VisualBorderEditor';
import { BackgroundEditor } from './BackgroundEditor';
import { TypographyControl } from './TypographyControl';
import { BoxShadowsEditor, FiltersEditor, TransitionsEditor, TransformsEditor } from './effects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BodyClassSelector } from './BodyClassSelector';
import { defaultTransformValues } from '@/types/effects';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onReset?: () => void;
  hasEditedProperties?: boolean;
  labelColor?: string;
  dotColor?: string;
}

function SectionHeader({ 
  title, 
  isOpen, 
  onToggle, 
  onReset, 
  hasEditedProperties,
  labelColor = 'text-muted-foreground',
  dotColor 
}: SectionHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 cursor-pointer border-b border-border/50">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={`font-medium text-xs ${labelColor}`}>{title}</span>
          {dotColor && <span className={`h-2 w-2 rounded-full ${dotColor}`}></span>}
        </div>
        {hasEditedProperties && onReset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Reset {title.toLowerCase()} to default</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </CollapsibleTrigger>
  );
}

// Deep merge helper for class inheritance
function deepMergeStyles(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMergeStyles(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }
  return result;
}

export function BodyPropertiesTab() {
  const { currentProject, currentPage, updatePageBodyProperties } = useAppBuilderStore();
  const { classes, updateClass } = useClassStore();
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    spacing: true,
    size: false,
    backgrounds: true,
    borders: false,
    typography: false,
    effects: false,
    transform: false,
    advanced: false,
  });

  const pageData = useMemo(() => {
    if (!currentProject || !currentPage) return undefined;
    return currentProject.pages.find(p => p.id === currentPage);
  }, [currentProject, currentPage]);

  const bodyProps = pageData?.bodyProperties || {};

  const activeClassName: string | null =
    (typeof (bodyProps as any).activeClass === 'string' && (bodyProps as any).activeClass) ||
    (Array.isArray((bodyProps as any).appliedClasses) && (bodyProps as any).appliedClasses.length > 0
      ? (bodyProps as any).appliedClasses[(bodyProps as any).appliedClasses.length - 1]
      : null);

  const activeClass = useMemo(
    () => (activeClassName ? classes.find((c) => c.name === activeClassName) : undefined),
    [classes, activeClassName]
  );

  // Compute resolved props from applied classes
  const resolvedProps = useMemo(() => {
    const appliedClasses: string[] = bodyProps.appliedClasses || [];
    let classStyles: Record<string, any> = {};
    
    // Deep merge styles from all applied classes in order
    for (const className of appliedClasses) {
      const classData = classes.find(c => c.name === className);
      if (classData?.styles) {
        classStyles = deepMergeStyles(classStyles, classData.styles);
      }
    }
    
    // Local props override class styles
    return { ...classStyles, ...bodyProps };
  }, [bodyProps, classes]);
  
  // Create synthetic component props for useStylePropertyOrigin hook
  const syntheticComponentProps = useMemo(() => ({
    ...resolvedProps,
    appliedClasses: bodyProps.appliedClasses || [],
    activeClass: activeClassName,
  }), [resolvedProps, bodyProps.appliedClasses, activeClassName]);
  
  // Use the style property origin hook for section indicators - MUST be before any early returns
  const { getSectionColors } = useStylePropertyOrigin(syntheticComponentProps, 'div', 'page-body');

  // Early return AFTER all hooks
  if (!currentProject || !currentPage || !pageData) return null;

  const clearLocalOverrides = (keys: string[]) => {
    if (keys.length === 0) return;
    if (!currentPage) return;
    const next = { ...bodyProps } as Record<string, any>;
    for (const k of keys) delete next[k];
    updatePageBodyProperties(currentPage, next);
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (activeClass) {
      // Class-first: update the active class, not inline body overrides.
      updateClass(activeClass.id, {
        styles: deepMergeStyles(activeClass.styles || {}, { [property]: value }),
      });
      clearLocalOverrides([property]);
      return;
    }

    updatePageBodyProperties(currentPage, {
      ...bodyProps,
      [property]: value,
    });
  };

  const handleMultiPropertyChange = (updates: Record<string, any>) => {
    if (activeClass) {
      updateClass(activeClass.id, {
        styles: deepMergeStyles(activeClass.styles || {}, updates),
      });
      clearLocalOverrides(Object.keys(updates));
      return;
    }

    updatePageBodyProperties(currentPage, {
      ...bodyProps,
      ...updates,
    });
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Define which properties belong to each section for reset
  const sectionPropertyMap: Record<string, string[]> = {
    layout: ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap'],
    spacing: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    size: ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'],
    backgrounds: ['backgroundColor', 'backgroundGradient', 'backgroundImage', 'backgroundLayerOrder'],
    borders: ['border', 'borderRadius', 'borderWidth', 'borderStyle', 'borderColor'],
    typography: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'color', 'fontStyle', 'textDecoration', 'letterSpacing', 'textTransform'],
    effects: ['opacity', 'boxShadows', 'filters', 'transitions'],
    transform: ['transforms'],
    advanced: ['overflow', 'cursor', 'customCSS'],
  };

  // Check if a section has any edited properties
  const sectionHasEditedProperties = (sectionName: string): boolean => {
    const props = sectionPropertyMap[sectionName] || [];
    if (activeClass) {
      return props.some(p => activeClass.styles?.[p] !== undefined && activeClass.styles[p] !== null && activeClass.styles[p] !== '');
    }
    return props.some(p => bodyProps[p] !== undefined && bodyProps[p] !== null && bodyProps[p] !== '');
  };

  // Reset a section's properties
  const handleResetSection = (sectionName: string) => {
    const props = sectionPropertyMap[sectionName] || [];
    
    if (activeClass) {
      // Remove these properties from the active class's styles
      const updatedStyles = { ...activeClass.styles };
      for (const p of props) {
        delete updatedStyles[p];
      }
      updateClass(activeClass.id, { styles: updatedStyles });
    }
    
    // Also clear any local overrides
    clearLocalOverrides(props);
  };

  const widthValue = resolvedProps.width && typeof resolvedProps.width === 'object'
    ? resolvedProps.width
    : { value: resolvedProps.width ? String(resolvedProps.width).replace(/[^0-9.]/g, '') : '', unit: resolvedProps.width ? (String(resolvedProps.width).replace(/[0-9.]/g, '') || 'px') : 'auto' };

  const heightValue = resolvedProps.height && typeof resolvedProps.height === 'object'
    ? resolvedProps.height
    : { value: resolvedProps.height ? String(resolvedProps.height).replace(/[^0-9.]/g, '') : '', unit: resolvedProps.height ? (String(resolvedProps.height).replace(/[0-9.]/g, '') || 'px') : 'auto' };

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/50">
        {/* CSS Class Selector - Same as component styling */}
        <div className="p-2 bg-card border-b border-border/50">
          <BodyClassSelector />
        </div>

        {/* Layout Section */}
        {(() => {
          const layoutProps = ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap'];
          const colors = getSectionColors(layoutProps);
          return (
            <Collapsible open={openSections.layout} onOpenChange={() => toggleSection('layout')}>
              <SectionHeader title="Layout" isOpen={openSections.layout} onToggle={() => toggleSection('layout')} onReset={() => handleResetSection('layout')} hasEditedProperties={sectionHasEditedProperties('layout')} {...colors} />
              <CollapsibleContent>
            <div className="p-3 space-y-3 bg-card">
              <LayoutControl
                value={{
                  display: resolvedProps.display || 'block',
                  flexDirection: resolvedProps.flexDirection,
                  justifyContent: resolvedProps.justifyContent,
                  alignItems: resolvedProps.alignItems,
                  gap: resolvedProps.gap,
                }}
                onChange={(layout: any) => {
                  handleMultiPropertyChange(layout);
                }}
              />
              </div>
            </CollapsibleContent>
          </Collapsible>
          );
        })()}

        {/* Spacing Section */}
        {(() => {
          const spacingProps = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
          const colors = getSectionColors(spacingProps);
          return (
            <Collapsible open={openSections.spacing} onOpenChange={() => toggleSection('spacing')}>
              <SectionHeader title="Spacing" isOpen={openSections.spacing} onToggle={() => toggleSection('spacing')} onReset={() => handleResetSection('spacing')} hasEditedProperties={sectionHasEditedProperties('spacing')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 bg-card">
                  <VisualSpacingEditor
                    label=""
                    value={{
                      margin: {
                        top: resolvedProps.marginTop || '0',
                        right: resolvedProps.marginRight || '0',
                        bottom: resolvedProps.marginBottom || '0',
                        left: resolvedProps.marginLeft || '0',
                        unit: 'px'
                      },
                      padding: {
                        top: resolvedProps.paddingTop || '0',
                        right: resolvedProps.paddingRight || '0',
                        bottom: resolvedProps.paddingBottom || '0',
                        left: resolvedProps.paddingLeft || '0',
                        unit: 'px'
                      }
                    }}
                    onChange={(spacing: any) => {
                      handleMultiPropertyChange({
                        marginTop: spacing.margin.top,
                        marginRight: spacing.margin.right,
                        marginBottom: spacing.margin.bottom,
                        marginLeft: spacing.margin.left,
                        paddingTop: spacing.padding.top,
                        paddingRight: spacing.padding.right,
                        paddingBottom: spacing.padding.bottom,
                        paddingLeft: spacing.padding.left,
                      });
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Size Section */}
        {(() => {
          const sizeProps = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'];
          const colors = getSectionColors(sizeProps);
          return (
            <Collapsible open={openSections.size} onOpenChange={() => toggleSection('size')}>
              <SectionHeader title="Size" isOpen={openSections.size} onToggle={() => toggleSection('size')} onReset={() => handleResetSection('size')} hasEditedProperties={sectionHasEditedProperties('size')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 space-y-3 bg-card">
                  <div className="grid grid-cols-2 gap-3">
                    <DimensionControl
                      label="WIDTH"
                      value={widthValue}
                      onChange={(val) => handlePropertyChange('width', val)}
                      componentProps={resolvedProps}
                      propertyName="width"
                    />
                    <DimensionControl
                      label="HEIGHT"
                      value={heightValue}
                      onChange={(val) => handlePropertyChange('height', val)}
                      componentProps={resolvedProps}
                      propertyName="height"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DimensionControl
                      label="MIN W"
                      value={resolvedProps.minWidth || { value: '', unit: 'px' }}
                      onChange={(val) => handlePropertyChange('minWidth', val)}
                      componentProps={resolvedProps}
                      propertyName="minWidth"
                    />
                    <DimensionControl
                      label="MIN H"
                      value={resolvedProps.minHeight || { value: '', unit: 'px' }}
                      onChange={(val) => handlePropertyChange('minHeight', val)}
                      componentProps={resolvedProps}
                      propertyName="minHeight"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DimensionControl
                      label="MAX W"
                      value={resolvedProps.maxWidth || { value: '', unit: 'auto' }}
                      onChange={(val) => handlePropertyChange('maxWidth', val)}
                      componentProps={resolvedProps}
                      propertyName="maxWidth"
                    />
                    <DimensionControl
                      label="MAX H"
                      value={resolvedProps.maxHeight || { value: '', unit: 'auto' }}
                      onChange={(val) => handlePropertyChange('maxHeight', val)}
                      componentProps={resolvedProps}
                      propertyName="maxHeight"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Backgrounds Section */}
        {(() => {
          const bgProps = ['backgroundColor', 'backgroundGradient', 'backgroundImage'];
          const colors = getSectionColors(bgProps);
          return (
            <Collapsible open={openSections.backgrounds} onOpenChange={() => toggleSection('backgrounds')}>
              <SectionHeader title="Background" isOpen={openSections.backgrounds} onToggle={() => toggleSection('backgrounds')} onReset={() => handleResetSection('backgrounds')} hasEditedProperties={sectionHasEditedProperties('backgrounds')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 bg-card">
                  <BackgroundEditor
                    backgroundColor={resolvedProps.backgroundColor || ''}
                    backgroundGradient={resolvedProps.backgroundGradient || ''}
                    backgroundImage={resolvedProps.backgroundImage || ''}
                    backgroundLayerOrder={resolvedProps.backgroundLayerOrder}
                    onBackgroundColorChange={(value) => handlePropertyChange('backgroundColor', value)}
                    onBackgroundGradientChange={(value) => handlePropertyChange('backgroundGradient', value)}
                    onBackgroundImageChange={(value) => handlePropertyChange('backgroundImage', value)}
                    onLayerOrderChange={(order) => handlePropertyChange('backgroundLayerOrder', order)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Borders Section */}
        {(() => {
          const borderProps = ['border', 'borderRadius'];
          const colors = getSectionColors(borderProps);
          return (
            <Collapsible open={openSections.borders} onOpenChange={() => toggleSection('borders')}>
              <SectionHeader title="Borders" isOpen={openSections.borders} onToggle={() => toggleSection('borders')} onReset={() => handleResetSection('borders')} hasEditedProperties={sectionHasEditedProperties('borders')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 bg-card">
                  <VisualBorderEditor
                    label=""
                    value={resolvedProps.border || {
                      width: '0',
                      style: 'none',
                      color: '#000000',
                      unit: 'px',
                      sides: { top: true, right: true, bottom: true, left: true },
                    }}
                    onChange={(border) => handlePropertyChange('border', border)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Typography Section */}
        {(() => {
          const typographyProps = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'color', 'fontStyle', 'textDecoration', 'letterSpacing', 'textTransform'];
          const colors = getSectionColors(typographyProps);
          return (
            <Collapsible open={openSections.typography} onOpenChange={() => toggleSection('typography')}>
              <SectionHeader title="Typography" isOpen={openSections.typography} onToggle={() => toggleSection('typography')} onReset={() => handleResetSection('typography')} hasEditedProperties={sectionHasEditedProperties('typography')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 bg-card">
                  <TypographyControl
                    label=""
                    value={{
                      fontFamily: resolvedProps.fontFamily || 'inherit',
                      fontSize: resolvedProps.fontSize || '16',
                      fontWeight: resolvedProps.fontWeight || '400',
                      lineHeight: resolvedProps.lineHeight || '1.5',
                      textAlign: resolvedProps.textAlign || 'left',
                      color: resolvedProps.color || '#000000',
                      fontStyle: resolvedProps.fontStyle || 'normal',
                      textDecoration: resolvedProps.textDecoration || 'none',
                      letterSpacing: resolvedProps.letterSpacing || '0',
                      textTransform: resolvedProps.textTransform || 'none',
                    }}
                    onChange={(typography) => {
                      handleMultiPropertyChange(typography);
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Effects Section */}
        {(() => {
          const effectsProps = ['opacity', 'boxShadows', 'filters'];
          const colors = getSectionColors(effectsProps);
          return (
            <Collapsible open={openSections.effects} onOpenChange={() => toggleSection('effects')}>
              <SectionHeader title="Effects" isOpen={openSections.effects} onToggle={() => toggleSection('effects')} onReset={() => handleResetSection('effects')} hasEditedProperties={sectionHasEditedProperties('effects')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 space-y-4 bg-card">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Opacity</Label>
                    <Input
                      type="number"
                      value={resolvedProps.opacity ?? 1}
                      onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                      min={0}
                      max={1}
                      step={0.1}
                      className="h-7 text-xs"
                    />
                  </div>
                  
                  <BoxShadowsEditor
                    value={resolvedProps.boxShadows || []}
                    onChange={(value) => handlePropertyChange('boxShadows', value)}
                  />
                  
                  <FiltersEditor
                    value={resolvedProps.filters || []}
                    onChange={(value) => handlePropertyChange('filters', value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Transform Section */}
        {(() => {
          const transformProps = ['transforms'];
          const colors = getSectionColors(transformProps);
          return (
            <Collapsible open={openSections.transform} onOpenChange={() => toggleSection('transform')}>
              <SectionHeader title="Transform" isOpen={openSections.transform} onToggle={() => toggleSection('transform')} onReset={() => handleResetSection('transform')} hasEditedProperties={sectionHasEditedProperties('transform')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 bg-card">
                  <TransformsEditor
                    value={resolvedProps.transforms || defaultTransformValues}
                    onChange={(value) => handlePropertyChange('transforms', value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Advanced Section */}
        {(() => {
          const advancedProps = ['overflow', 'cursor', 'customCSS'];
          const colors = getSectionColors(advancedProps);
          return (
            <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
              <SectionHeader title="Advanced" isOpen={openSections.advanced} onToggle={() => toggleSection('advanced')} onReset={() => handleResetSection('advanced')} hasEditedProperties={sectionHasEditedProperties('advanced')} {...colors} />
              <CollapsibleContent>
                <div className="p-3 space-y-3 bg-card">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Overflow</Label>
                    <Select
                      value={resolvedProps.overflow || 'visible'}
                      onValueChange={(value) => handlePropertyChange('overflow', value)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visible">Visible</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                        <SelectItem value="scroll">Scroll</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cursor</Label>
                    <Select
                      value={resolvedProps.cursor || 'auto'}
                      onValueChange={(value) => handlePropertyChange('cursor', value)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="pointer">Pointer</SelectItem>
                        <SelectItem value="grab">Grab</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="not-allowed">Not Allowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom CSS</Label>
                    <textarea
                      value={resolvedProps.customCSS || ''}
                      onChange={(e) => handlePropertyChange('customCSS', e.target.value)}
                      placeholder="Custom CSS properties..."
                      className="w-full h-20 px-2 py-1.5 text-xs font-mono border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}
      </div>
    </ScrollArea>
  );
}
