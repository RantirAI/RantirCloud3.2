import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Expand,
  Settings,
  AlignCenterHorizontal
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClassSelector } from './ClassSelector';
import { TypographyControl } from './properties/TypographyControl';
import { LayoutControl } from './properties/LayoutControl';
import { HexColorPicker } from 'react-colorful';
import { VisualBorderRadiusEditor } from './properties/VisualBorderRadiusEditor';
import { VisualBorderEditor } from './properties/VisualBorderEditor';
import { SvgSpacingEditor } from './properties/SvgSpacingEditor';
import { useClassStack } from '@/hooks/useClassStack';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { PropertyLabel, SectionHeaderIndicator } from './properties/PropertyIndicator';

export function WebflowStylePanel() {
  const { 
    selectedComponent, 
    currentProject,
    currentPage,
    updateComponent, 
    duplicateComponent, 
    deleteComponent 
  } = useAppBuilderStore();

  const [openSections, setOpenSections] = useState({
    layout: true,
    sizing: false,
    order: false,
    space: true,
    size: true,
    typography: true,
    background: true,
    borders: false,
    effects: false
  });

  if (!selectedComponent || !currentProject || !currentPage) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-background text-muted-foreground">
        <div className="text-center space-y-3">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-medium text-sm text-foreground">No Element Selected</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select an element on the canvas to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const findComponent = (components: any[], id: string): any => {
    for (const component of components) {
      if (component.id === id) return component;
      if (component.children) {
        const found = findComponent(component.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const pageData = currentProject.pages.find(p => p.id === currentPage);
  const component = pageData ? findComponent(pageData.components, selectedComponent) : null;
  
  if (!component) return null;
  
  // Use class stack hook for property tracking
  const { 
    classStack, 
    activeClass,
    mergedStyles,
    propertySources, 
    getPropertyStatus,
    getPropertyClassLevel: getPropertyClassLevelFromHook
  } = useClassStack(selectedComponent, component.props);
  
  // Use style property origin hook for proper lock detection (BLUE vs YELLOW)
  const { getSectionColors } = useStylePropertyOrigin(component.props, component.type, selectedComponent);
  
  console.log('[WebflowStylePanel] Class stack info:', { 
    selectedComponent,
    classStack, 
    activeClass, 
    propertySources,
    componentProps: component.props 
  });
  
  // Get class level for a property
  const getPropertyClassLevel = (propertyName: string): number | undefined => {
    const level = getPropertyClassLevelFromHook(propertyName);
    console.log(`[WebflowStylePanel] Property "${propertyName}" class level:`, level);
    return level;
  };

  const handlePropertyChange = (propertyName: string, value: any) => {
    console.log('WebflowStylePanel - Property change:', propertyName, value);
    
    const currentProps = component.props || {};
    const updatedProps = { ...currentProps };
    
    // Handle property deletion if value is undefined
    if (value === undefined || value === null || value === '') {
      delete updatedProps[propertyName];
    } else {
      updatedProps[propertyName] = value;
    }
    
    updateComponent(selectedComponent, {
      props: updatedProps
    });
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Parse margin/padding from component props into structured format
  const parseSpacingValue = (value: any, type: 'margin' | 'padding') => {
    const defaultSpacing = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const };
    
    if (!value) return defaultSpacing;
    
    // If it's already an object with top/right/bottom/left
    if (typeof value === 'object' && 'top' in value) {
      return { ...defaultSpacing, ...value };
    }
    
    // If it's a string like "10px" or just "10"
    if (typeof value === 'string') {
      const match = value.match(/^(\d+)(px|rem|em|%)?$/);
      if (match) {
        const [, num, unit = 'px'] = match;
        return {
          top: num,
          right: num,
          bottom: num,
          left: num,
          unit: unit as 'px' | 'rem' | 'em' | '%'
        };
      }
    }
    
    return defaultSpacing;
  };

  const SectionHeader = ({ 
    title, 
    isOpen, 
    onToggle,
    properties = [],
    onCenterAuto
  }: { 
    title: string, 
    isOpen: boolean, 
    onToggle: () => void,
    properties?: string[],
    onCenterAuto?: () => void
  }) => {
    // Use getSectionColors which checks __lockedProps for proper BLUE vs YELLOW coloring
    const { dotColor } = properties.length > 0 ? getSectionColors(properties) : { dotColor: undefined };
    
    return (
      <div 
        className="flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-muted/50 rounded"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {dotColor && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {onCenterAuto && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); onCenterAuto(); }}
              title="Center (margin: auto)"
            >
              <AlignCenterHorizontal className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1" scrollbarVariant="hover-show">
        <div className="p-4 space-y-4">
          
          {/* Classes Section - New prominent placement */}
          <div className="mb-4">
            <ClassSelector 
              componentId={selectedComponent} 
              currentClassName={component.props?.className}
            />
          </div>
          
          <Separator className="my-4" />
          
          {/* Layout Section */}
          <div>
            <SectionHeader 
              title="Layout" 
              isOpen={openSections.layout} 
              onToggle={() => toggleSection('layout')}
              properties={['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap']}
            />
            {openSections.layout && (
              <div className="px-4 py-2">
                <LayoutControl
                  value={{
                    display: mergedStyles?.display || component.props?.display,
                    flexDirection: mergedStyles?.flexDirection || component.props?.flexDirection,
                    justifyContent: mergedStyles?.justifyContent || component.props?.justifyContent,
                    alignItems: mergedStyles?.alignItems || component.props?.alignItems,
                    gap: mergedStyles?.gap || component.props?.gap,
                    gridTemplateColumns: mergedStyles?.gridTemplateColumns || component.props?.gridTemplateColumns,
                    gridTemplateRows: mergedStyles?.gridTemplateRows || component.props?.gridTemplateRows,
                    gridAutoFlow: mergedStyles?.gridAutoFlow || component.props?.gridAutoFlow
                  }}
                  onChange={(updates) => {
                    Object.entries(updates).forEach(([property, value]) => {
                      handlePropertyChange(property, value);
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* Typography Section - Only for text components */}
          {(component.type === 'text' || component.type === 'heading' || component.type === 'button') && (
            <div>
              <SectionHeader 
                title="Typography" 
                isOpen={openSections.typography} 
                onToggle={() => toggleSection('typography')}
                properties={['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'textDecoration', 'fontStyle']}
              />
              {openSections.typography && (
                <div className="px-4 py-2">
                  <TypographyControl
                    label="Typography"
                    value={{
                      fontFamily: mergedStyles?.fontFamily || component.props?.fontFamily,
                      fontSize: mergedStyles?.fontSize || component.props?.fontSize,
                      fontWeight: mergedStyles?.fontWeight || component.props?.fontWeight,
                      lineHeight: mergedStyles?.lineHeight || component.props?.lineHeight,
                      letterSpacing: mergedStyles?.letterSpacing || component.props?.letterSpacing,
                      textAlign: mergedStyles?.textAlign || component.props?.textAlign,
                      textTransform: mergedStyles?.textTransform || component.props?.textTransform,
                      textDecoration: mergedStyles?.textDecoration || component.props?.textDecoration,
                      fontStyle: mergedStyles?.fontStyle || component.props?.fontStyle
                    }}
                    onChange={(updates) => {
                      Object.entries(updates).forEach(([property, value]) => {
                        handlePropertyChange(property, value);
                      });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Background & Color Section */}
          <div>
            <SectionHeader 
              title="Background & Color" 
              isOpen={openSections.background} 
              onToggle={() => toggleSection('background')}
              properties={['color', 'backgroundColor']}
            />
            {openSections.background && (
              <div className="px-4 py-2 space-y-4">
                <div className="space-y-2">
                  <PropertyLabel 
                    label="TEXT COLOR"
                    classLevel={getPropertyClassLevel('color')}
                    status={getPropertyStatus('color')}
                    sourceInfo={propertySources['color']}
                  />
                  <div className="space-y-2">
                    <Input
                      value={mergedStyles?.color || component.props?.color || '#000000'}
                      onChange={(e) => handlePropertyChange('color', e.target.value)}
                      placeholder="#000000"
                      className="font-mono"
                    />
                    <HexColorPicker
                      color={mergedStyles?.color || component.props?.color || '#000000'}
                      onChange={(color) => handlePropertyChange('color', color)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <PropertyLabel 
                    label="BACKGROUND COLOR"
                    classLevel={getPropertyClassLevel('backgroundColor')}
                    status={getPropertyStatus('backgroundColor')}
                    sourceInfo={propertySources['backgroundColor']}
                  />
                  <div className="space-y-2">
                    <Input
                      value={mergedStyles?.backgroundColor || component.props?.backgroundColor || '#ffffff'}
                      onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="font-mono"
                    />
                    <HexColorPicker
                      color={mergedStyles?.backgroundColor || component.props?.backgroundColor || '#ffffff'}
                      onChange={(color) => handlePropertyChange('backgroundColor', color)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Section */}
          <div>
            <SectionHeader 
              title="Order" 
              isOpen={openSections.order} 
              onToggle={() => toggleSection('order')}
              properties={['order']}
            />
            {openSections.order && (
              <div className="px-4 py-2 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Space Section */}
          <div>
            <SectionHeader 
              title="Space" 
              isOpen={openSections.space} 
              onToggle={() => toggleSection('space')}
              properties={[
                'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
              ]}
              onCenterAuto={() => {
                const currentMargin = parseSpacingValue(mergedStyles?.margin || component.props?.margin, 'margin');
                handlePropertyChange('margin', {
                  ...currentMargin,
                  left: 'auto',
                  right: 'auto',
                });
              }}
            />
            {openSections.space && (
              <div className="px-4 py-2">
                <SvgSpacingEditor
                  key={`spacing-${selectedComponent}-${Date.now()}`}
                  value={{
                    margin: parseSpacingValue(mergedStyles?.margin || component.props?.margin, 'margin'),
                    padding: parseSpacingValue(mergedStyles?.padding || component.props?.padding, 'padding')
                  }}
                  onChange={(value) => {
                    handlePropertyChange('margin', value.margin);
                    handlePropertyChange('padding', value.padding);
                  }}
                  componentProps={component.props}
                />
              </div>
            )}
          </div>

          {/* Size Section */}
          <div>
            <SectionHeader 
              title="Size" 
              isOpen={openSections.size} 
              onToggle={() => toggleSection('size')}
              properties={['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight']}
            />
            {openSections.size && (
              <div className="px-4 py-2 space-y-4">
                
                {/* Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">auto</SelectItem>
                        <SelectItem value="100%">100%</SelectItem>
                        <SelectItem value="fit-content">fit-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">auto</SelectItem>
                        <SelectItem value="100%">100%</SelectItem>
                        <SelectItem value="fit-content">fit-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Min Width & Min Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Width</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">auto</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="min-content">min-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Height</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">auto</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="min-content">min-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Max Width & Max Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Width</Label>
                    <Select defaultValue="none">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="100%">100%</SelectItem>
                        <SelectItem value="max-content">max-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Height</Label>
                    <Select defaultValue="none">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="100%">100%</SelectItem>
                        <SelectItem value="max-content">max-content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">auto</SelectItem>
                      <SelectItem value="1/1">1:1</SelectItem>
                      <SelectItem value="16/9">16:9</SelectItem>
                      <SelectItem value="4/3">4:3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            )}
          </div>

          {/* Borders Section - No section header, just the editors */}
          <div className="px-4 py-2 space-y-4">
            {(() => {
              // Get color for border properties
              const { dotColor } = getSectionColors(['border', 'borderRadius']);
              const propertyColor = dotColor?.includes('amber') ? 'yellow' as const : 
                                    dotColor?.includes('blue') ? 'blue' as const : undefined;
              
              return (
                <>
                  <VisualBorderRadiusEditor
                    label="Radius"
                    value={{
                      topLeft: mergedStyles?.borderRadius?.topLeft || component.props?.borderRadius?.topLeft || '0',
                      topRight: mergedStyles?.borderRadius?.topRight || component.props?.borderRadius?.topRight || '0',
                      bottomRight: mergedStyles?.borderRadius?.bottomRight || component.props?.borderRadius?.bottomRight || '0',
                      bottomLeft: mergedStyles?.borderRadius?.bottomLeft || component.props?.borderRadius?.bottomLeft || '0',
                      unit: mergedStyles?.borderRadius?.unit || component.props?.borderRadius?.unit || 'px'
                    }}
                    onChange={(value) => handlePropertyChange('borderRadius', value)}
                    componentProps={component.props}
                    componentType={component.type}
                  />
                  
                  <VisualBorderEditor
                    label=""
                    value={{
                      width: mergedStyles?.border?.width || component.props?.border?.width || '0',
                      style: mergedStyles?.border?.style || component.props?.border?.style || 'none',
                      color: mergedStyles?.border?.color || component.props?.border?.color || '#000000',
                      unit: mergedStyles?.border?.unit || component.props?.border?.unit || 'px',
                      sides: {
                        top: mergedStyles?.border?.sides?.top ?? component.props?.border?.sides?.top ?? false,
                        right: mergedStyles?.border?.sides?.right ?? component.props?.border?.sides?.right ?? false,
                        bottom: mergedStyles?.border?.sides?.bottom ?? component.props?.border?.sides?.bottom ?? false,
                        left: mergedStyles?.border?.sides?.left ?? component.props?.border?.sides?.left ?? false
                      }
                    }}
                    onChange={(value) => handlePropertyChange('border', value)}
                    componentProps={component.props}
                    componentType={component.type}
                  />
                </>
              );
            })()}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}