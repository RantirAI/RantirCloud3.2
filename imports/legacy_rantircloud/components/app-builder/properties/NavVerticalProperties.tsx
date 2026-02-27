import React, { useState, useCallback } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AppComponent } from '@/types/appBuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { ColorPicker } from '@/components/ColorPicker';
import { Plus, X, GripVertical, ChevronDown, ChevronRight, Link2, Image, LayoutTemplate, Menu, Paintbrush, AlignLeft, AlignCenter, AlignRight, Box, ALargeSmall, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconPicker } from './IconPicker';
import { TypographyControl } from './TypographyControl';
import { useDesignTokenStore } from '@/stores/designTokenStore';

interface NavVerticalPropertiesProps {
  component: AppComponent;
  onUpdate: (updates: Partial<AppComponent>) => void;
}

// Layout templates for vertical nav
const LAYOUT_TEMPLATES = [
  { id: 'sidebar-standard', label: 'Standard Sidebar', description: 'Logo top, links below, user bottom' },
  { id: 'sidebar-compact', label: 'Compact', description: 'Tight spacing, small icons' },
  { id: 'sidebar-grouped', label: 'Grouped', description: 'Links organized in labeled groups' },
  { id: 'sidebar-icon-rail', label: 'Icon Rail', description: 'Icons only, thin sidebar' },
];

// Helpers to create nav child components
function createNavLink(label: string, href: string = '#', icon?: string): AppComponent {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `nav-item-${slug || 'link'}-${Date.now().toString(36)}`,
    type: 'link',
    props: {
      content: label,
      text: label,
      href: href,
      cursor: 'pointer',
      _navRole: 'link',
      _navHref: href,
      _navIcon: icon || '',
      underline: 'none',
    },
    style: {},
    children: [],
  };
}

function createNavLogo(src: string = ''): AppComponent {
  return {
    id: `logo-block-${Date.now().toString(36)}`,
    type: 'image',
    props: {
      src: src || 'https://placehold.co/80x80/e2e8f0/64748b?text=Logo',
      alt: 'Logo',
      _navRole: 'logo',
      width: '80px',
      height: '80px',
      objectFit: 'contain',
    },
    style: {},
    children: [],
  };
}

function createNavSecondaryLogo(src: string = ''): AppComponent {
  return {
    id: `logo-block-secondary-${Date.now().toString(36)}`,
    type: 'image',
    props: {
      src,
      alt: 'Secondary Logo',
      _navRole: 'secondary-logo',
      width: '80px',
      height: '24px',
      objectFit: 'contain',
    },
    style: {},
    children: [],
  };
}

function createNavDropdown(label: string): AppComponent {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `dropdown-wrapper-${slug || 'group'}-${Date.now().toString(36)}`,
    type: 'div',
    props: {
      _navRole: 'dropdown',
      _navLabel: label,
      _dropdownType: 'standard',
      _megaColumns: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: '2',
    },
    style: {},
    children: [
      createNavLink('Sub Item 1'),
      createNavLink('Sub Item 2'),
    ],
  };
}

function createNavImage(src: string = ''): AppComponent {
  return {
    id: `icon-block-${Date.now().toString(36)}`,
    type: 'image',
    props: {
      src,
      alt: 'Sidebar image',
      _navRole: 'secondary-image',
      width: '100%',
      height: '48px',
      objectFit: 'cover',
    },
    style: {},
    children: [],
  };
}

/**
 * Styles-only editor for the Styles tab.
 * Contains: Nav Container Styles, Panel Appearance, Link Styles.
 */
