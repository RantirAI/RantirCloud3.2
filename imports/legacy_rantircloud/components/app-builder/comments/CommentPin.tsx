import React from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppComment } from '@/services/appCommentsService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CommentPinProps {
  comment: AppComment;
  isSelected: boolean;
  onClick: () => void;
}

export function CommentPin({ comment, isSelected, onClick }: CommentPinProps) {
  const replyCount = comment.replies?.length || 0;
  const userName = comment.user?.name || 'User';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={cn(
            "absolute z-50 group transition-all duration-200",
            "flex items-center justify-center",
            "-translate-x-1/2 -translate-y-full",
            isSelected && "z-[60]"
          )}
          style={{
            left: comment.position_x ?? 0,
            top: comment.position_y ?? 0,
          }}
        >
          {/* Pin stem */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-primary rounded-b" />
          
          {/* Pin head */}
          <div
            className={cn(
              "relative flex items-center gap-1 px-1.5 py-1 rounded-full shadow-lg",
              "border-2 transition-all duration-200",
              comment.is_resolved
                ? "bg-green-500 border-green-600 text-white"
                : "bg-primary border-primary-foreground/20 text-primary-foreground",
              isSelected && "ring-2 ring-offset-2 ring-primary scale-110",
              "hover:scale-105"
            )}
          >
            <Avatar className="h-5 w-5 border border-white/20">
              <AvatarImage src={comment.user?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-white/20">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {comment.is_resolved ? (
              <Check className="h-3 w-3" />
            ) : (
              <MessageCircle className="h-3 w-3" />
            )}
            
            {replyCount > 0 && (
              <span className="text-[10px] font-medium">{replyCount}</span>
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium text-xs">{userName}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{comment.content}</p>
        {replyCount > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
