import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Check, ChevronDown, ChevronRight, CornerDownRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppComment, appCommentsService } from '@/services/appCommentsService';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { formatDistanceToNow } from 'date-fns';
import { CommentInput } from './CommentInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar_url?: string;
}

interface CommentsPanelProps {
  appProjectId: string;
  pageId: string;
  workspaceId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsPanel({ appProjectId, pageId, workspaceId, isOpen, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<AppComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const { setHighlightedCommentElement, highlightedCommentElement, setUnresolvedCommentsCount, isCommentMode, toggleCommentMode } = useAppBuilderStore();

  // Load workspace members
  useEffect(() => {
    if (!workspaceId) return;

    const loadMembers = async () => {
      const { data: members } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profiles:user_id(id, name, avatar_url)
        `)
        .eq('workspace_id', workspaceId);

      if (members) {
        const mapped = members
          .filter(m => m.profiles)
          .map(m => ({
            id: (m.profiles as any).id,
            name: (m.profiles as any).name || 'User',
            avatar_url: (m.profiles as any).avatar_url,
          }));
        setWorkspaceMembers(mapped);
      }
    };

    loadMembers();
  }, [workspaceId]);

  const loadComments = useCallback(async () => {
    if (!appProjectId || !pageId) return;

    setLoading(true);
    try {
      const data = await appCommentsService.getComments(appProjectId, pageId);
      setComments(data);
      
      // Update unresolved count in store for header badge
      const unresolvedTotal = data.filter(c => !c.is_resolved).length;
      setUnresolvedCommentsCount(unresolvedTotal);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [appProjectId, pageId, setUnresolvedCommentsCount]);

  // Load comments when panel opens
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, loadComments]);

  // Also load unresolved count on mount (even when panel is closed)
  useEffect(() => {
    const loadUnresolvedCount = async () => {
      if (!appProjectId || !pageId) return;
      try {
        const data = await appCommentsService.getComments(appProjectId, pageId);
        setUnresolvedCommentsCount(data.filter(c => !c.is_resolved).length);
      } catch (err) {
        console.error('Error loading comments count:', err);
      }
    };
    loadUnresolvedCount();
  }, [appProjectId, pageId, setUnresolvedCommentsCount]);

  const handleCommentClick = (comment: AppComment) => {
    if (comment.element_id) {
      setHighlightedCommentElement(comment.element_id);
      
      // Scroll to and flash the element
      const element = document.querySelector(`[data-component-id="${comment.element_id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a visual flash effect
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedCommentElement(null);
      }, 3000);
    }
  };

  const toggleExpanded = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleReply = async (parentId: string, content: string, mentionedUserIds: string[]) => {
    try {
      const reply = await appCommentsService.createComment({
        appProjectId,
        pageId,
        content,
        parentId,
        mentionedUserIds,
      });

      setComments(prev =>
        prev.map(c =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), reply] }
            : c
        )
      );
      setReplyingTo(null);
      
      // Auto-expand to show new reply
      setExpandedComments(prev => new Set([...prev, parentId]));
      
      toast.success('Reply added');
    } catch {
      toast.error('Failed to add reply');
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      await appCommentsService.resolveComment(commentId, resolved);
      setComments(prev => {
        const updated = prev.map(c =>
          c.id === commentId ? { ...c, is_resolved: resolved } : c
        );
        // Update unresolved count in store
        setUnresolvedCommentsCount(updated.filter(c => !c.is_resolved).length);
        return updated;
      });
      toast.success(resolved ? 'Comment resolved' : 'Comment reopened');
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'unresolved') return !c.is_resolved;
    if (filter === 'resolved') return c.is_resolved;
    return true;
  });

  const unresolvedCount = comments.filter(c => !c.is_resolved).length;
  const resolvedCount = comments.filter(c => c.is_resolved).length;

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Comments</h3>
          {unresolvedCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] bg-orange-500 text-white">
              {unresolvedCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={isCommentMode ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={toggleCommentMode}
            title={isCommentMode ? 'Exit comment mode' : 'Add comment pin on canvas'}
          >
            <MessageCircle className="h-3 w-3" />
            Add
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setFilter('all')}
        >
          All ({comments.length})
        </Button>
        <Button
          variant={filter === 'unresolved' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setFilter('unresolved')}
        >
          Open ({unresolvedCount})
        </Button>
        <Button
          variant={filter === 'resolved' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setFilter('resolved')}
        >
          Resolved ({resolvedCount})
        </Button>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading comments...
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {filter === 'all' 
                ? 'No comments yet. Right-click on an element to add one!'
                : `No ${filter} comments.`}
            </div>
          ) : (
            filteredComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isExpanded={expandedComments.has(comment.id)}
                isHighlighted={highlightedCommentElement === comment.element_id}
                isReplying={replyingTo === comment.id}
                workspaceMembers={workspaceMembers}
                onToggleExpand={() => toggleExpanded(comment.id)}
                onClick={() => handleCommentClick(comment)}
                onReplyClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                onReply={(content, mentions) => handleReply(comment.id, content, mentions)}
                onCancelReply={() => setReplyingTo(null)}
                onResolve={(resolved) => handleResolve(comment.id, resolved)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CommentItemProps {
  comment: AppComment;
  isExpanded: boolean;
  isHighlighted: boolean;
  isReplying: boolean;
  workspaceMembers: WorkspaceMember[];
  onToggleExpand: () => void;
  onClick: () => void;
  onReplyClick: () => void;
  onReply: (content: string, mentions: string[]) => Promise<void>;
  onCancelReply: () => void;
  onResolve: (resolved: boolean) => void;
}

function CommentItem({ 
  comment, 
  isExpanded, 
  isHighlighted, 
  isReplying,
  workspaceMembers,
  onToggleExpand, 
  onClick,
  onReplyClick,
  onReply,
  onCancelReply,
  onResolve,
}: CommentItemProps) {
  const userName = comment.user?.name || 'User';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const replyCount = comment.replies?.length || 0;
  const hasElement = !!comment.element_id;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all",
        comment.is_resolved ? "bg-muted/30 border-border" : "bg-background border-border",
        isHighlighted && "ring-2 ring-primary border-primary"
      )}
    >
      {/* Header - clickable to navigate to element */}
      <div 
        className={cn(
          "cursor-pointer",
          hasElement && "hover:opacity-80"
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={comment.user?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium truncate">{userName}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Element badge */}
            {hasElement && (
              <Badge variant="outline" className="h-4 text-[9px] mt-1 px-1.5 gap-1 cursor-pointer hover:bg-accent">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Click to view element
              </Badge>
            )}
          </div>

          {/* Status indicators & actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(!comment.is_resolved);
              }}
            >
              <Check className={cn(
                "h-3 w-3",
                comment.is_resolved ? "text-green-500" : "text-muted-foreground"
              )} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <p className="text-xs text-foreground mt-2 whitespace-pre-wrap">{comment.content}</p>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 mt-2">
        {/* Replies toggle */}
        {replyCount > 0 && (
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
        
        {/* Reply button */}
        <button
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onReplyClick();
          }}
        >
          <CornerDownRight className="h-3 w-3" />
          Reply
        </button>
      </div>

      {/* Expanded replies */}
      {isExpanded && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-4 space-y-2 border-l-2 border-muted">
          {comment.replies.map(reply => {
            const replyUserName = reply.user?.name || 'User';
            const replyInitials = replyUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            return (
              <div key={reply.id} className="text-xs">
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={reply.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{replyInitials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-[10px]">{replyUserName}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 ml-5 whitespace-pre-wrap">{reply.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply input */}
      {isReplying && (
        <div className="mt-3 pt-3 border-t">
          <CommentInput
            placeholder="Write a reply..."
            onSubmit={onReply}
            onCancel={onCancelReply}
            workspaceMembers={workspaceMembers}
            autoFocus
            compact
          />
        </div>
      )}
    </div>
  );
}
