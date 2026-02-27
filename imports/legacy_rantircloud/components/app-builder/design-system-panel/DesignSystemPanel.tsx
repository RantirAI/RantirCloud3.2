/**
 * Design System Panel
 * 
 * Centralized panel for managing all design system tokens:
 * - Typography (font families, sizes, weights, line heights)
 * - Spacing (8px grid system)
 * - Border Radius (scale)
 * - Shadows (elevation levels)
 * - Breakpoints (responsive)
 * - Interaction States (hover, active, focus, disabled)
 */

import React, { useEffect } from 'react';
import { X, Type, Maximize, Circle, Layers, Monitor, MousePointer, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';
import { SpacingTokenSection } from './sections/SpacingTokenSection';
import { BorderRadiusTokenSection } from './sections/BorderRadiusTokenSection';
import { ShadowTokenSection } from './sections/ShadowTokenSection';
import { TypographyTokenSection } from './sections/TypographyTokenSection';
import { BreakpointTokenSection } from './sections/BreakpointTokenSection';
import { InteractionStateSection } from './sections/InteractionStateSection';

interface DesignSystemPanelProps {
  projectId: string;
  onClose?: () => void;
}

const CATEGORIES = [
  { id: 'typography', label: 'Typography', icon: Type, description: 'Fonts, sizes, weights' },
  { id: 'spacing', label: 'Spacing', icon: Maximize, description: '8px grid system' },
  { id: 'borderRadius', label: 'Border Radius', icon: Circle, description: 'Corner rounding scale' },
  { id: 'shadows', label: 'Shadows', icon: Layers, description: 'Elevation & depth' },
  { id: 'breakpoints', label: 'Breakpoints', icon: Monitor, description: 'Responsive design' },
  { id: 'interactions', label: 'Interactions', icon: MousePointer, description: 'Hover, focus, active states' },
];

export function DesignSystemPanel({ projectId, onClose }: DesignSystemPanelProps) {
  const {
    config,
    isLoading,
    loadDesignSystem,
    resetToDefaults,
    activeCategory,
    setActiveCategory,
  } = useDesignSystemStore();

  useEffect(() => {
    if (projectId) {
      loadDesignSystem(projectId);
    }
  }, [projectId, loadDesignSystem]);

  const [openSections, setOpenSections] = React.useState<Set<string>>(
    new Set(['typography', 'spacing', 'borderRadius'])
  );

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="w-80 h-full bg-background border-l flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading design system...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="w-80 h-full bg-background border-l flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No design system configured</div>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-background border-l flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h2 className="font-semibold text-sm">Design System</h2>
          <p className="text-xs text-muted-foreground">Project-level variables</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="h-7 w-7 p-0"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Category Navigation */}
      <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
        {CATEGORIES.map(category => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <Button
              key={category.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'h-7 px-2 text-xs shrink-0',
                isActive && 'bg-primary text-primary-foreground'
              )}
              title={category.description}
            >
              <Icon className="h-3 w-3 mr-1" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {CATEGORIES.map(category => {
            const Icon = category.icon;
            const isOpen = openSections.has(category.id);
            
            // Only show sections that match active category or show all if none selected
            if (activeCategory !== 'all' && activeCategory !== category.id) {
              return null;
            }
            
            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => toggleSection(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-9 px-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{category.label}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="pt-2 pb-3">
                  <div className="pl-2">
                    {category.id === 'typography' && <TypographyTokenSection />}
                    {category.id === 'spacing' && <SpacingTokenSection />}
                    {category.id === 'borderRadius' && <BorderRadiusTokenSection />}
                    {category.id === 'shadows' && <ShadowTokenSection />}
                    {category.id === 'breakpoints' && <BreakpointTokenSection />}
                    {category.id === 'interactions' && <InteractionStateSection />}
                  </div>
                </CollapsibleContent>
                
                <Separator className="mt-1" />
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer with CSS Preview */}
      <div className="border-t p-3">
        <div className="text-xs text-muted-foreground">
          Changes auto-save and update linked elements in real-time
        </div>
      </div>
    </div>
  );
}
