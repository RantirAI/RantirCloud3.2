import { supabase } from '@/integrations/supabase/client';

export interface UserActivity {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  activity_type: string;
  description: string;
  resource_type?: string | null;
  resource_id?: string | null;
  resource_name?: string | null;
  metadata?: any;
  created_at: string;
}

export type ActivityType = 
  // Project activities
  | 'database_created' | 'database_updated' | 'database_deleted'
  | 'table_created' | 'table_updated' | 'table_deleted'
  | 'record_created' | 'record_updated' | 'record_deleted'
  | 'flow_created' | 'flow_updated' | 'flow_deleted' | 'flow_executed'
  | 'app_created' | 'app_updated' | 'app_deleted' | 'app_published'
  // Document activities
  | 'document_created' | 'document_updated' | 'document_deleted'
  // Drive activities
  | 'file_uploaded' | 'file_deleted' | 'file_shared' | 'folder_created'
  // User activities
  | 'user_registered' | 'user_login' | 'user_logout'
  | 'settings_updated' | 'password_changed' | 'profile_updated'
  // Search activities
  | 'search_performed'
  // AI activities
  | 'ai_chat_started' | 'ai_chat_message'
  // Flow node activities
  | 'node_added' | 'node_updated' | 'node_removed'
  // Cloud activities
  | 'cloud_project_created' | 'cloud_project_updated';

export interface LogActivityParams {
  type: ActivityType;
  description: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  metadata?: Record<string, any>;
  workspaceId?: string;
}

class ActivityService {
  /**
   * Log a user activity
   */
  async logActivity(params: LogActivityParams): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current workspace if not provided
      let workspaceId = params.workspaceId;
      if (!workspaceId) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('current_workspace_id')
          .eq('id', user.id)
          .maybeSingle();
        workspaceId = settings?.current_workspace_id || undefined;
      }

      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: params.type,
          description: params.description,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          resource_name: params.resourceName,
          metadata: params.metadata || {},
          workspace_id: workspaceId
        });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Activity logging error:', error);
    }
  }

  /**
   * Get user activities with pagination (current user only)
   */
  async getUserActivities(limit = 50, offset = 0): Promise<UserActivity[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch activities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  }

  /**
   * Get workspace activities - activities from all users in the workspace
   *
   * NOTE: auth events (user_login/user_logout) can be extremely high-volume and will
   * crowd out meaningful activity when using LIMIT. By default we exclude them.
   */
  async getWorkspaceActivities(
    limit = 500,
    options?: { includeAuthEvents?: boolean }
  ): Promise<UserActivity[]> {
    try {
      const includeAuthEvents = options?.includeAuthEvents ?? false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First, get the user's current workspace
      const { data: settings } = await supabase
        .from('user_settings')
        .select('current_workspace_id')
        .eq('id', user.id)
        .maybeSingle();

      let workspaceId = settings?.current_workspace_id as string | null;

      // If no current workspace, try to get the user's default workspace
      if (!workspaceId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle();

        workspaceId = workspace?.id || null;
      }

      if (!workspaceId) {
        // No workspace, fall back to user's own activities
        return this.getUserActivities(limit);
      }

      // Get all members of the workspace (including owner)
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('user_id')
        .eq('id', workspaceId)
        .single();

      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);

      // Combine owner and members
      const memberIds = new Set<string>();
      if (workspaceData?.user_id) {
        memberIds.add(workspaceData.user_id);
      }
      members?.forEach((m) => {
        if (m.user_id) memberIds.add(m.user_id);
      });

      if (memberIds.size === 0) {
        return [];
      }

      // Fetch activities for the current workspace only
      let query = supabase
        .from('user_activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeAuthEvents) {
        query = query.neq('activity_type', 'user_login').neq('activity_type', 'user_logout');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch workspace activities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch workspace activities:', error);
      return [];
    }
  }

  /**
   * Subscribe to workspace activities (all members)
   */
  async subscribeToWorkspaceActivities(callback: (activity: UserActivity) => void) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get current workspace
      const { data: settings } = await supabase
        .from('user_settings')
        .select('current_workspace_id')
        .eq('id', user.id)
        .maybeSingle();

      let workspaceId = settings?.current_workspace_id as string | null;

      if (!workspaceId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        workspaceId = workspace?.id || null;
      }

      if (!workspaceId) {
        // Fall back to user-only subscription
        return this.subscribeToActivities(user.id, callback);
      }

      // Get workspace members
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('user_id')
        .eq('id', workspaceId)
        .single();

      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);

      const memberIds = new Set<string>();
      if (workspaceData?.user_id) memberIds.add(workspaceData.user_id);
      members?.forEach(m => {
        if (m.user_id) memberIds.add(m.user_id);
      });

      // Subscribe to activities for the current workspace only
      const channel = supabase
        .channel(`workspace-activities-${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_activities',
            filter: `workspace_id=eq.${workspaceId}`
          },
          (payload) => {
            callback(payload.new as UserActivity);
          }
        )
        .subscribe();

      return channel;
    } catch (error) {
      console.error('Error subscribing to workspace activities:', error);
      return null;
    }
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(type: ActivityType, limit = 20): Promise<UserActivity[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch activities by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch activities by type:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time activity updates
   */
  async subscribeToActivities(userId: string, callback: (activity: UserActivity) => void) {
    if (!userId) return null;

    const channel = supabase
      .channel('user-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as UserActivity);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Helper methods for common activities
   */
  async logProjectCreated(type: 'database' | 'flow' | 'app' | 'logic', name: string, id: string) {
    await this.logActivity({
      type: `${type}_created` as ActivityType,
      description: `Created ${type}: ${name}`,
      resourceType: type,
      resourceId: id,
      resourceName: name
    });
  }


  async logRecordAction(action: 'created' | 'updated' | 'deleted', tableName: string, recordId?: string) {
    await this.logActivity({
      type: `record_${action}` as ActivityType,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} record in ${tableName}`,
      resourceType: 'record',
      resourceId: recordId,
      resourceName: tableName
    });
  }

  async logFlowExecution(flowName: string, flowId: string, success: boolean) {
    await this.logActivity({
      type: 'flow_executed',
      description: `${success ? 'Successfully executed' : 'Failed to execute'} flow: ${flowName}`,
      resourceType: 'flow',
      resourceId: flowId,
      resourceName: flowName,
      metadata: { success }
    });
  }

  async logAIChatStarted(pageContext: string, conversationId: string, preview: string) {
    await this.logActivity({
      type: 'ai_chat_started',
      description: preview,
      resourceType: 'ai_conversation',
      resourceId: conversationId,
      resourceName: `AI Chat - ${pageContext}`,
      metadata: { pageContext }
    });
  }

  async logAIChatMessage(pageContext: string, conversationId: string, message: string, role: 'user' | 'assistant') {
    await this.logActivity({
      type: 'ai_chat_message',
      description: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      resourceType: 'ai_conversation',
      resourceId: conversationId,
      resourceName: `AI Chat - ${pageContext}`,
      metadata: { pageContext, role, fullMessage: message }
    });
  }
}

export const activityService = new ActivityService();