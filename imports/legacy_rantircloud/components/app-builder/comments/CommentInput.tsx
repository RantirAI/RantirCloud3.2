import React, { useState, useRef, useEffect } from 'react';
import { Send, X, AtSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar_url?: string;
}

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>;
  onCancel?: () => void;
  workspaceMembers?: WorkspaceMember[];
  autoFocus?: boolean;
  compact?: boolean;
}

export function CommentInput({
  placeholder = 'Add a comment...',
  onSubmit,
  onCancel,
  workspaceMembers = [],
  autoFocus = false,
  compact = false,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), selectedMentions);
      setContent('');
      setSelectedMentions([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    setCursorPosition(e.target.selectionStart);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, e.target.selectionStart);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
      const searchText = textBeforeCursor.slice(atIndex + 1);
      if (!searchText.includes(' ')) {
        setMentionSearch(searchText.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (member: WorkspaceMember) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.slice(cursorPosition);
    
    const newContent = 
      textBeforeCursor.slice(0, atIndex) + 
      `@${member.name} ` + 
      textAfterCursor;
    
    setContent(newContent);
    setSelectedMentions(prev => [...new Set([...prev, member.id])]);
    setShowMentions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = atIndex + member.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const filteredMembers = workspaceMembers.filter(
    m => m.name.toLowerCase().includes(mentionSearch)
  );

  return (
    <div className={cn("relative", compact ? "space-y-1" : "space-y-2")}>
      <Popover open={showMentions && filteredMembers.length > 0}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "resize-none pr-10",
                compact ? "min-h-[60px] text-xs" : "min-h-[80px] text-sm"
              )}
            />
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "absolute right-1 bottom-1",
                compact ? "h-6 w-6" : "h-7 w-7"
              )}
              onClick={() => setShowMentions(!showMentions)}
              type="button"
            >
              <AtSign className={compact ? "h-3 w-3" : "h-4 w-4"} />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          align="start" 
          className="w-56 p-1 max-h-48 overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => insertMention(member)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate">{member.name}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          ⌘+Enter to send • @ to mention
        </p>
        <div className="flex items-center gap-1">
          {onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className={compact ? "h-6 px-2 text-xs" : "h-7"}
            >
              <X className={compact ? "h-3 w-3" : "h-4 w-4"} />
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className={compact ? "h-6 px-2 text-xs" : "h-7"}
          >
            {isSubmitting ? (
              <Loader2 className={cn("animate-spin", compact ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <Send className={compact ? "h-3 w-3" : "h-4 w-4"} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
