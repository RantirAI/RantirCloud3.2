import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { 
  PanelLeft, 
  PanelTop, 
  Sparkles, 
  CreditCard, 
  DollarSign, 
  Footprints,
  ChevronDown,
  Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { prebuiltComponents, PrebuiltComponent, getPrebuiltComponentsByCategory } from '@/lib/prebuiltComponents';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PanelLeft,
  PanelTop,
  Sparkles,
  CreditCard,
  DollarSign,
  Footprints,
};

const categoryLabels: Record<string, string> = {
  navigation: 'Navigation',
  layout: 'Layout',
  marketing: 'Marketing',
  forms: 'Forms',
  cards: 'Cards & Content',
};

interface DraggablePrebuiltComponentProps {
  component: PrebuiltComponent;
  isHovered: boolean;
  onHover: (isHovered: boolean) => void;
}

function DraggablePrebuiltComponent({ component, isHovered, onHover }: DraggablePrebuiltComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `prebuilt-${component.id}`,
    data: {
      type: 'prebuilt-component',
      data: {
        prebuiltId: component.id,
        component: component.createComponent(),
      },
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const Icon = iconMap[component.preview] || CreditCard;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/30 cursor-grab active:cursor-grabbing transition-all overflow-hidden"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="text-sm font-medium text-foreground truncate">{component.name}</h4>
        <p className="text-xs text-muted-foreground truncate">{component.description}</p>
      </div>
    </div>
  );
}

interface PrebuiltComponentPaletteProps {
  searchFilter?: string;
}

export function PrebuiltComponentPalette({ searchFilter = '' }: PrebuiltComponentPaletteProps) {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    navigation: true,
    layout: true,
    marketing: true,
    forms: true,
    cards: true,
  });

  const componentsByCategory = getPrebuiltComponentsByCategory();

  const filteredCategories = Object.entries(componentsByCategory)
    .map(([category, components]) => ({
      category,
      components: components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    }))
    .filter(({ components }) => components.length > 0);

  const toggleSection = (category: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0" scrollbarVariant="hover-show">
        <div className="p-0 space-y-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Info className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No components found</p>
            </div>
          ) : (
            filteredCategories.map(({ category, components }) => (
              <Collapsible
                key={category}
                open={openSections[category]}
                onOpenChange={() => toggleSection(category)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-muted/50 cursor-pointer border-b border-border/50">
                    <div className="flex items-center gap-2">
                      {openSections[category] ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                      )}
                      <span className="font-medium text-xs text-foreground">
                        {categoryLabels[category] || category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({components.length})
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 mt-2 mb-4 px-3">
                    {components.map((component) => (
                      <DraggablePrebuiltComponent
                        key={component.id}
                        component={component}
                        isHovered={hoveredComponent === component.id}
                        onHover={(isHovered) =>
                          setHoveredComponent(isHovered ? component.id : null)
                        }
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
