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
import { Plus, X, GripVertical, ChevronDown, ChevronRight, Link2, Image, Type, Menu, LayoutTemplate, Paintbrush, Box, Smartphone, ALargeSmall, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypographyControl } from './TypographyControl';
import { useDesignTokenStore } from '@/stores/designTokenStore';

interface NavHorizontalPropertiesProps {
  component: AppComponent;
  onUpdate: (updates: Partial<AppComponent>) => void;
}

// Layout templates for horizontal nav
const LAYOUT_TEMPLATES = [
  { id: 'standard', label: 'Standard', description: 'Logo left, links center, CTA right' },
  { id: 'logo-center', label: 'Centered Logo', description: 'Links left, logo center, actions right' },
  { id: 'minimal', label: 'Minimal', description: 'Logo left, links right' },
  { id: 'split', label: 'Split', description: 'Logo + links left, actions right' },
];

// Helper to create nav child components
function createNavLink(label: string, href: string = '#'): AppComponent {
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

function createNavDropdown(label: string): AppComponent {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `dropdown-wrapper-${slug || 'menu'}-${Date.now().toString(36)}`,
    type: 'div',
    props: {
      _navRole: 'dropdown',
      _navLabel: label,
      _dropdownType: 'standard',
      _megaColumns: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: '4',
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
      alt: 'Navigation image',
      _navRole: 'secondary-image',
      width: '32px',
      height: '32px',
      objectFit: 'cover',
    },
    style: {},
    children: [],
  };
}

/**
 * Styles-only editor for the Styles tab.
 * Contains: Nav Container Styles, Link Styles, Hamburger Button Styles, Mobile Menu Styles.
 */
