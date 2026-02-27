import React from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CommentIndicatorProps {
  count: number;
  hasUnresolved: boolean;
  onClick?: () => void;
}

export function CommentIndicator({ count, hasUnresolved, onClick }: CommentIndicatorProps) {
  if (count === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={cn(
            "absolute -top-1 -right-1 z-[9998] flex items-center justify-center",
            "min-w-5 h-5 px-1 rounded-full text-[10px] font-medium",
            "shadow-sm border transition-transform hover:scale-110",
            hasUnresolved
              ? "bg-orange-500 text-white border-orange-600"
              : "bg-green-500 text-white border-green-600"
          )}
        >
          <MessageCircle className="h-2.5 w-2.5 mr-0.5" />
          {count}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {count} {count === 1 ? 'comment' : 'comments'}
        {hasUnresolved ? ' (unresolved)' : ' (all resolved)'}
      </TooltipContent>
    </Tooltip>
  );
}
