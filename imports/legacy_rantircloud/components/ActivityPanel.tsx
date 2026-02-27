import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Database, 
  Table2,
  Activity,
  Workflow,
  Globe,
  Upload,
  FileText,
  Folder,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  X,
  Sparkles,
  Search
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { activityService, UserActivity } from '@/services/activityService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityItem {
  id: string;
  type: string;
  timestamp: string;
  user?: string;
  description: string;
  metadata?: any;
  userProfile?: {
    name?: string;
    avatar_url?: string;
  };
}

interface ActivityPanelProps {
  activities?: ActivityItem[];
  className?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    // Database/Table activities - Database icon
    case 'record_created':
    case 'record_updated':
    case 'record_deleted':
    case 'database_created':
    case 'database_updated':
    case 'database_deleted':
    case 'table_created':
    case 'table_updated':
    case 'table_deleted':
      return Database;
    // Flow activities - Workflow icon
    case 'flow_created':
    case 'flow_executed':
    case 'flow_updated':
    case 'flow_deleted':
    case 'node_added':
    case 'node_updated':
    case 'node_removed':
      return Workflow;
    // App activities - Globe icon
    case 'app_created':
    case 'app_published':
    case 'app_updated':
    case 'app_deleted':
      return Globe;
    // Document activities - FileText icon
    case 'document_created':
    case 'document_updated':
    case 'document_deleted':
      return FileText;
    case 'file_uploaded':
      return Upload;
    case 'folder_created':
      return Folder;
    // Search - Search with stars concept (use Sparkles)
    case 'search_performed':
      return Search;
    // AI/Generation activities - Sparkles
    case 'ai_chat_started':
    case 'ai_chat_message':
    case 'project_created':
      return Sparkles;
    // Settings/User activities
    case 'settings_updated':
    case 'password_changed':
    case 'profile_updated':
      return User;
    // Cloud activities
    case 'cloud_project_created':
    case 'cloud_project_updated':
      return Globe;
    default:
      return Activity;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    // Database/Table activities - Yellow
    case 'record_created':
    case 'record_updated':
    case 'record_deleted':
    case 'database_created':
    case 'database_updated':
    case 'database_deleted':
    case 'table_created':
    case 'table_updated':
    case 'table_deleted':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
    // Flow activities - Purple
    case 'flow_created':
    case 'flow_executed':
    case 'flow_updated':
    case 'flow_deleted':
    case 'node_added':
    case 'node_updated':
    case 'node_removed':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
    // App activities - Blue
    case 'app_created':
    case 'app_published':
    case 'app_updated':
    case 'app_deleted':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    // Document activities - Keep default/neutral
    case 'document_created':
    case 'document_updated':
    case 'document_deleted':
    case 'file_uploaded':
    case 'folder_created':
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    // Search - Grey with stars concept
    case 'search_performed':
      return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
    // AI/Generation activities - Grey with sparkles
    case 'ai_chat_started':
    case 'ai_chat_message':
    case 'project_created':
      return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
    // Settings/User activities - Grey
    case 'settings_updated':
    case 'password_changed':
    case 'profile_updated':
      return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
    // Cloud activities
    case 'cloud_project_created':
    case 'cloud_project_updated':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
  }
};

// Filter to show only content-related activities
const isContentActivity = (type: string) => {
  const contentTypes = [
    // Project activities
    'database_created', 'database_updated', 'database_deleted',
    'table_created', 'table_updated', 'table_deleted',
    'record_created', 'record_updated', 'record_deleted',

    // Flow activities
    'flow_created', 'flow_updated', 'flow_deleted', 'flow_executed',
    'node_added', 'node_updated', 'node_removed',

    // App activities
    'app_created', 'app_updated', 'app_deleted', 'app_published',

    // Document & file activities
    'document_created', 'document_updated', 'document_deleted',
    'file_uploaded', 'file_deleted', 'file_shared', 'folder_created',


    // AI activities
    'ai_chat_started', 'ai_chat_message',

    // Search activities
    'search_performed',

    // Settings activities
    'settings_updated', 'password_changed', 'profile_updated',

    // Cloud activities
    'cloud_project_created', 'cloud_project_updated',
  ];

  return contentTypes.includes(type);
};

