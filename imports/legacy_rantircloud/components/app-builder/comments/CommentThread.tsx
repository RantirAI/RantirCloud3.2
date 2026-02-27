import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, MoreHorizontal, Trash2, Edit2, X, CornerDownRight } from 'lucide-react';
import { AppComment } from '@/services/appCommentsService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CommentInput } from './CommentInput';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar_url?: string;
}

interface CommentThreadProps {
  comment: AppComment;
  currentUserId: string;
  workspaceMembers: WorkspaceMember[];
  onReply: (content: string, mentionedUserIds: string[]) => Promise<void>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onClose?: () => void;
}

export function CommentThread({
  comment,
  currentUserId,
  workspaceMembers,
  onReply,
  onUpdate,
  onDelete,
  onResolve,
  onClose,
}: CommentThreadProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (c: AppComment) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    await onUpdate(commentId, editContent.trim());
    setEditingId(null);
    setEditContent('');
  };

  const renderComment = (c: AppComment, isReply = false) => {
    const userName = c.user?.name || 'User';
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const isOwner = c.user_id === currentUserId;
    const isEditing = editingId === c.id;

    return (
      <div
        key={c.id}
        className={cn(
          "group",
          isReply && "pl-4 border-l-2 border-muted ml-3"
        )}
      >
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={c.user?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{userName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>

              {isOwner && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStartEdit(c)}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(c.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isEditing ? (
              <div className="mt-1 space-y-1">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-xs"
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleSaveEdit(c.id)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                {c.content}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-72 bg-popover border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium">
          {comment.is_resolved ? 'Resolved' : 'Comment'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onResolve(comment.id, !comment.is_resolved)}
          >
            <Check className={cn(
              "h-3.5 w-3.5",
              comment.is_resolved && "text-green-500"
            )} />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="max-h-64 overflow-y-auto p-3 space-y-3">
        {renderComment(comment)}
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>

      {/* Reply input */}
      <div className="border-t p-2">
        {showReplyInput ? (
          <CommentInput
            placeholder="Reply..."
            onSubmit={async (content, mentions) => {
              await onReply(content, mentions);
              setShowReplyInput(false);
            }}
            onCancel={() => setShowReplyInput(false)}
            workspaceMembers={workspaceMembers}
            autoFocus
            compact
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground h-7"
            onClick={() => setShowReplyInput(true)}
          >
            <CornerDownRight className="h-3 w-3 mr-1.5" />
            Reply...
          </Button>
        )}
      </div>
    </div>
  );
}
