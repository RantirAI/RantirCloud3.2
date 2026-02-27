import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  MoreHorizontal,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  Move,
  Square,
  RotateCcw,
  Maximize,
  Minimize,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Expand,
  Shrink,
  ChevronsLeft,
  ChevronsRight,
  FlipHorizontal,
  FlipVertical,
  Hash,
  ArrowUpDown,
  ArrowLeftRight
} from 'lucide-react';
import { getPropertiesForComponent, getCategorizedProperties, PropertyField } from '@/lib/componentPropertyConfig';
import { AdvancedPropertyFieldRenderer } from './AdvancedPropertyFieldRenderer';
import { cn } from '@/lib/utils';


export function AdvancedWebflowStylePanel() {
  const { 
    selectedComponent, 
    currentProject, 
    currentPage, 
    updateComponent 
  } = useAppBuilderStore();

  // If no component is selected, show empty state
  if (!selectedComponent || !currentProject || !currentPage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      </div>
    );
  }

  // Find the selected component
  const findComponent = (components: any[], id: string): any => {
    for (const comp of components) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = findComponent(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const currentPageData = currentProject.pages.find(page => page.id === currentPage);
  if (!currentPageData) return null;

  const component = findComponent(currentPageData.components, selectedComponent);
  if (!component) return null;

  const handlePropertyChange = (propertyName: string, value: any) => {
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        [propertyName]: value
      }
    });
  };

  const handleSpacingBlur = (propertyName: string, value: string) => {
    // On blur, convert empty string to '0' and remove leading zeros
    const cleaned = value.trim() === '' ? '0' : String(parseInt(value) || 0);
    handlePropertyChange(propertyName, cleaned);
  };

  // Combined spacing control component with padding inside margin
  const SpacingControl = () => {
    const marginTop = component.props?.marginTop || 0;
    const marginRight = component.props?.marginRight || 0;
    const marginBottom = component.props?.marginBottom || 0;
    const marginLeft = component.props?.marginLeft || 0;
    const paddingTop = component.props?.paddingTop || 0;
    const paddingRight = component.props?.paddingRight || 0;
    const paddingBottom = component.props?.paddingBottom || 0;
    const paddingLeft = component.props?.paddingLeft || 0;

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-xs text-muted-foreground mb-2 text-center font-medium">MARGIN</div>
        
        {/* Outer Margin Box */}
        <div className="border-2 border-dashed border-gray-300 p-6 relative bg-white">
          {/* Margin Inputs */}
          <Input 
            type="text"
            value={marginTop === 0 ? '' : marginTop} 
            onChange={(e) => handlePropertyChange('marginTop', e.target.value)}
            onBlur={(e) => handleSpacingBlur('marginTop', e.target.value)}
            className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-6 text-xs text-center border bg-white rounded px-1"
            placeholder="0"
          />
          <Input 
            type="text"
            value={marginLeft === 0 ? '' : marginLeft} 
            onChange={(e) => handlePropertyChange('marginLeft', e.target.value)}
            onBlur={(e) => handleSpacingBlur('marginLeft', e.target.value)}
            className="absolute top-1/2 -left-3 transform -translate-y-1/2 w-12 h-6 text-xs text-center border bg-white rounded px-1"
            placeholder="0"
          />
          <Input 
            type="text"
            value={marginRight === 0 ? '' : marginRight} 
            onChange={(e) => handlePropertyChange('marginRight', e.target.value)}
            onBlur={(e) => handleSpacingBlur('marginRight', e.target.value)}
            className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-12 h-6 text-xs text-center border bg-white rounded px-1"
            placeholder="0"
          />
          <Input 
            type="text"
            value={marginBottom === 0 ? '' : marginBottom} 
            onChange={(e) => handlePropertyChange('marginBottom', e.target.value)}
            onBlur={(e) => handleSpacingBlur('marginBottom', e.target.value)}
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-6 text-xs text-center border bg-white rounded px-1"
            placeholder="0"
          />
          
          {/* Inner Padding Box */}
          <div className="bg-orange-50 border-2 border-orange-200 p-4 relative">
            <div className="text-xs text-orange-600 mb-2 text-center font-medium">PADDING</div>
            
            {/* Padding Inputs */}
            <Input 
              type="text"
              value={paddingTop === 0 ? '' : paddingTop} 
              onChange={(e) => handlePropertyChange('paddingTop', e.target.value)}
              onBlur={(e) => handleSpacingBlur('paddingTop', e.target.value)}
              className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-6 text-xs text-center border bg-orange-50 rounded px-1 text-orange-600"
              placeholder="0"
            />
            <Input 
              type="text"
              value={paddingLeft === 0 ? '' : paddingLeft} 
              onChange={(e) => handlePropertyChange('paddingLeft', e.target.value)}
              onBlur={(e) => handleSpacingBlur('paddingLeft', e.target.value)}
              className="absolute top-1/2 -left-3 transform -translate-y-1/2 w-12 h-6 text-xs text-center border bg-orange-50 rounded px-1 text-orange-600"
              placeholder="0"
            />
            <Input 
              type="text"
              value={paddingRight === 0 ? '' : paddingRight} 
              onChange={(e) => handlePropertyChange('paddingRight', e.target.value)}
              onBlur={(e) => handleSpacingBlur('paddingRight', e.target.value)}
              className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-12 h-6 text-xs text-center border bg-orange-50 rounded px-1 text-orange-600"
              placeholder="0"
            />
            <Input 
              type="text"
              value={paddingBottom === 0 ? '' : paddingBottom} 
              onChange={(e) => handlePropertyChange('paddingBottom', e.target.value)}
              onBlur={(e) => handleSpacingBlur('paddingBottom', e.target.value)}
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-6 text-xs text-center border bg-orange-50 rounded px-1 text-orange-600"
              placeholder="0"
            />
            
            {/* Content area */}
            <div className="h-8 bg-blue-50 border border-blue-200 rounded flex items-center justify-center">
              <span className="text-xs text-blue-600">Content</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Icon button component for controls
  const IconButton = ({ icon: Icon, active = false, onClick }: { icon: any, active?: boolean, onClick?: () => void }) => (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn("w-8 h-8 p-0", active && "bg-primary text-primary-foreground")}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Simple Style title */}
      <div className="border-b bg-white p-4">
        <h2 className="text-lg font-semibold">Style</h2>
      </div>

      <ScrollArea className="flex-1" scrollbarVariant="hover-show">
        <div className="p-4 space-y-6">
          {/* Component Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked className="w-4 h-4" />
              <span className="font-medium text-sm">{component.type}</span>
            </div>
            <Button variant="ghost" size="sm" className="p-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Style Sources */}
          <div>
            <h3 className="text-sm font-medium mb-3">Style Sources</h3>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                {component.type}
              </Badge>
              <Switch defaultChecked />
            </div>
          </div>

          {/* Layout */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-gray-900">Layout</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display</label>
                <Select 
                  value={component.props?.display || "block"}
                  onValueChange={(value) => handlePropertyChange('display', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">block</SelectItem>
                    <SelectItem value="inline">inline</SelectItem>
                    <SelectItem value="inline-block">inline-block</SelectItem>
                    <SelectItem value="flex">flex</SelectItem>
                    <SelectItem value="inline-flex">inline-flex</SelectItem>
                    <SelectItem value="grid">grid</SelectItem>
                    <SelectItem value="inline-grid">inline-grid</SelectItem>
                    <SelectItem value="none">none</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Flex Child */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-gray-900">Flex Child</h3>
            <div className="space-y-4">
              {/* Align */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-600 font-medium">Align</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-6 w-6"
                    onClick={() => {
                      handlePropertyChange('alignSelf', 'auto');
                      handlePropertyChange('justifySelf', 'auto');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <IconButton 
                    icon={AlignHorizontalJustifyStart} 
                    active={component.props?.alignSelf === 'flex-start'}
                    onClick={() => handlePropertyChange('alignSelf', 'flex-start')}
                  />
                  <IconButton 
                    icon={AlignHorizontalJustifyCenter} 
                    active={component.props?.alignSelf === 'center'}
                    onClick={() => handlePropertyChange('alignSelf', 'center')}
                  />
                  <IconButton 
                    icon={AlignHorizontalJustifyEnd} 
                    active={component.props?.alignSelf === 'flex-end'}
                    onClick={() => handlePropertyChange('alignSelf', 'flex-end')}
                  />
                  <IconButton 
                    icon={AlignVerticalJustifyStart} 
                    active={component.props?.justifySelf === 'flex-start'}
                    onClick={() => handlePropertyChange('justifySelf', 'flex-start')}
                  />
                  <IconButton 
                    icon={AlignVerticalJustifyCenter} 
                    active={component.props?.justifySelf === 'center'}
                    onClick={() => handlePropertyChange('justifySelf', 'center')}
                  />
                  <IconButton 
                    icon={AlignVerticalJustifyEnd} 
                    active={component.props?.justifySelf === 'flex-end'}
                    onClick={() => handlePropertyChange('justifySelf', 'flex-end')}
                  />
                </div>
              </div>

              {/* Sizing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-600 font-medium">Sizing</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-6 w-6"
                    onClick={() => {
                      handlePropertyChange('flexGrow', '0');
                      handlePropertyChange('flexShrink', '1');
                      handlePropertyChange('flexBasis', 'auto');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <IconButton 
                    icon={ChevronsLeft} 
                    active={component.props?.flexShrink === '1'}
                    onClick={() => handlePropertyChange('flexShrink', '1')}
                  />
                  <IconButton 
                    icon={ArrowLeftRight} 
                    active={component.props?.flexBasis === 'auto'}
                    onClick={() => handlePropertyChange('flexBasis', 'auto')}
                  />
                  <IconButton 
                    icon={ChevronsRight} 
                    active={component.props?.flexGrow === '1'}
                    onClick={() => handlePropertyChange('flexGrow', '1')}
                  />
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Order */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-600 font-medium">Order</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-6 w-6"
                    onClick={() => handlePropertyChange('order', '0')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <IconButton 
                    icon={Hash} 
                    active={component.props?.order === '-1'}
                    onClick={() => handlePropertyChange('order', '-1')}
                  />
                  <IconButton 
                    icon={Square} 
                    active={component.props?.order === '0'}
                    onClick={() => handlePropertyChange('order', '0')}
                  />
                  <IconButton 
                    icon={Hash} 
                    active={component.props?.order === '1'}
                    onClick={() => handlePropertyChange('order', '1')}
                  />
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Space */}
          <div>
            <h3 className="text-sm font-medium mb-3">Space</h3>
            <SpacingControl />
          </div>

          {/* Size */}
          <div>
            <h3 className="text-sm font-medium mb-3">Size</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                <div className="flex">
                  <Input 
                    value={component.props?.width || "auto"} 
                    onChange={(e) => handlePropertyChange('width', e.target.value)}
                    className="h-8 rounded-r-none border-r-0"
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2 rounded-l-none border-l-0">
                    -
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Height</label>
                <div className="flex">
                  <Input 
                    value={component.props?.height || "auto"} 
                    onChange={(e) => handlePropertyChange('height', e.target.value)}
                    className="h-8 rounded-r-none border-r-0"
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2 rounded-l-none border-l-0">
                    -
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Width</label>
                <div className="flex">
                  <Input 
                    value={component.props?.minWidth || "auto"} 
                    onChange={(e) => handlePropertyChange('minWidth', e.target.value)}
                    className="h-8 rounded-r-none border-r-0"
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2 rounded-l-none border-l-0">
                    -
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Height</label>
                <div className="flex">
                  <Input 
                    value={component.props?.minHeight || "auto"} 
                    onChange={(e) => handlePropertyChange('minHeight', e.target.value)}
                    className="h-8 rounded-r-none border-r-0"
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2 rounded-l-none border-l-0">
                    -
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}