export function ActivityPanel({ className }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeAgo, setTimeAgo] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const itemsPerPage = 10;
  const modalItemsPerPage = 20;
  const { user } = useAuth();

  // Cache for user profiles
  const [profileCache, setProfileCache] = useState<Record<string, { name?: string; avatar_url?: string }>>({});

  // Load workspace-wide activities on mount
  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }
    
    const loadActivities = async () => {
      setLoading(true);
      try {
        // Get workspace-wide activities (all users in workspace)
        // Exclude auth events so they don't crowd out meaningful activity.
        const workspaceActivities = await activityService.getWorkspaceActivities(2000, {
          includeAuthEvents: false,
        });

        // Filter to only content-related activities
        const contentActivities = workspaceActivities.filter((activity: UserActivity) =>
          isContentActivity(activity.activity_type)
        );

        // Get unique user IDs from activities we will display
        const userIds = [...new Set(contentActivities.map((a) => a.user_id))];

        // Fetch profiles for all users (only those we display)
        const { data: profiles } = userIds.length
          ? await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', userIds)
          : { data: [] as any[] };

        // Build profile cache
        const newProfileCache: Record<string, { name?: string; avatar_url?: string }> = {};
        profiles?.forEach((profile) => {
          newProfileCache[profile.id] = {
            name: profile.name || undefined,
            avatar_url: profile.avatar_url || undefined,
          };
        });
        setProfileCache(newProfileCache);

        const formattedActivities: ActivityItem[] = contentActivities.map((activity: UserActivity) => ({
          id: activity.id,
          type: activity.activity_type,
          timestamp: activity.created_at,
          user: activity.user_id === user.id ? 'You' : (newProfileCache[activity.user_id]?.name || 'Team Member'),
          description: activity.description,
          metadata: activity.metadata,
          userProfile: newProfileCache[activity.user_id] || undefined,
        }));

        setActivities(formattedActivities);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [user]);

  // Subscribe to real-time workspace-wide updates
  useEffect(() => {
    if (!user) return;

    let channel: any = null;

    const setupSubscription = async () => {
      channel = await activityService.subscribeToWorkspaceActivities(async (newActivity: UserActivity) => {
        // Only add content-related activities
        if (!isContentActivity(newActivity.activity_type)) return;
        
        // Get or fetch profile for this user
        let userProfile = profileCache[newActivity.user_id];
        if (!userProfile) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', newActivity.user_id)
            .single();
          
          userProfile = profile || undefined;
          if (profile) {
            setProfileCache(prev => ({
              ...prev,
              [newActivity.user_id]: { name: profile.name || undefined, avatar_url: profile.avatar_url || undefined }
            }));
          }
        }
        
        const formattedActivity: ActivityItem = {
          id: newActivity.id,
          type: newActivity.activity_type,
          timestamp: newActivity.created_at,
          user: newActivity.user_id === user.id ? 'You' : (userProfile?.name || 'Team Member'),
          description: newActivity.description,
          metadata: newActivity.metadata,
          userProfile
        };
        setActivities(prev => [formattedActivity, ...prev.slice(0, 499)]);
      });
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, profileCache]);

  useEffect(() => {
    const updateTimeAgo = () => {
      const newTimeAgo: Record<string, string> = {};
      activities.forEach(activity => {
        newTimeAgo[activity.id] = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
      });
      setTimeAgo(newTimeAgo);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activities]);

  const handleExport = () => {
    try {
      const csvContent = [
        ['Activity', 'User', 'Date', 'Time'],
        ...activities.map(activity => [
          activity.description,
          activity.userProfile?.name || 'You',
          new Date(activity.timestamp).toLocaleDateString(),
          new Date(activity.timestamp).toLocaleTimeString()
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Activities exported successfully');
    } catch (error) {
      toast.error('Failed to export activities');
    }
  };

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const paginatedActivities = activities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const modalTotalPages = Math.ceil(activities.length / modalItemsPerPage);
  const modalPaginatedActivities = activities.slice(
    (modalPage - 1) * modalItemsPerPage,
    modalPage * modalItemsPerPage
  );

  // Group activities by date
  const groupActivitiesByDate = (items: ActivityItem[]) => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    const groupMap = new Map<string, ActivityItem[]>();
    
    items.forEach(activity => {
      const date = new Date(activity.timestamp);
      let label: string;
      
      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else if (isThisWeek(date)) {
        label = format(date, 'EEEE'); // Day name
      } else if (isThisMonth(date)) {
        label = format(date, 'MMMM d');
      } else {
        label = format(date, 'MMMM d, yyyy');
      }
      
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
      }
      groupMap.get(label)!.push(activity);
    });
    
    groupMap.forEach((items, label) => {
      groups.push({ label, items });
    });
    
    return groups;
  };

  const ActivityList = ({ items, showUser = false }: { items: ActivityItem[], showUser?: boolean }) => (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[16px] top-0 bottom-0 w-px bg-border" />
      
      {items.map((activity) => {
        const Icon = getActivityIcon(activity.type);
        
        return (
          <div 
            key={activity.id} 
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            {/* Icon */}
            <div className={cn(
              "relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 border-background",
              getActivityColor(activity.type)
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-foreground font-medium">
                  {activity.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={activity.userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {activity.userProfile?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{activity.userProfile?.name || 'You'}</span>
                </div>
                <span>•</span>
                <span>{timeAgo[activity.id] || 'Just now'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const GroupedActivityList = ({ items }: { items: ActivityItem[] }) => {
    const groups = groupActivitiesByDate(items);
    
    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-2 mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h4>
            </div>
            <ActivityList items={group.items} showUser />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className={cn("ui-compact", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Activity</h3>
            {activities.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activities.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    disabled={activities.length === 0}
                    className="h-7 w-7 p-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export activities</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllModal(true)}
                    className="h-7 w-7 p-0"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View all activity</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <ScrollArea className="h-64">
          <div className="relative">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm">Loading activities...</p>
              </div>
            ) : !user ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Please log in to view activity</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Start creating content to see activity!</p>
              </div>
            ) : (
              <ActivityList items={paginatedActivities} />
            )}
          </div>
        </ScrollArea>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* All Activity Modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                All Workspace Activity
                <Badge variant="secondary" className="ml-2">{activities.length}</Badge>
              </DialogTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExport}
                      className="h-8 w-8 p-0 mr-1.5"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export activities</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No activity recorded yet</p>
                </div>
              ) : (
                <GroupedActivityList items={modalPaginatedActivities} />
              )}
            </div>
          </ScrollArea>
          
          {/* Modal Pagination */}
          {modalTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                Showing {(modalPage - 1) * modalItemsPerPage + 1}-{Math.min(modalPage * modalItemsPerPage, activities.length)} of {activities.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPage(p => Math.max(1, p - 1))}
                  disabled={modalPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                  disabled={modalPage === modalTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}