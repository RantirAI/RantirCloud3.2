import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from './IconPicker';
import { Plus, X, GripVertical, ChevronDown, ChevronRight, Link2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  type: 'page' | 'external' | 'group';
  pageId?: string;
  externalUrl?: string;
  label: string;
  icon?: string;
  iconVariant?: string;
  children?: NavItem[];
}

interface SidebarPropertiesProps {
  component: any;
  onUpdate: (updates: any) => void;
}

export function SidebarProperties({ component, onUpdate }: SidebarPropertiesProps) {
  const { currentProject } = useAppBuilderStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const props = component.props || {};
  const availablePages = currentProject?.pages || [];
  const configuredPages = props.pages || [];

  const generateId = () => `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddPage = (type: 'page' | 'external' = 'page') => {
    const newItem: any = {
      id: generateId(),
      type,
      label: type === 'page' ? (availablePages[0]?.name || 'New Page') : 'External Link',
      icon: 'Home2',
      iconVariant: 'Bold',
      children: []
    };

    if (type === 'page' && availablePages.length > 0) {
      newItem.pageId = availablePages[0].id;
    } else if (type === 'external') {
      newItem.externalUrl = 'https://';
    }

    onUpdate({
      props: {
        ...props,
        pages: [...configuredPages, newItem]
      }
    });
  };

  const handleAddChild = (parentIndex: number) => {
    const newChild: any = {
      id: generateId(),
      type: 'page',
      label: availablePages[0]?.name || 'Sub Page',
      pageId: availablePages[0]?.id,
      icon: 'ArrowRight2',
      iconVariant: 'Bold'
    };

    const updatedPages = [...configuredPages];
    if (!updatedPages[parentIndex].children) {
      updatedPages[parentIndex].children = [];
    }
    updatedPages[parentIndex].children.push(newChild);

    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });

    // Expand the parent
    setExpandedItems(prev => new Set([...prev, parentIndex]));
  };

  const handleRemovePage = (index: number) => {
    const updatedPages = configuredPages.filter((_: any, i: number) => i !== index);
    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });
  };

  const handleRemoveChild = (parentIndex: number, childIndex: number) => {
    const updatedPages = [...configuredPages];
    updatedPages[parentIndex].children = updatedPages[parentIndex].children.filter(
      (_: any, i: number) => i !== childIndex
    );
    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });
  };

  const handleUpdatePage = (index: number, updates: any) => {
    const updatedPages = configuredPages.map((page: any, i: number) => 
      i === index ? { ...page, ...updates } : page
    );
    
    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });
  };

  const handleUpdateChild = (parentIndex: number, childIndex: number, updates: any) => {
    const updatedPages = [...configuredPages];
    updatedPages[parentIndex].children[childIndex] = {
      ...updatedPages[parentIndex].children[childIndex],
      ...updates
    };
    
    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const updatedPages = [...configuredPages];
    const [draggedItem] = updatedPages.splice(draggedIndex, 1);
    updatedPages.splice(dropIndex, 0, draggedItem);

    onUpdate({
      props: {
        ...props,
        pages: updatedPages
      }
    });

    setDraggedIndex(null);
  };

  const updateProp = (key: string, value: any) => {
    onUpdate({
      props: {
        ...props,
        [key]: value
      }
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const mode = props.mode || 'sidebar';
  const isTopbar = mode === 'topbar' || mode === 'resizable-topbar';

  const renderNavItem = (pageConfig: any, index: number, isChild: boolean = false, parentIndex?: number) => {
    const page = pageConfig.type !== 'external' 
      ? availablePages.find(p => p.id === pageConfig.pageId)
      : null;
    const hasChildren = pageConfig.children?.length > 0;
    const isExpanded = expandedItems.has(index);

    return (
      <Card 
        key={pageConfig.id || index}
        className={cn(
          'transition-all duration-200',
          draggedIndex === index && 'opacity-50',
          isChild && 'ml-4 border-l-2 border-primary/20'
        )}
        draggable={!isChild}
        onDragStart={() => !isChild && handleDragStart(index)}
        onDragOver={handleDragOver}
        onDrop={(e) => !isChild && handleDrop(e, index)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isChild && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />}
              {hasChildren && !isChild && (
                <button onClick={() => toggleExpanded(index)} className="p-0.5">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              <CardTitle className="text-sm flex items-center gap-1">
                {pageConfig.type === 'external' && <ExternalLink className="h-3 w-3" />}
                {pageConfig.label || page?.name || 'Unknown'}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {pageConfig.type === 'external' ? 'Link' : (page?.name || pageConfig.pageId)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isChild && parentIndex !== undefined 
                ? handleRemoveChild(parentIndex, index) 
                : handleRemovePage(index)
              }
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Type selector */}
          {!isChild && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={pageConfig.type || 'page'} 
                onValueChange={(value) => {
                  const updates: any = { type: value };
                  if (value === 'external') {
                    updates.externalUrl = pageConfig.externalUrl || 'https://';
                    delete updates.pageId;
                  } else {
                    updates.pageId = availablePages[0]?.id;
                    delete updates.externalUrl;
                  }
                  isChild && parentIndex !== undefined
                    ? handleUpdateChild(parentIndex, index, updates)
                    : handleUpdatePage(index, updates);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page Link</SelectItem>
                  <SelectItem value="external">External URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Page or URL selector */}
          {pageConfig.type === 'external' ? (
            <div className="space-y-2">
              <Label>External URL</Label>
              <Input
                value={pageConfig.externalUrl || ''}
                onChange={(e) => isChild && parentIndex !== undefined
                  ? handleUpdateChild(parentIndex, index, { externalUrl: e.target.value })
                  : handleUpdatePage(index, { externalUrl: e.target.value })
                }
                placeholder="https://example.com"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Page</Label>
              <Select 
                value={pageConfig.pageId} 
                onValueChange={(value) => {
                  const selectedPage = availablePages.find(p => p.id === value);
                  const updates = { 
                    pageId: value,
                    label: selectedPage?.name || pageConfig.label
                  };
                  isChild && parentIndex !== undefined
                    ? handleUpdateChild(parentIndex, index, updates)
                    : handleUpdatePage(index, updates);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Display Label</Label>
            <Input
              value={pageConfig.label || ''}
              onChange={(e) => isChild && parentIndex !== undefined
                ? handleUpdateChild(parentIndex, index, { label: e.target.value })
                : handleUpdatePage(index, { label: e.target.value })
              }
              placeholder="Page label"
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <IconPicker
              value={pageConfig.icon || 'Home2'}
              variant={pageConfig.iconVariant || 'Bold'}
              onChange={(icon, variant) => isChild && parentIndex !== undefined
                ? handleUpdateChild(parentIndex, index, { icon, iconVariant: variant })
                : handleUpdatePage(index, { icon, iconVariant: variant })
              }
            />
          </div>

          {/* Add child button - only for non-child items */}
          {!isChild && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddChild(index)}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Sub-item
            </Button>
          )}
        </CardContent>

        {/* Render children */}
        {hasChildren && isExpanded && !isChild && (
          <div className="px-4 pb-4 space-y-2">
            {pageConfig.children.map((child: any, childIdx: number) => 
              renderNavItem(child, childIdx, true, index)
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Mode Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Navigation Mode</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === 'sidebar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateProp('mode', 'sidebar')}
            className="h-16 flex flex-col gap-1"
          >
            <div className="flex gap-1">
              <div className="w-3 h-8 bg-current opacity-30 rounded-sm" />
              <div className="w-6 h-8 bg-current opacity-10 rounded-sm" />
            </div>
            <span className="text-xs">Sidebar</span>
          </Button>
          <Button
            variant={mode === 'topbar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateProp('mode', 'topbar')}
            className="h-16 flex flex-col gap-1"
          >
            <div className="flex flex-col gap-1">
              <div className="w-10 h-3 bg-current opacity-30 rounded-sm" />
              <div className="w-10 h-5 bg-current opacity-10 rounded-sm" />
            </div>
            <span className="text-xs">Topbar</span>
          </Button>
        </div>
        <Button
          variant={mode === 'resizable-topbar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateProp('mode', 'resizable-topbar')}
          className="w-full h-12 flex flex-col gap-1"
        >
          <div className="flex flex-col gap-1">
            <div className="w-16 h-2 bg-current opacity-30 rounded-full" />
            <div className="w-16 h-4 bg-current opacity-10 rounded-sm" />
          </div>
          <span className="text-[10px]">Animated Topbar</span>
        </Button>
      </div>

      {/* Logo Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Logo</h3>
        
        <div className="space-y-2">
          <Label>Logo URL</Label>
          <div className="flex gap-2">
            <Input
              value={props.logo || ''}
              onChange={(e) => updateProp('logo', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1"
            />
          </div>
          {props.logo && (
            <div className="p-2 border rounded-md bg-muted/30">
              <img 
                src={props.logo} 
                alt="Logo preview"
                className="h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Logo Height</Label>
            <Input
              value={props.logoHeight || '32px'}
              onChange={(e) => updateProp('logoHeight', e.target.value)}
              placeholder="32px"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo Alt Text</Label>
            <Input
              value={props.logoAlt || ''}
              onChange={(e) => updateProp('logoAlt', e.target.value)}
              placeholder="Logo"
            />
          </div>
        </div>
      </div>

      {/* Basic Properties */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Settings</h3>
        
        <div className="space-y-2">
          <Label>Title (fallback if no logo)</Label>
          <Input
            value={props.title || ''}
            onChange={(e) => updateProp('title', e.target.value)}
            placeholder="Navigation"
          />
        </div>

        {!isTopbar && (
          <>
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={props.variant || 'default'} onValueChange={(value) => updateProp('variant', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="mini">Mini</SelectItem>
                  <SelectItem value="floating">Floating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={props.position || 'left'} onValueChange={(value) => updateProp('position', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Toggle Button</Label>
              <Switch 
                checked={props.showTrigger !== false} 
                onCheckedChange={(checked) => updateProp('showTrigger', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Full Screen Height</Label>
              <Switch 
                checked={props.fullHeight !== false} 
                onCheckedChange={(checked) => updateProp('fullHeight', checked)}
              />
            </div>
          </>
        )}
      </div>

      {/* Topbar-specific settings */}
      {isTopbar && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Topbar Settings</h3>
          
          <div className="space-y-2">
            <Label>Position Type</Label>
            <Select value={props.positionType || 'static'} onValueChange={(value) => updateProp('positionType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static (scrolls with page)</SelectItem>
                <SelectItem value="sticky">Sticky (sticks at top)</SelectItem>
                <SelectItem value="fixed">Fixed (always at top)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Height</Label>
            <Input
              value={props.topbarHeight || '56px'}
              onChange={(e) => updateProp('topbarHeight', e.target.value)}
              placeholder="56px"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Padding X</Label>
              <Input
                value={props.paddingX || '16px'}
                onChange={(e) => updateProp('paddingX', e.target.value)}
                placeholder="16px"
              />
            </div>
            <div className="space-y-2">
              <Label>Padding Y</Label>
              <Input
                value={props.paddingY || '0px'}
                onChange={(e) => updateProp('paddingY', e.target.value)}
                placeholder="0px"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items Alignment</Label>
            <Select value={props.itemsAlign || 'center'} onValueChange={(value) => updateProp('itemsAlign', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="end">Right</SelectItem>
                <SelectItem value="between">Space Between</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Styling */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Styling</h3>
        
        {!isTopbar && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                value={props.width || '240px'}
                onChange={(e) => updateProp('width', e.target.value)}
                placeholder="240px"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Collapsed Width</Label>
              <Input
                value={props.collapsedWidth || '56px'}
                onChange={(e) => updateProp('collapsedWidth', e.target.value)}
                placeholder="56px"
              />
            </div>
          </div>
        )}

        <ColorPicker
          label="Background Color"
          value={props.backgroundColor || 'hsl(var(--card))'}
          onChange={(color) => updateProp('backgroundColor', color)}
        />

        <ColorPicker
          label="Text Color"
          value={props.textColor || 'hsl(var(--card-foreground))'}
          onChange={(color) => updateProp('textColor', color)}
        />

        <ColorPicker
          label="Active Item Color"
          value={props.activeColor || 'hsl(var(--primary))'}
          onChange={(color) => updateProp('activeColor', color)}
        />

        <ColorPicker
          label="Active Item Background"
          value={props.activeBackgroundColor || 'transparent'}
          onChange={(color) => updateProp('activeBackgroundColor', color)}
        />

        <ColorPicker
          label="Hover Background"
          value={props.hoverBackgroundColor || 'hsl(var(--accent))'}
          onChange={(color) => updateProp('hoverBackgroundColor', color)}
        />
      </div>

      {/* Pages Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Navigation Items</h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPage('page')}
              disabled={availablePages.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPage('external')}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Link
            </Button>
          </div>
        </div>

        {availablePages.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
            No pages available. Create pages in your app to add them to the navigation.
          </div>
        )}

        <div className="space-y-2">
          {configuredPages.map((pageConfig: any, index: number) => 
            renderNavItem(pageConfig, index)
          )}
        </div>

        {configuredPages.length === 0 && availablePages.length > 0 && (
          <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
            Click "Page" or "Link" to add navigation items
          </div>
        )}
      </div>
    </div>
  );
}