export function NavVerticalProperties({ component, onUpdate }: NavVerticalPropertiesProps) {
  const props = component.props || {};
  const { activeTokens } = useDesignTokenStore();
  const dsBodyFont = activeTokens.get('font-body')?.value || '';

  const updateProp = useCallback((key: string, value: any) => {
    onUpdate({
      props: { ...props, [key]: value }
    });
  }, [onUpdate, props]);

  const resetTypography = useCallback(() => {
    const resets: Record<string, any> = {
      linkFontFamily: undefined, linkFontSize: undefined, linkFontWeight: undefined,
      linkLineHeight: undefined, linkLetterSpacing: undefined, linkColor: undefined,
      linkFontStyle: undefined, linkTextTransform: undefined,
    };
    onUpdate({ props: { ...props, ...resets } });
  }, [onUpdate, props]);

  const resetContainerStyles = useCallback(() => {
    const resets: Record<string, any> = {
      navBgColor: undefined, navBorderRightEnabled: undefined, navBorderRightColor: undefined,
      navBorderRightWidth: undefined, navBoxShadow: undefined, navPadding: undefined,
    };
    onUpdate({ props: { ...props, ...resets } });
  }, [onUpdate, props]);

  const resetLinkStyles = useCallback(() => {
    const resets: Record<string, any> = {
      linkActiveStyle: undefined, linkActiveColor: undefined, linkActiveFontWeight: undefined,
      linkHoverStyle: undefined, linkHoverColor: undefined, linkTransitionDuration: undefined,
      linkTransitionEasing: undefined, linkTextTransform: undefined, linkGap: undefined,
    };
    onUpdate({ props: { ...props, ...resets } });
  }, [onUpdate, props]);

  const renderNavContainerStylesSection = () => (
    <Accordion type="single" collapsible defaultValue="container-styles" className="w-full">
      <AccordionItem value="container-styles" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <Box className="h-4 w-4" />
            Nav Container Styles
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={resetContainerStyles}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
          <ColorPicker
            label="Background Color"
            value={props.navBgColor || '#ffffff'}
            onChange={(c) => updateProp('navBgColor', c)}
          />

          {/* Border Right */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Border Right</Label>
              <Switch
                checked={props.navBorderRightEnabled === true}
                onCheckedChange={(c) => updateProp('navBorderRightEnabled', c)}
              />
            </div>
            {props.navBorderRightEnabled && (
              <>
                <ColorPicker
                  label="Border Color"
                  value={props.navBorderRightColor || '#e5e7eb'}
                  onChange={(c) => updateProp('navBorderRightColor', c)}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Border Width: {props.navBorderRightWidth || 1}px</Label>
                  <Slider
                    value={[props.navBorderRightWidth || 1]}
                    onValueChange={([v]) => updateProp('navBorderRightWidth', v)}
                    min={1} max={4} step={1}
                  />
                </div>
              </>
            )}
          </div>

          {/* Box Shadow */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Box Shadow</Label>
            <Switch
              checked={props.navBoxShadow === true}
              onCheckedChange={(c) => updateProp('navBoxShadow', c)}
            />
          </div>

          {/* Nav Padding */}
          <div className="space-y-1">
            <Label className="text-xs">Nav Padding (px)</Label>
            <Input
              type="number"
              value={props.navPadding || 16}
              onChange={(e) => updateProp('navPadding', parseInt(e.target.value) || 16)}
              className="h-7 text-xs"
              min={0} max={64}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderPanelAppearanceSection = () => (
    <Accordion type="single" collapsible defaultValue="panel-appearance" className="w-full">
      <AccordionItem value="panel-appearance" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <LayoutTemplate className="h-4 w-4" />
            Panel Appearance
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <ColorPicker
            label="Panel Background"
            value={props.panelBgColor || '#ffffff'}
            onChange={(c) => updateProp('panelBgColor', c)}
          />

          <div className="space-y-1">
            <Label className="text-xs">Panel Width: {props.panelWidth || 280}px</Label>
            <Slider
              value={[props.panelWidth || 280]}
              onValueChange={([v]) => updateProp('panelWidth', v)}
              min={200} max={400} step={10}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Overlay</Label>
              <Switch
                checked={props.panelOverlay !== false}
                onCheckedChange={(c) => updateProp('panelOverlay', c)}
              />
            </div>
            {props.panelOverlay !== false && (
              <>
                <ColorPicker
                  label="Overlay Color"
                  value={props.panelOverlayColor || '#000000'}
                  onChange={(c) => updateProp('panelOverlayColor', c)}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Overlay Opacity: {Math.round((props.panelOverlayOpacity ?? 0.4) * 100)}%</Label>
                  <Slider
                    value={[Math.round((props.panelOverlayOpacity ?? 0.4) * 100)]}
                    onValueChange={([v]) => updateProp('panelOverlayOpacity', v / 100)}
                    min={0} max={100} step={5}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Open Animation</Label>
              <Select value={props.panelAnimation || 'slide'} onValueChange={(v) => updateProp('panelAnimation', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {props.panelAnimation !== 'none' && (
              <div className="space-y-1">
                <Label className="text-xs">Duration: {props.panelAnimationDuration || 300}ms</Label>
                <Slider
                  value={[props.panelAnimationDuration || 300]}
                  onValueChange={([v]) => updateProp('panelAnimationDuration', v)}
                  min={200} max={500} step={50}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Panel Border</Label>
              <Switch
                checked={props.panelBorderEnabled === true}
                onCheckedChange={(c) => updateProp('panelBorderEnabled', c)}
              />
            </div>
            {props.panelBorderEnabled && (
              <ColorPicker
                label="Border Color"
                value={props.panelBorderColor || '#e5e7eb'}
                onChange={(c) => updateProp('panelBorderColor', c)}
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Panel Shadow</Label>
            <Switch
              checked={props.panelShadow !== false}
              onCheckedChange={(c) => updateProp('panelShadow', c)}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderLinkStylesSection = () => (
    <Accordion type="single" collapsible defaultValue="link-styles" className="w-full">
      <AccordionItem value="link-styles" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <Paintbrush className="h-4 w-4" />
            Link Styles
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={resetLinkStyles}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
          {/* Active State */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active State</Label>
            <div className="space-y-1">
              <Label className="text-xs">Active Style</Label>
              <Select value={props.linkActiveStyle || 'none'} onValueChange={(v) => updateProp('linkActiveStyle', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                  <SelectItem value="dot">Dot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ColorPicker label="Active Color" value={props.linkActiveColor || '#3B82F6'} onChange={(c) => updateProp('linkActiveColor', c)} />
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bold Active Link</Label>
              <Switch checked={props.linkActiveFontWeight === 'bold'} onCheckedChange={(c) => updateProp('linkActiveFontWeight', c ? 'bold' : 'normal')} />
            </div>
          </div>

          {/* Hover Effects */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hover Effects</Label>
            <div className="space-y-1">
              <Label className="text-xs">Hover Style</Label>
              <Select value={props.linkHoverStyle || 'none'} onValueChange={(v) => updateProp('linkHoverStyle', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="underline-slide">Underline Slide</SelectItem>
                  <SelectItem value="background-fade">Background Fade</SelectItem>
                  <SelectItem value="color-shift">Color Shift</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ColorPicker label="Hover Color" value={props.linkHoverColor || '#3B82F6'} onChange={(c) => updateProp('linkHoverColor', c)} />
          </div>

          {/* Animation */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Animation</Label>
            <div className="space-y-1">
              <Label className="text-xs">Duration: {props.linkTransitionDuration || 200}ms</Label>
              <Slider
                value={[props.linkTransitionDuration || 200]}
                onValueChange={([v]) => updateProp('linkTransitionDuration', v)}
                min={100} max={500} step={50}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Easing</Label>
              <Select value={props.linkTransitionEasing || 'ease'} onValueChange={(v) => updateProp('linkTransitionEasing', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ease">Ease</SelectItem>
                  <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="cubic-bezier(0.34,1.56,0.64,1)">Spring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</Label>
            <div className="space-y-1">
              <Label className="text-xs">Text Transform</Label>
              <Select value={props.linkTextTransform || 'none'} onValueChange={(v) => updateProp('linkTextTransform', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="uppercase">Uppercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link Gap (px)</Label>
              <Input
                type="number"
                value={props.linkGap || 8}
                onChange={(e) => updateProp('linkGap', parseInt(e.target.value) || 8)}
                className="h-7 text-xs"
                min={0} max={64}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderTypographySection = () => (
    <Accordion type="single" collapsible defaultValue="link-typography" className="w-full">
      <AccordionItem value="link-typography" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <ALargeSmall className="h-4 w-4" />
            Link Typography
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <div className="flex justify-end mb-2">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={resetTypography}>
              <RotateCcw className="h-3 w-3" /> Reset to DS
            </Button>
          </div>
          {!props.linkFontFamily && dsBodyFont && (
            <div className="text-[10px] text-muted-foreground mb-2 px-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
              Using Design System font: {dsBodyFont}
            </div>
          )}
          <TypographyControl
            label=""
            value={{
              fontFamily: props.linkFontFamily || dsBodyFont || 'inherit',
              fontSize: props.linkFontSize || '14',
              fontWeight: props.linkFontWeight || '500',
              lineHeight: props.linkLineHeight || '1.5',
              letterSpacing: props.linkLetterSpacing || '0',
              textAlign: 'left',
              color: props.linkColor || '#000000',
              fontStyle: props.linkFontStyle || 'normal',
              textDecoration: 'none',
              textTransform: props.linkTextTransform || 'none',
            }}
            onChange={(t: any) => {
              const updates: Record<string, any> = {};
              if (t.fontFamily !== undefined) updates.linkFontFamily = t.fontFamily;
              if (t.fontSize !== undefined) updates.linkFontSize = t.fontSize;
              if (t.fontWeight !== undefined) updates.linkFontWeight = t.fontWeight;
              if (t.lineHeight !== undefined) updates.linkLineHeight = t.lineHeight;
              if (t.letterSpacing !== undefined) updates.linkLetterSpacing = t.letterSpacing;
              if (t.color !== undefined) updates.linkColor = t.color;
              if (t.fontStyle !== undefined) updates.linkFontStyle = t.fontStyle;
              if (t.textTransform !== undefined) updates.linkTextTransform = t.textTransform;
              onUpdate({ props: { ...props, ...updates } });
            }}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div className="space-y-5 p-4">
      {renderNavContainerStylesSection()}
      {renderPanelAppearanceSection()}
      {renderTypographySection()}
      {renderLinkStylesSection()}
    </div>
  );
}

/**
 * Items-only editor for the Data & Settings tab.
 * Shows navigation elements + Layout Template + Behavior settings.
 */
export function NavVerticalItemsEditor({ component, onUpdate }: NavVerticalPropertiesProps) {
  const { addComponent, deleteComponent, updateComponent, currentProject, currentPage, setGlobalHeader, removeGlobalHeader, togglePageGlobalHeaderExclusion } = useAppBuilderStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const props = component.props || {};
  const children = component.children || [];
  const customItems = children.filter(c => !c.props?._navRole);

  const handleAddLink = useCallback(() => {
    addComponent(createNavLink('New Link'), component.id);
  }, [addComponent, component.id]);

  const handleAddLogo = useCallback(() => {
    addComponent(createNavLogo(), component.id, 0);
  }, [addComponent, component.id]);

  const handleAddSecondaryLogo = useCallback(() => {
    addComponent(createNavSecondaryLogo(), component.id);
  }, [addComponent, component.id]);

  const handleAddDropdown = useCallback(() => {
    addComponent(createNavDropdown('Section'), component.id);
  }, [addComponent, component.id]);

  const handleAddImage = useCallback(() => {
    addComponent(createNavImage(), component.id);
  }, [addComponent, component.id]);

  const handleRemoveItem = useCallback((itemId: string) => {
    deleteComponent(itemId);
  }, [deleteComponent]);

  const handleUpdateChildProp = useCallback((childId: string, key: string, value: any) => {
    const freshState = useAppBuilderStore.getState();
    const findFresh = (comps: AppComponent[]): AppComponent | null => {
      for (const c of comps) {
        if (c.id === childId) return c;
        if (c.children) { const f = findFresh(c.children); if (f) return f; }
      }
      return null;
    };
    const currentPage = freshState.currentPage;
    const pageData = freshState.currentProject?.pages.find(p => p.id === currentPage);
    const freshChild = pageData ? findFresh(pageData.components) : null;
    if (!freshChild) return;
    updateComponent(childId, {
      props: { ...freshChild.props, [key]: value }
    });
  }, [updateComponent]);

  const updateProp = useCallback((key: string, value: any) => {
    onUpdate({
      props: { ...props, [key]: value }
    });
  }, [onUpdate, props]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyTemplate = useCallback((templateId: string) => {
    const allChildren = component.children || [];
    allChildren.forEach(item => deleteComponent(item.id));

    setTimeout(() => {
      switch (templateId) {
        case 'sidebar-standard': {
          addComponent(createNavLogo(), component.id, 0);
          addComponent(createNavLink('Dashboard', '/', 'Home'), component.id);
          addComponent(createNavLink('Projects', '/projects', 'Folder'), component.id);
          addComponent(createNavLink('Analytics', '/analytics', 'BarChart'), component.id);
          addComponent(createNavLink('Settings', '/settings', 'Settings'), component.id);
          break;
        }
        case 'sidebar-compact': {
          addComponent(createNavLink('Home', '/', 'Home'), component.id, 0);
          addComponent(createNavLink('Search', '/search', 'Search'), component.id);
          addComponent(createNavLink('Files', '/files', 'File'), component.id);
          addComponent(createNavLink('Settings', '/settings', 'Settings'), component.id);
          break;
        }
        case 'sidebar-grouped': {
          addComponent(createNavLogo(), component.id, 0);
          addComponent(createNavDropdown('Workspace'), component.id);
          addComponent(createNavDropdown('Tools'), component.id);
          break;
        }
        case 'sidebar-icon-rail': {
          addComponent(createNavLink('', '/', 'Home'), component.id, 0);
          addComponent(createNavLink('', '/search', 'Search'), component.id);
          addComponent(createNavLink('', '/inbox', 'Inbox'), component.id);
          addComponent(createNavLink('', '/settings', 'Settings'), component.id);
          updateProp('iconOnly', true);
          break;
        }
      }
      updateProp('_layoutTemplate', templateId);
    }, 100);
  }, [addComponent, deleteComponent, component.id, updateProp]);

  // Helper to read fresh component children from the store (avoids stale prop data for grandchildren)
  const getFreshChildren = useCallback((childId: string): AppComponent[] => {
    const freshState = useAppBuilderStore.getState();
    const findFresh = (comps: AppComponent[]): AppComponent | null => {
      for (const c of comps) {
        if (c.id === childId) return c;
        if (c.children) { const f = findFresh(c.children); if (f) return f; }
      }
      return null;
    };
    const currentPageId = freshState.currentPage;
    const pageData = freshState.currentProject?.pages.find(p => p.id === currentPageId);
    const freshChild = pageData ? findFresh(pageData.components) : null;
    return freshChild?.children || [];
  }, []);

  const renderNavItem = (child: AppComponent) => {
    const rawRole = child.props?._navRole;
    // Auto-detect dropdown-menu components as dropdown role
    const role = rawRole || (child.type === 'dropdown-menu' ? 'dropdown' : undefined);
    // Read fresh children from store to avoid stale grandchild data
    const freshChildChildren = role === 'dropdown' ? getFreshChildren(child.id) : (child.children || []);
    const hasChildren = freshChildChildren.length > 0;
    // Auto-expand dropdowns so sub-items are always visible
    const isExpanded = role === 'dropdown' ? true : expandedItems.has(child.id);

    return (
      <Card key={child.id} className="transition-all duration-200 border-border/60">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab flex-shrink-0" />
              {hasChildren && (
                <button onClick={() => toggleExpanded(child.id)} className="p-0.5 flex-shrink-0">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                {role === 'logo' ? 'Logo' : role === 'secondary-logo' ? 'Logo 2' : role === 'link' ? 'Link' : role === 'dropdown' ? 'Group' : role === 'secondary-image' ? 'Image' : 'Custom'}
              </Badge>
              <span className="text-xs truncate">
                {role === 'logo' || role === 'secondary-logo' ? 'Logo' : role === 'link' ? (child.props?.content || child.props?.text || 'Link') : role === 'dropdown' ? (child.props?._navLabel || 'Group') : child.type}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(child.id)}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="py-2 px-3 space-y-2">
          {role === 'link' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={child.props?.content || child.props?.text || ''}
                  onChange={(e) => {
                    handleUpdateChildProp(child.id, 'content', e.target.value);
                    handleUpdateChildProp(child.id, 'text', e.target.value);
                  }}
                  placeholder="Link text"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input
                  value={child.props?._navHref || '#'}
                  onChange={(e) => handleUpdateChildProp(child.id, '_navHref', e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon</Label>
                <IconPicker
                  value={child.props?._navIcon || ''}
                  variant={child.props?._navIconVariant || 'Bold'}
                  onChange={(iconName, variant) => {
                    handleUpdateChildProp(child.id, '_navIcon', iconName);
                    handleUpdateChildProp(child.id, '_navIconVariant', variant);
                  }}
                />
              </div>
            </>
          )}

          {(role === 'logo' || role === 'secondary-logo') && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Logo URL</Label>
                <Input
                  value={child.props?.src || ''}
                  onChange={(e) => handleUpdateChildProp(child.id, 'src', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="h-7 text-xs"
                />
              </div>
              {role === 'logo' && (
                <div className="space-y-1">
                  <Label className="text-xs">Logo Size (px)</Label>
                  <Input
                    type="number"
                    value={parseInt(props.logoSize) || 80}
                    onChange={(e) => updateProp('logoSize', parseInt(e.target.value) || 80)}
                    className="h-7 text-xs"
                    min={16} max={200}
                  />
                </div>
              )}
              {child.props?.src && (
                <div className="p-1.5 border rounded bg-muted/30">
                  <img
                    src={child.props.src}
                    alt="Logo preview"
                    className="h-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </>
          )}

          {role === 'secondary-image' && (
            <div className="space-y-1">
              <Label className="text-xs">Image URL</Label>
              <Input
                value={child.props?.src || ''}
                onChange={(e) => handleUpdateChildProp(child.id, 'src', e.target.value)}
                placeholder="https://example.com/image.png"
                className="h-7 text-xs"
              />
            </div>
          )}

          {role === 'dropdown' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Group Label</Label>
                <Input
                  value={child.props?._navLabel || ''}
                  onChange={(e) => handleUpdateChildProp(child.id, '_navLabel', e.target.value)}
                  placeholder="Group name"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dropdown Type</Label>
                <Select
                  value={child.props?._dropdownType || 'standard'}
                  onValueChange={(v) => handleUpdateChildProp(child.id, '_dropdownType', v)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Small Dropdown</SelectItem>
                    <SelectItem value="mega">Mega Menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {child.props?._dropdownType === 'mega' && (
                <div className="space-y-1">
                  <Label className="text-xs">Columns</Label>
                  <Input
                    type="number"
                    value={child.props?._megaColumns || 3}
                    onChange={(e) => handleUpdateChildProp(child.id, '_megaColumns', Math.max(2, Math.min(4, parseInt(e.target.value) || 3)))}
                    className="h-7 text-xs"
                    min={2} max={4}
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addComponent(createNavLink('New Item'), child.id);
                }}
                className="w-full h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </>
          )}
        </CardContent>

        {/* Dropdown children - always visible for dropdowns */}
        {hasChildren && isExpanded && role === 'dropdown' && (
          <div className="px-3 pb-2 space-y-1.5 ml-3 border-l-2 border-primary/20">
            {freshChildChildren.map(subChild => (
              <div key={subChild.id} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5">
                <Input
                  value={subChild.props?.text || ''}
                  onChange={(e) => {
                    handleUpdateChildProp(subChild.id, 'text', e.target.value);
                    handleUpdateChildProp(subChild.id, 'content', e.target.value);
                  }}
                  className="h-6 text-xs flex-1"
                  placeholder="Label"
                />
                <Input
                  value={subChild.props?._navHref || '#'}
                  onChange={(e) => handleUpdateChildProp(subChild.id, '_navHref', e.target.value)}
                  className="h-6 text-xs flex-1"
                  placeholder="URL"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(subChild.id)}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const isGlobalHeader = props._isGlobalHeader === true;
  const otherPages = currentProject?.pages.filter(p => p.id !== currentPage) || [];

  const handleToggleGlobalHeader = useCallback((enabled: boolean) => {
    if (enabled && currentPage) {
      setGlobalHeader(component.id, currentPage, 'nav-vertical');
    } else {
      removeGlobalHeader(component.id);
    }
  }, [component.id, currentPage, setGlobalHeader, removeGlobalHeader]);

  return (
    <div className="space-y-3">
      {/* Global Header */}
      <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Global Header</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Show this menu on all pages</p>
          </div>
          <Switch
            checked={isGlobalHeader}
            onCheckedChange={handleToggleGlobalHeader}
          />
        </div>

        {isGlobalHeader && otherPages.length > 0 && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground">Exclude from pages:</Label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {otherPages.map(page => {
                const isExcluded = page.settings?.excludedGlobalHeaders?.includes(component.id) || false;
                return (
                  <label key={page.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                    <Checkbox
                      checked={isExcluded}
                      onCheckedChange={() => togglePageGlobalHeaderExclusion(page.id, component.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs">{page.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{page.route}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Elements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Navigation Elements</h3>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" onClick={handleAddLogo} className="h-8 text-xs">
            <Image className="h-3.5 w-3.5 mr-1" />
            Logo
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddSecondaryLogo} className="h-8 text-xs">
            <Image className="h-3.5 w-3.5 mr-1" />
            2nd Logo
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddLink} className="h-8 text-xs">
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddDropdown} className="h-8 text-xs">
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Group
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddImage} className="h-8 text-xs col-span-2">
            <Image className="h-3.5 w-3.5 mr-1" />
            Secondary Image
          </Button>
        </div>

        <div className="space-y-1.5">
          {children.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center">
              Add navigation elements above or drag components into the sidebar
            </div>
          ) : (
            children.map(child => renderNavItem(child))
          )}
        </div>

        {customItems.length > 0 && (
          <div className="text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1">
            {customItems.length} custom element{customItems.length > 1 ? 's' : ''} (drag-dropped)
          </div>
        )}
      </div>

      {/* Layout Template -- moved from Styles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Layout Template
        </h3>
        <Select
          value={props._layoutTemplate || ''}
          onValueChange={handleApplyTemplate}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Choose a template..." />
          </SelectTrigger>
          <SelectContent>
            {LAYOUT_TEMPLATES.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div>
                  <span className="text-xs font-medium">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{t.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Behavior -- moved from Styles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Menu className="h-4 w-4" />
          Behavior
        </h3>

        <div className="space-y-1">
          <Label className="text-xs">Menu Icon</Label>
          <IconPicker
            value={props.menuIcon || ''}
            variant={props.menuIconVariant || 'Linear'}
            onChange={(iconName, variant) => {
              updateProp('menuIcon', iconName);
              updateProp('menuIconVariant', variant);
            }}
          />
          <p className="text-[10px] text-muted-foreground">Leave empty for default hamburger icon</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Icon Size (px)</Label>
            <Input
              type="number"
              value={props.menuIconSize || 24}
              onChange={(e) => updateProp('menuIconSize', parseInt(e.target.value) || 24)}
              className="h-7 text-xs"
              min={16} max={48}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Icon Color</Label>
            <ColorPicker
              label=""
              value={props.menuIconColor || 'currentColor'}
              onChange={(c) => updateProp('menuIconColor', c)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Collapsible</Label>
          <Switch
            checked={props.collapsible !== false}
            onCheckedChange={(checked) => updateProp('collapsible', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Start Collapsed</Label>
          <Switch
            checked={props.defaultCollapsed === true}
            onCheckedChange={(checked) => updateProp('defaultCollapsed', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Icon Only Mode</Label>
          <Switch
            checked={props.iconOnly === true}
            onCheckedChange={(checked) => updateProp('iconOnly', checked)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Menu Position</Label>
          <div className="flex gap-1">
            {[
              { value: 'left', icon: AlignLeft, label: 'Left' },
              { value: 'center', icon: AlignCenter, label: 'Center' },
              { value: 'right', icon: AlignRight, label: 'Right' },
            ].map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={props.menuPosition === value || (!props.menuPosition && value === 'left') ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateProp('menuPosition', value)}
                className="flex-1 h-8 text-xs gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Mobile Breakpoint (px)</Label>
          <Input
            type="number"
            value={props.mobileBreakpoint || 768}
            onChange={(e) => updateProp('mobileBreakpoint', parseInt(e.target.value) || 768)}
            className="h-7 text-xs"
            min={320}
            max={1200}
          />
        </div>
      </div>
    </div>
  );
}
