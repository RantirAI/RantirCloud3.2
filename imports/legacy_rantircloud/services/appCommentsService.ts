import { supabase } from '@/integrations/supabase/client';

export interface AppComment {
  id: string;
  app_project_id: string;
  page_id: string;
  user_id: string;
  content: string;
  is_resolved: boolean;
  position_x: number | null;
  position_y: number | null;
  element_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  replies?: AppComment[];
  mentions?: AppCommentMention[];
}

export interface AppCommentMention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateCommentParams {
  appProjectId: string;
  pageId: string;
  content: string;
  positionX?: number;
  positionY?: number;
  elementId?: string;
  parentId?: string;
  mentionedUserIds?: string[];
}

export const appCommentsService = {
  async getComments(appProjectId: string, pageId: string): Promise<AppComment[]> {
    const { data: comments, error } = await supabase
      .from('app_comments')
      .select('*')
      .eq('app_project_id', appProjectId)
      .eq('page_id', pageId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    // Fetch user profiles separately
    const userIds = [...new Set((comments || []).map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('app_comments')
          .select('*')
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        // Get profiles for replies
        const replyUserIds = [...new Set((replies || []).map(r => r.user_id))];
        const { data: replyProfiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', replyUserIds);
        
        const replyProfileMap = new Map(replyProfiles?.map(p => [p.id, p]) || []);

        return {
          ...comment,
          user: profileMap.get(comment.user_id) || null,
          replies: (replies || []).map(r => ({
            ...r,
            user: replyProfileMap.get(r.user_id) || null,
          })),
        };
      })
    );

    return commentsWithReplies as AppComment[];
  },

  async createComment(params: CreateCommentParams): Promise<AppComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: comment, error } = await supabase
      .from('app_comments')
      .insert({
        app_project_id: params.appProjectId,
        page_id: params.pageId,
        user_id: user.id,
        content: params.content,
        position_x: params.positionX,
        position_y: params.positionY,
        element_id: params.elementId || null,
        parent_id: params.parentId || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      throw error;
    }

    // Fetch user profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', user.id)
      .single();

    // Create mentions if any
    if (params.mentionedUserIds && params.mentionedUserIds.length > 0) {
      const mentions = params.mentionedUserIds.map(userId => ({
        comment_id: comment.id,
        mentioned_user_id: userId,
      }));

      await supabase.from('app_comment_mentions').insert(mentions);
    }

    return {
      ...comment,
      user: profile || undefined,
    } as AppComment;
  },

  async updateComment(commentId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('app_comments')
      .update({ content })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('app_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async resolveComment(commentId: string, resolved: boolean): Promise<void> {
    const { error } = await supabase
      .from('app_comments')
      .update({ is_resolved: resolved })
      .eq('id', commentId);

    if (error) {
      console.error('Error resolving comment:', error);
      throw error;
    }
  },

  async getUnreadMentions(): Promise<AppCommentMention[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('app_comment_mentions')
      .select('*')
      .eq('mentioned_user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread mentions:', error);
      return [];
    }

    return data || [];
  },

  async markMentionAsRead(mentionId: string): Promise<void> {
    const { error } = await supabase
      .from('app_comment_mentions')
      .update({ is_read: true })
      .eq('id', mentionId);

    if (error) {
      console.error('Error marking mention as read:', error);
    }
  },

  async markAllMentionsAsRead(commentIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('app_comment_mentions')
      .update({ is_read: true })
      .eq('mentioned_user_id', user.id)
      .in('comment_id', commentIds);

    if (error) {
      console.error('Error marking mentions as read:', error);
    }
  },
};
