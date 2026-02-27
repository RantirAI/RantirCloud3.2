/**
 * PropertyIndicator - Visual indicator for property source
 * Shows blue for CLASS1 (primary), yellow for CLASS2 (secondary), etc.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PropertyIndicatorProps {
  classLevel?: number; // 1 = blue (primary), 2 = yellow (secondary), etc.
  status?: 'active' | 'inherited' | 'manual' | 'none';
  className?: string;
  sourceInfo?: {
    className?: string;
    source?: string;
  };
}

export function PropertyIndicator({ classLevel, status, className, sourceInfo }: PropertyIndicatorProps) {
  const getIndicatorColor = () => {
    // UPDATED COLOR LOGIC per requirements:
    // Blue (#2979FF) = from active/primary class OR manual inline edit
    // Yellow (#F39C12) = from secondary class (not overridden)
    // Gray = default/unset
    
    // Use status-based colors (NEW SYSTEM)
    switch (status) {
      case 'active':
        return 'bg-[#2979FF]'; // Blue = Active primary class or manual
      case 'manual':
        return 'bg-[#2979FF]'; // Blue = Manual inline edit
      case 'inherited':
        return 'bg-[#F39C12]'; // Yellow = From secondary class
      default:
        return 'bg-gray-400'; // Gray = Default/unset
    }
  };
  
  const getTooltipText = () => {
    if (classLevel !== undefined) {
      return `CLASS${classLevel}: ${sourceInfo?.className || 'Unknown'}`;
    }
    
    switch (status) {
      case 'active':
        return `From active class: ${sourceInfo?.className || 'Primary'}`;
      case 'inherited':
        return `Inherited from: ${sourceInfo?.className || 'Secondary class'}`;
      case 'manual':
        return 'Manually set value';
      default:
        return 'Default value';
    }
  };
  
  if (status === 'none' && classLevel === undefined) {
    return null;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              getIndicatorColor(),
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SectionHeaderIndicator - Colored dot for section headers
 */
interface SectionHeaderIndicatorProps {
  classLevel: number;
  className?: string;
}

export function SectionHeaderIndicator({ classLevel, className }: SectionHeaderIndicatorProps) {
  const getColor = () => {
    // UPDATED per requirements: blue for primary, yellow for secondary
    switch (classLevel) {
      case 1:
        return 'bg-[#2979FF]'; // Primary/Active - Blue
      case 2:
        return 'bg-[#F39C12]'; // Secondary/Inherited - Yellow
      case 3:
        return 'bg-emerald-500';
      case 4:
        return 'bg-purple-500';
      default:
        return 'bg-gray-400'; // Default/unset
    }
  };
  
  return (
    <div 
      className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        getColor(),
        className
      )}
    />
  );
}

/**
 * PropertyLabel - Enhanced label with indicator
 */
interface PropertyLabelProps {
  label: string;
  classLevel?: number;
  status?: 'active' | 'inherited' | 'manual' | 'none';
  sourceInfo?: {
    className?: string;
    source?: string;
  };
  className?: string;
}

export function PropertyLabel({ label, classLevel, status, sourceInfo, className }: PropertyLabelProps) {
  const getTextColor = () => {
    // UPDATED per requirements: Blue for primary/manual, Yellow for secondary, Gray for default
    switch (status) {
      case 'active':
        return 'text-[#2979FF] dark:text-[#2979FF]'; // Blue = Active primary
      case 'manual':
        return 'text-[#2979FF] dark:text-[#2979FF]'; // Blue = Manual inline
      case 'inherited':
        return 'text-[#F39C12] dark:text-[#F39C12]'; // Yellow = Secondary class
      default:
        return 'text-muted-foreground'; // Gray = Default
    }
  };
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PropertyIndicator classLevel={classLevel} status={status} sourceInfo={sourceInfo} />
      <span className={cn('text-xs font-medium uppercase', getTextColor())}>
        {label}
      </span>
    </div>
  );
}
