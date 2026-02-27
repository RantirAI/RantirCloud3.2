/**
 * DSPropertyIndicator
 * 
 * Teal/Cyan indicator that appears next to properties inherited from
 * the Design System. Provides detach/relink actions per property.
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Link2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DSPropertyIndicatorProps {
  /** Whether this property is currently linked to DS */
  isLinked: boolean;
  /** The token name this property is linked to */
  tokenRef?: string;
  /** Human-readable label for the token */
  label?: string;
  /** The resolved value from the DS */
  resolvedValue?: string;
  /** Whether this property can be relinked (has a DS default) */
  canRelink?: boolean;
  /** Callback to detach from DS */
  onDetach?: () => void;
  /** Callback to relink to DS */
  onRelink?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function DSPropertyIndicator({
  isLinked,
  tokenRef,
  label,
  resolvedValue,
  canRelink = false,
  onDetach,
  onRelink,
  size = 'sm',
}: DSPropertyIndicatorProps) {
  if (!isLinked && !canRelink) return null;

  if (isLinked) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetach?.();
              }}
              className={cn(
                "flex items-center gap-1 flex-shrink-0 transition-colors group",
                "hover:opacity-80",
                size === 'sm' && "text-[9px]",
                size === 'md' && "text-[10px]",
              )}
            >
              <div className={cn(
                "rounded-full bg-teal-500",
                size === 'sm' && "w-1.5 h-1.5",
                size === 'md' && "w-2 h-2",
              )} />
              <span className="text-teal-500 font-medium truncate max-w-[60px]">
                {label || tokenRef || 'DS'}
              </span>
              <Unlink className={cn(
                "text-teal-500/0 group-hover:text-teal-500/70 transition-colors",
                size === 'sm' && "h-2.5 w-2.5",
                size === 'md' && "h-3 w-3",
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-teal-600 border-teal-700 text-white text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-teal-300" />
                <p className="font-medium">Linked to Design System</p>
              </div>
              <p className="text-teal-100">Token: {label || tokenRef}</p>
              {resolvedValue && (
                <p className="text-teal-200 text-[10px]">Value: {resolvedValue}</p>
              )}
              <p className="text-teal-200 text-[10px] italic">Click to detach</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Not linked but can relink
  if (canRelink) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRelink?.();
              }}
              className={cn(
                "flex items-center gap-1 flex-shrink-0 transition-colors opacity-40 hover:opacity-100",
                size === 'sm' && "text-[9px]",
                size === 'md' && "text-[10px]",
              )}
            >
              <Link2 className={cn(
                "text-teal-500",
                size === 'sm' && "h-2.5 w-2.5",
                size === 'md' && "h-3 w-3",
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-muted border text-xs"
          >
            <p>Re-link to Design System default</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}

/**
 * Compact inline DS indicator for use inside input fields or tight spaces
 */
export function InlineDSIndicator({
  isLinked,
  label,
  tokenRef,
  onDetach,
  className,
}: {
  isLinked: boolean;
  label?: string;
  tokenRef?: string;
  onDetach?: () => void;
  className?: string;
}) {
  if (!isLinked) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        "bg-teal-500/15 text-teal-500 border border-teal-500/25",
        "text-[9px] px-1 py-0 rounded",
        "font-medium cursor-pointer hover:bg-teal-500/25 transition-colors",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onDetach?.();
      }}
      title={`Linked to DS: ${label || tokenRef}`}
    >
      {label || tokenRef || 'DS'}
    </span>
  );
}