export function NavHorizontalProperties({ component, onUpdate }: NavHorizontalPropertiesProps) {
  const props = component.props || {};
  const { activeTokens } = useDesignTokenStore();

  // Resolve DS font defaults
  const dsBodyFont = activeTokens.get('font-body')?.value || '';

  const updateProp = useCallback((key: string, value: any) => {
    onUpdate({
      props: { ...props, [key]: value }
    });
  }, [onUpdate, props]);

  const resetTypography = useCallback(() => {
    const resets: Record<string, any> = {
      linkFontFamily: undefined,
      linkFontSize: undefined,
      linkFontWeight: undefined,
      linkLineHeight: undefined,
      linkLetterSpacing: undefined,
      linkColor: undefined,
      linkFontStyle: undefined,
      linkTextTransform: undefined,
    };
    onUpdate({ props: { ...props, ...resets } });
  }, [onUpdate, props]);

  const resetContainerStyles = useCallback(() => {
    const resets: Record<string, any> = {
      navBgColor: undefined,
      navBorderBottomEnabled: undefined,
      navBorderBottomColor: undefined,
      navBorderBottomWidth: undefined,
      navBoxShadow: undefined,
      navGlassmorphism: undefined,
      navHeight: undefined,
      navPadding: undefined,
    };
    onUpdate({ props: { ...props, ...resets } });
  }, [onUpdate, props]);

  const resetLinkStyles = useCallback(() => {
    const resets: Record<string, any> = {
      linkActiveStyle: undefined,
      linkActiveColor: undefined,
      linkActiveFontWeight: undefined,
      linkHoverStyle: undefined,
      linkHoverColor: undefined,
      linkTransitionDuration: undefined,
      linkTransitionEasing: undefined,
      linkTextTransform: undefined,
      linkGap: undefined,
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

          {/* Border Bottom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Border Bottom</Label>
              <Switch
                checked={props.navBorderBottomEnabled === true}
                onCheckedChange={(c) => updateProp('navBorderBottomEnabled', c)}
              />
            </div>
            {props.navBorderBottomEnabled && (
              <>
                <ColorPicker
                  label="Border Color"
                  value={props.navBorderBottomColor || '#e5e7eb'}
                  onChange={(c) => updateProp('navBorderBottomColor', c)}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Border Width: {props.navBorderBottomWidth || 1}px</Label>
                  <Slider
                    value={[props.navBorderBottomWidth || 1]}
                    onValueChange={([v]) => updateProp('navBorderBottomWidth', v)}
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

          {/* Glassmorphism */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Glassmorphism / Backdrop Blur</Label>
            <Switch
              checked={props.navGlassmorphism === true}
              onCheckedChange={(c) => updateProp('navGlassmorphism', c)}
            />
          </div>

          {/* Nav Height */}
          <div className="space-y-1">
            <Label className="text-xs">Nav Height (px)</Label>
            <Input
              type="number"
              value={props.navHeight || 64}
              onChange={(e) => updateProp('navHeight', parseInt(e.target.value) || 64)}
              className="h-7 text-xs"
              min={32} max={200}
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
                value={props.linkGap || 16}
                onChange={(e) => updateProp('linkGap', parseInt(e.target.value) || 16)}
                className="h-7 text-xs"
                min={0} max={64}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderHamburgerButtonStylesSection = () => (
    <Accordion type="single" collapsible defaultValue="hamburger-styles" className="w-full">
      <AccordionItem value="hamburger-styles" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <Menu className="h-4 w-4" />
            Hamburger Button Styles
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <ColorPicker
            label="Icon Color"
            value={props.hamburgerIconColor || 'currentColor'}
            onChange={(c) => updateProp('hamburgerIconColor', c)}
          />

          <div className="space-y-1">
            <Label className="text-xs">Icon Size: {props.hamburgerIconSize || 24}px</Label>
            <Slider
              value={[props.hamburgerIconSize || 24]}
              onValueChange={([v]) => updateProp('hamburgerIconSize', v)}
              min={16} max={40} step={2}
            />
          </div>

          <ColorPicker
            label="Button Hover Background"
            value={props.hamburgerHoverBg || 'transparent'}
            onChange={(c) => updateProp('hamburgerHoverBg', c)}
          />

          <div className="space-y-1">
            <Label className="text-xs">Animation Style</Label>
            <Select value={props.hamburgerAnimation || 'none'} onValueChange={(v) => updateProp('hamburgerAnimation', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="spin">Spin</SelectItem>
                <SelectItem value="morph">Morph</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const renderMobilePanelStylesSection = () => (
    <Accordion type="single" collapsible defaultValue="mobile-menu-styles" className="w-full">
      <AccordionItem value="mobile-menu-styles" className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2 flex-1">
            <Smartphone className="h-4 w-4" />
            Mobile Menu Styles
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <ColorPicker
            label="Background Color"
            value={props.mobileMenuBgColor || '#ffffff'}
            onChange={(c) => updateProp('mobileMenuBgColor', c)}
          />

          <div className="space-y-1">
            <Label className="text-xs">Animation</Label>
            <Select value={props.mobileMenuAnimation || 'slide-down'} onValueChange={(v) => updateProp('mobileMenuAnimation', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slide-down">Slide Down</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Padding (px)</Label>
            <Input
              type="number"
              value={props.mobileMenuPadding || 16}
              onChange={(e) => updateProp('mobileMenuPadding', parseInt(e.target.value) || 16)}
              className="h-7 text-xs"
              min={0} max={64}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Link Spacing (px)</Label>
            <Input
              type="number"
              value={props.mobileMenuLinkSpacing || 8}
              onChange={(e) => updateProp('mobileMenuLinkSpacing', parseInt(e.target.value) || 8)}
              className="h-7 text-xs"
              min={0} max={32}
            />
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
      {renderTypographySection()}
      {renderLinkStylesSection()}
      {renderHamburgerButtonStylesSection()}
      {renderMobilePanelStylesSection()}
    </div>
  );
}

/**
 * Items-only editor for the Data & Settings tab.
 * Shows navigation elements + Layout Template + Mobile Behavior.
 */
export function NavHorizontalItemsEditor({ component, onUpdate }: NavHorizontalPropertiesProps) {
  const { addComponent, deleteComponent, updateComponent, currentProject, currentPage, setGlobalHeader, removeGlobalHeader, togglePageGlobalHeaderExclusion } = useAppBuilderStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const props = component.props || {};
  const children = component.children || [];
  const customItems = children.filter(c => !c.props?._navRole);

  const handleAddLink = useCallback(() => {
    const link = createNavLink('New Link');
    addComponent(link, component.id);
  }, [addComponent, component.id]);

  const handleAddLogo = useCallback(() => {
    const logo = createNavLogo();
    addComponent(logo, component.id, 0);
  }, [addComponent, component.id]);

  const handleAddDropdown = useCallback(() => {
    const dropdown = createNavDropdown('Dropdown');
    addComponent(dropdown, component.id);
  }, [addComponent, component.id]);

  const handleAddSecondaryImage = useCallback(() => {
    const img = createNavImage();
    addComponent(img, component.id);
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
        case 'standard': {
          addComponent(createNavLogo(), component.id, 0);
          addComponent(createNavLink('Home', '/'), component.id);
          addComponent(createNavLink('About', '/about'), component.id);
          addComponent(createNavLink('Services', '/services'), component.id);
          addComponent(createNavLink('Contact', '/contact'), component.id);
          break;
        }
        case 'logo-center': {
          addComponent(createNavLink('Home', '/'), component.id, 0);
          addComponent(createNavLink('About', '/about'), component.id);
          addComponent(createNavLogo(), component.id);
          addComponent(createNavLink('Services', '/services'), component.id);
          addComponent(createNavLink('Contact', '/contact'), component.id);
          break;
        }
        case 'minimal': {
          addComponent(createNavLogo(), component.id, 0);
          addComponent(createNavLink('Home', '/'), component.id);
          addComponent(createNavLink('About', '/about'), component.id);
          addComponent(createNavLink('Contact', '/contact'), component.id);
          break;
        }
        case 'split': {
          addComponent(createNavLogo(), component.id, 0);
          addComponent(createNavLink('Features', '/features'), component.id);
          addComponent(createNavLink('Pricing', '/pricing'), component.id);
          addComponent(createNavLink('Get Started', '/signup'), component.id);
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
                {role === 'logo' ? 'Logo' : role === 'link' ? 'Link' : role === 'dropdown' ? 'Dropdown' : role === 'secondary-image' ? 'Image' : 'Custom'}
              </Badge>
              <span className="text-xs truncate">
                {role === 'logo' ? 'Logo' : role === 'link' ? (child.props?.content || child.props?.text || 'Link') : role === 'dropdown' ? (child.props?._navLabel || 'Dropdown') : role === 'secondary-image' ? 'Image' : child.type}
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
            </>
          )}

          {role === 'logo' && (
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
                <Label className="text-xs">Dropdown Label</Label>
                <Input
                  value={child.props?._navLabel || ''}
                  onChange={(e) => handleUpdateChildProp(child.id, '_navLabel', e.target.value)}
                  placeholder="Menu label"
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
                  const subItem = createNavLink('New Sub Item');
                  addComponent(subItem, child.id);
                }}
                className="w-full h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Sub-item
              </Button>
            </>
          )}
        </CardContent>

        {/* Dropdown children - always visible for dropdowns */}
        {hasChildren && isExpanded && role === 'dropdown' && (
          <div className="px-3 pb-2 space-y-1.5 ml-3 border-l-2 border-primary/20">
            {freshChildChildren.map(subChild => (
              <div key={subChild.id} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5">
                <span className="text-xs flex-1 truncate">{subChild.props?.text || 'Sub item'}</span>
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
      setGlobalHeader(component.id, currentPage, 'nav-horizontal');
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

        {/* Add buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" onClick={handleAddLogo} className="h-8 text-xs">
            <Image className="h-3.5 w-3.5 mr-1" />
            Logo
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddLink} className="h-8 text-xs">
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddDropdown} className="h-8 text-xs">
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Dropdown
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddSecondaryImage} className="h-8 text-xs">
            <Image className="h-3.5 w-3.5 mr-1" />
            Image
          </Button>
        </div>

        {/* Items list */}
        <div className="space-y-1.5">
          {children.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center">
              Add navigation elements above or drag components onto the nav bar
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

      {/* Mobile Behavior -- moved from Styles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Menu className="h-4 w-4" />
          Mobile Behavior
        </h3>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Enable Hamburger Menu</Label>
          <Switch
            checked={props.hamburgerMenu !== false}
            onCheckedChange={(checked) => updateProp('hamburgerMenu', checked)}
          />
        </div>

        {props.hamburgerMenu !== false && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Collapse At</Label>
              <Select
                value={props._hamburgerBreakpoint || 'mobile'}
                onValueChange={(value) => {
                  updateProp('_hamburgerBreakpoint', value);
                  updateProp('mobileBreakpoint', value === 'tablet' ? 1024 : 768);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile (768px)</SelectItem>
                  <SelectItem value="tablet">Tablet (1024px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Custom Breakpoint (px)</Label>
              <Input
                type="number"
                value={props.mobileBreakpoint || 768}
                onChange={(e) => updateProp('mobileBreakpoint', parseInt(e.target.value) || 768)}
                className="h-7 text-xs"
                min={320}
                max={1600}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs">Sticky Navigation</Label>
          <Switch
            checked={props.sticky === true}
            onCheckedChange={(checked) => updateProp('sticky', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Shrink on Scroll</Label>
          <Switch
            checked={props.scrollShrink === true}
            onCheckedChange={(checked) => updateProp('scrollShrink', checked)}
          />
        </div>

        {props.scrollShrink && (
          <div className="space-y-1 ml-2 border-l-2 border-primary/20 pl-3">
            <Label className="text-xs">Scrolled Logo Size (px)</Label>
            <Input
              type="number"
              value={props.scrollShrinkLogoSize || Math.round((parseInt(props.logoSize) || 80) * 0.6)}
              onChange={(e) => updateProp('scrollShrinkLogoSize', parseInt(e.target.value) || 48)}
              className="h-7 text-xs"
              min={16} max={200}
            />
          </div>
        )}
      </div>
    </div>
  );
}
