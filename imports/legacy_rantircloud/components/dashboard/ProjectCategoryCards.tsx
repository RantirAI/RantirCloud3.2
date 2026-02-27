import React from 'react';
import { cn } from '@/lib/utils';
import websitesIcon from '@/assets/icons/websites-avatars-4.svg';
import integrationsIcon from '@/assets/icons/integrations-4.svg';
import dataIcon from '@/assets/icons/data-4.svg';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ProjectCategory = 'website' | 'workflow' | 'database' | null;

interface ProjectCategoryCardsProps {
  selectedCategory: ProjectCategory;
  onSelectCategory: (category: ProjectCategory) => void;
}

const categories = [
  {
    id: 'website' as const,
    title: 'Build a Website or Presentation',
    description: 'Create landing pages, apps, and visual presentations',
    icon: websitesIcon,
    bgGradient: 'from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent',
    hoverBg: 'hover:bg-blue-100/60 dark:hover:bg-blue-900/30',
    borderColor: 'border-border/60',
    selectedBorder: 'ring-2 ring-blue-400 dark:ring-blue-500',
  },
  {
    id: 'workflow' as const,
    title: 'Build a Logic Workflow',
    description: 'Automate tasks with visual flow builders',
    icon: integrationsIcon,
    bgGradient: 'from-purple-50/30 to-transparent dark:from-purple-950/10 dark:to-transparent',
    hoverBg: 'hover:bg-purple-100/60 dark:hover:bg-purple-900/30',
    borderColor: 'border-border/60',
    selectedBorder: 'ring-2 ring-purple-400 dark:ring-purple-500',
  },
  {
    id: 'database' as const,
    title: 'Build a Document or Database',
    description: 'Organize data, create docs, and manage content',
    icon: dataIcon,
    bgGradient: 'from-amber-50/30 to-transparent dark:from-amber-950/10 dark:to-transparent',
    hoverBg: 'hover:bg-amber-100/60 dark:hover:bg-amber-900/30',
    borderColor: 'border-border/60',
    selectedBorder: 'ring-2 ring-amber-400 dark:ring-amber-500',
  },
];

export function ProjectCategoryCards({ selectedCategory, onSelectCategory }: ProjectCategoryCardsProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-3 gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          
          return (
            <Tooltip key={category.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? null : category.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200",
                    "hover:shadow-md hover:scale-[1.02]",
                    "bg-gradient-to-br",
                    category.bgGradient,
                    category.hoverBg,
                    category.borderColor,
                    isSelected && category.selectedBorder
                  )}
                >
                  <img 
                    src={category.icon} 
                    alt="" 
                    className="w-10 h-8 object-contain flex-shrink-0"
                  />
                  <span className="text-[13px] font-medium text-foreground text-left leading-tight">
                    {category.title}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="text-xs">{category.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
