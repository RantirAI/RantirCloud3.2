import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, PlayCircle, StopCircle, Plus, Trash2, Database, Workflow, AppWindow, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { activityService } from '@/services/activityService';

interface ActivityTimelineProps {
  pageContext: 'database' | 'flow' | 'app' | 'cloud';
  contextId: string;
}

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  metadata?: any;
  created_at: string;
}

interface UserProfile {
  name?: string;
  avatar_url?: string;
}

export function ActivityTimeline({ pageContext, contextId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<(UserActivity & { userProfile?: UserProfile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    loadActivities();
    
    // Subscribe to real-time updates from workspace
    let channel: any = null;
    
    const setupSubscription = async () => {
      channel = await activityService.subscribeToWorkspaceActivities(async (newActivity) => {
        // Only add if it matches the context
        if (newActivity.resource_id === contextId) {
          // Get profile for this user
          let userProfile = profileCache[newActivity.user_id];
          if (!userProfile) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', newActivity.user_id)
              .single();
            
            if (profile) {
              userProfile = { name: profile.name || undefined, avatar_url: profile.avatar_url || undefined };
              setProfileCache(prev => ({ ...prev, [newActivity.user_id]: userProfile! }));
            }
          }
          
          setActivities(prev => [{ ...newActivity as UserActivity, userProfile }, ...prev]);
        }
      });
    };
    
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [contextId, pageContext]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      
      // Get workspace-wide activities for this resource
      // Exclude auth events so they don't crowd out meaningful activity.
      const workspaceActivities = await activityService.getWorkspaceActivities(2000, {
        includeAuthEvents: false,
      });

      // Filter to only activities for this resource
      const filteredActivities = workspaceActivities.filter(
        activity => activity.resource_id === contextId
      );
      
      // Get unique user IDs
      const userIds = [...new Set(filteredActivities.map(a => a.user_id))];
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);
      
      // Build profile cache
      const newProfileCache: Record<string, UserProfile> = {};
      profiles?.forEach(profile => {
        newProfileCache[profile.id] = { 
          name: profile.name || undefined, 
          avatar_url: profile.avatar_url || undefined 
        };
      });
      setProfileCache(newProfileCache);
      
      // Add profiles to activities
      const activitiesWithProfiles = filteredActivities.map(activity => ({
        ...activity,
        userProfile: newProfileCache[activity.user_id]
      }));
      
      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'flow_executed':
        return <PlayCircle className="h-4 w-4" />;
      case 'flow_execution_failed':
        return <StopCircle className="h-4 w-4" />;
      case 'flow_updated':
      case 'node_added':
      case 'node_updated':
      case 'node_removed':
        return <Workflow className="h-4 w-4" />;
      case 'record_created':
        return <Plus className="h-4 w-4" />;
      case 'record_deleted':
        return <Trash2 className="h-4 w-4" />;
      case 'database_created':
      case 'database_opened':
        return <Database className="h-4 w-4" />;
      case 'app_created':
      case 'app_opened':
        return <AppWindow className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'flow_executed':
      case 'record_created':
      case 'node_added':
        return 'text-green-600 dark:text-green-400';
      case 'flow_execution_failed':
      case 'record_deleted':
      case 'node_removed':
        return 'text-red-600 dark:text-red-400';
      case 'flow_updated':
      case 'record_updated':
      case 'node_updated':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-muted-foreground';
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your {pageContext} activities will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-1.5">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2.5 p-2.5 rounded-md bg-card border hover:bg-muted/50 transition-colors"
            >
              <div className={cn('mt-0.5 flex-shrink-0', getActivityColor(activity.activity_type))}>
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{activity.description}</p>
                {activity.resource_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.resource_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-3.5 w-3.5">
                      <AvatarImage src={activity.userProfile?.avatar_url} />
                      <AvatarFallback className="text-[7px]">
                        {activity.userProfile?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {activity.userProfile?.name || 'Team Member'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
