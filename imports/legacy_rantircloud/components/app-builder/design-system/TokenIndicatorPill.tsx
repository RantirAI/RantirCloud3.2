/**
 * Token Indicator Pill
 * Purple pill that appears inside property input fields when the value
 * is controlled by a design system token/theme variable
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTokenDisplayName } from '@/stores/designTokenStore';

interface TokenIndicatorPillProps {
  /** The token name (e.g., "primary", "button-radius") */
  tokenName: string;
  /** Optional callback when user wants to detach from token */
  onRemove?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

export function TokenIndicatorPill({ 
  tokenName, 
  onRemove, 
  size = 'sm',
  className 
}: TokenIndicatorPillProps) {
  const displayName = getTokenDisplayName(tokenName);
  
  return (
    <Badge 
      className={cn(
        "bg-purple-500/20 text-purple-400 border-purple-500/30",
        "flex items-center gap-1 flex-shrink-0 font-normal",
        "hover:bg-purple-500/30 transition-colors",
        size === 'sm' && "text-[9px] px-1.5 py-0 h-4",
        size === 'md' && "text-[10px] px-2 py-0.5 h-5",
        className
      )}
      variant="outline"
    >
      <span className="truncate max-w-[80px]">{displayName}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-purple-200 transition-colors"
        >
          <X className={cn(
            size === 'sm' && "h-2.5 w-2.5",
            size === 'md' && "h-3 w-3"
          )} />
        </button>
      )}
    </Badge>
  );
}

/**
 * Inline token indicator for use inside input fields
 * More compact version that sits inside the input area
 */
export function InlineTokenIndicator({ 
  tokenName,
  onRemove,
  className 
}: {
  tokenName: string;
  onRemove?: () => void;
  className?: string;
}) {
  const displayName = getTokenDisplayName(tokenName);
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-0.5",
        "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        "text-[9px] px-1 py-0 rounded",
        "font-medium",
        className
      )}
    >
      {displayName}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-purple-200"
        >
          <X className="h-2 w-2" />
        </button>
      )}
    </span>
  );
}
