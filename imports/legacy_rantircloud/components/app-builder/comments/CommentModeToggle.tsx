import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CommentModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
  commentCount?: number;
  unresolvedCount?: number;
}

export function CommentModeToggle({
  isActive,
  onToggle,
  commentCount = 0,
  unresolvedCount = 0,
}: CommentModeToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={onToggle}
          className={cn(
            "relative gap-1.5",
            isActive && "bg-primary text-primary-foreground"
          )}
        >
          {isActive ? (
            <>
              <X className="h-4 w-4" />
              Exit Comments
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" />
              Comments
              {unresolvedCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1.5 text-[10px] bg-orange-500 text-white"
                >
                  {unresolvedCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isActive
          ? 'Exit comment mode'
          : `${commentCount} comments (${unresolvedCount} unresolved)`}
      </TooltipContent>
    </Tooltip>
  );
}
