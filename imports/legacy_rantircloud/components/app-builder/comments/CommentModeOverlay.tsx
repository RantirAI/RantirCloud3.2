import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AppComment, appCommentsService } from '@/services/appCommentsService';
import { CommentPin } from './CommentPin';
import { CommentThread } from './CommentThread';
import { CommentInput } from './CommentInput';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar_url?: string;
}

interface CommentModeOverlayProps {
  appProjectId: string;
  pageId: string;
  workspaceId?: string;
  isActive: boolean;
  canvasRef: React.RefObject<HTMLElement>;
}

export function CommentModeOverlay({
  appProjectId,
  pageId,
  workspaceId,
  isActive,
  canvasRef,
}: CommentModeOverlayProps) {
  const { pendingCommentElementId, setPendingCommentElement } = useAppBuilderStore();
  const [comments, setComments] = useState<AppComment[]>([]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

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

  // Load comments
  const loadComments = useCallback(async () => {
    if (!appProjectId || !pageId) return;

    try {
      const data = await appCommentsService.getComments(appProjectId, pageId);
      setComments(data);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  }, [appProjectId, pageId]);

  useEffect(() => {
    if (isActive) {
      loadComments();
    }
  }, [isActive, loadComments]);

  // Handle canvas click to create new comment
  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (!isActive || !canvasRef.current) return;

    // Ignore clicks on existing comments or UI elements
    const target = e.target as HTMLElement;
    if (target.closest('[data-comment-pin]') || target.closest('[data-comment-thread]')) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + canvasRef.current.scrollLeft;
    const y = e.clientY - rect.top + canvasRef.current.scrollTop;

    setNewCommentPosition({ x, y });
    setSelectedCommentId(null);
  }, [isActive, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    canvas.addEventListener('click', handleCanvasClick);
    return () => canvas.removeEventListener('click', handleCanvasClick);
  }, [handleCanvasClick, isActive, canvasRef]);

  const handleCreateComment = async (content: string, mentionedUserIds: string[]) => {
    if (!newCommentPosition) return;

    try {
      const newComment = await appCommentsService.createComment({
        appProjectId,
        pageId,
        content,
        positionX: newCommentPosition.x,
        positionY: newCommentPosition.y,
        mentionedUserIds,
      });

      setComments(prev => [newComment, ...prev]);
      setNewCommentPosition(null);
      setSelectedCommentId(newComment.id);
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleCreateElementComment = async (content: string, mentionedUserIds: string[]) => {
    if (!pendingCommentElementId) return;

    try {
      // Find element position on canvas
      const element = canvasRef.current?.querySelector(`[data-component-id="${pendingCommentElementId}"]`);
      const rect = element?.getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      
      const posX = rect && canvasRect ? rect.left - canvasRect.left + (canvasRef.current?.scrollLeft || 0) : 100;
      const posY = rect && canvasRect ? rect.top - canvasRect.top + (canvasRef.current?.scrollTop || 0) : 100;

      const newComment = await appCommentsService.createComment({
        appProjectId,
        pageId,
        content,
        elementId: pendingCommentElementId,
        positionX: posX,
        positionY: posY,
        mentionedUserIds,
      });

      setComments(prev => [newComment, ...prev]);
      setPendingCommentElement(null);
      setSelectedCommentId(newComment.id);
      toast.success('Comment added to element');
    } catch {
      toast.error('Failed to add comment');
    }
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
    } catch {
      toast.error('Failed to add reply');
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      await appCommentsService.updateComment(commentId, content);
      
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return { ...c, content };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId ? { ...r, content } : r
              ),
            };
          }
          return c;
        })
      );
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await appCommentsService.deleteComment(commentId);
      
      setComments(prev => {
        // Check if it's a parent comment
        const isParent = prev.some(c => c.id === commentId);
        if (isParent) {
          return prev.filter(c => c.id !== commentId);
        }
        // It's a reply
        return prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId),
        }));
      });

      if (selectedCommentId === commentId) {
        setSelectedCommentId(null);
      }

      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    try {
      await appCommentsService.resolveComment(commentId, resolved);
      
      setComments(prev =>
        prev.map(c =>
          c.id === commentId ? { ...c, is_resolved: resolved } : c
        )
      );

      toast.success(resolved ? 'Comment resolved' : 'Comment reopened');
    } catch {
      toast.error('Failed to update comment');
    }
  };

  // Also show overlay when there's a pending element comment
  if (!isActive && !pendingCommentElementId) return null;

  const selectedComment = comments.find(c => c.id === selectedCommentId);

  // Get element position for element-attached comment input
  const getElementPosition = () => {
    if (!pendingCommentElementId || !canvasRef.current) return { x: 100, y: 100 };
    
    const element = canvasRef.current.querySelector(`[data-component-id="${pendingCommentElementId}"]`);
    if (!element) return { x: 100, y: 100 };
    
    const rect = element.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    return {
      x: rect.right - canvasRect.left + (canvasRef.current.scrollLeft || 0) + 10,
      y: rect.top - canvasRect.top + (canvasRef.current.scrollTop || 0),
    };
  };

  const elementCommentPos = pendingCommentElementId ? getElementPosition() : null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[9999]",
        isActive && "cursor-crosshair"
      )}
      style={{ pointerEvents: isActive || pendingCommentElementId ? 'auto' : 'none' }}
    >
      {/* Comment pins */}
      {comments
        .filter(c => c.position_x != null && c.position_y != null)
        .map(comment => (
          <div key={comment.id} data-comment-pin>
            <CommentPin
              comment={comment}
              isSelected={selectedCommentId === comment.id}
              onClick={() => {
                setSelectedCommentId(comment.id);
                setNewCommentPosition(null);
              }}
            />
          </div>
        ))}

      {/* New comment input (canvas click) */}
      {newCommentPosition && (
        <div
          className="absolute z-[10000]"
          style={{
            left: newCommentPosition.x,
            top: newCommentPosition.y,
          }}
          data-comment-thread
        >
          <div className="w-72 bg-popover border rounded-lg shadow-lg p-3">
            <CommentInput
              placeholder="Add a comment..."
              onSubmit={handleCreateComment}
              onCancel={() => setNewCommentPosition(null)}
              workspaceMembers={workspaceMembers}
              autoFocus
              compact
            />
          </div>
        </div>
      )}

      {/* Element-attached comment input (right-click on component) */}
      {pendingCommentElementId && elementCommentPos && (
        <div
          className="absolute z-[10000]"
          style={{
            left: elementCommentPos.x,
            top: elementCommentPos.y,
          }}
          data-comment-thread
        >
          <div className="w-72 bg-popover border rounded-lg shadow-lg p-3">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full" />
              Commenting on element
            </div>
            <CommentInput
              placeholder="Add a comment on this element..."
              onSubmit={handleCreateElementComment}
              onCancel={() => setPendingCommentElement(null)}
              workspaceMembers={workspaceMembers}
              autoFocus
              compact
            />
          </div>
        </div>
      )}

      {/* Selected comment thread */}
      {selectedComment && currentUserId && (
        <div
          className="absolute z-[10000]"
          style={{
            left: (selectedComment.position_x ?? 0) + 20,
            top: selectedComment.position_y ?? 0,
          }}
          data-comment-thread
        >
          <CommentThread
            comment={selectedComment}
            currentUserId={currentUserId}
            workspaceMembers={workspaceMembers}
            onReply={(content, mentions) =>
              handleReply(selectedComment.id, content, mentions)
            }
            onUpdate={handleUpdateComment}
            onDelete={handleDeleteComment}
            onResolve={handleResolveComment}
            onClose={() => setSelectedCommentId(null)}
          />
        </div>
      )}
    </div>
  );
}
