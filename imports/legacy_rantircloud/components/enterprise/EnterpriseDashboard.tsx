import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnterpriseBadge } from '@/components/EnterpriseBadge';
import { WorkspaceDetailsCard } from './WorkspaceDetailsCard';
import { PlanCard } from './PlanCard';
import { TeamMembersCard } from './TeamMembersCard';
import { ApiKeysCard } from './ApiKeysCard';
import { AccessSummaryCard } from './AccessSummaryCard';
import { BillingPlanCard } from './BillingPlanCard';
import { NodeDevelopmentGuide } from './NodeDevelopmentGuide';
import { enterpriseService } from '@/services/enterpriseService';
import { workspaceService } from '@/services/workspaceService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Key, CreditCard, Code, FileText, Database, Zap, Calendar, ExternalLink, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { CustomNodesCard } from './CustomNodesCard';
import { CustomTemplatesAndComponentsCard } from './CustomTemplatesAndComponentsCard';
import { CustomDataSetsCard } from './CustomDataSetsCard';
import { CustomServicesCard } from './CustomServicesCard';
import { WorkspaceCustomizationCard } from './WorkspaceCustomizationCard';
import { EnterpriseInfoCard } from './EnterpriseInfoCard';


type EnterpriseTab = 'overview' | 'services' | 'team' | 'api-keys' | 'billing' | 'custom-nodes' | 'templates' | 'data';

export function EnterpriseDashboard() {
  console.log('EnterpriseDashboard component rendering - this should only show on /enterprise');
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [isUserEnterprise, setIsUserEnterprise] = useState(false);
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<EnterpriseTab>('overview');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, workspaceId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all workspaces the user is a member of (for workspace switcher)
      if (user) {
        // Get workspace IDs the user is a member of
        const { data: memberData } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id);
        
        if (memberData && memberData.length > 0) {
          const workspaceIds = memberData.map(m => m.workspace_id);
          
          // Fetch the actual workspace details
          const { data: workspacesList, error: workspacesError } = await supabase
            .from('workspaces')
            .select('id, name, icon_url, is_enterprise')
            .in('id', workspaceIds);
          
          console.log('Workspaces list:', { workspacesList, workspacesError });
          
          if (workspacesList) {
            setUserWorkspaces(workspacesList);
          }
        }
      }

      // Resolve workspace ID
      let resolvedWorkspaceId = workspaceId || null;
      let workspaceData = workspace;

      if (!resolvedWorkspaceId) {
        workspaceData = await workspaceService.getCurrentWorkspace();
        setWorkspace(workspaceData);
        resolvedWorkspaceId = workspaceData?.id || null;
      } else if (!workspace) {
        // Load workspace details for header if not already loaded
        const ws = await workspaceService.getCurrentWorkspace();
        setWorkspace(ws);
      }

      if (!resolvedWorkspaceId) {
        throw new Error('No workspace selected.');
      }
      
      // Check if workspace is enterprise
      const enterpriseStatus = await enterpriseService.checkIsEnterprise(resolvedWorkspaceId);
      setIsEnterprise(enterpriseStatus);
      
      // Check if user is enterprise member
      const userEnterpriseStatus = await enterpriseService.checkUserIsEnterprise(user!.id, resolvedWorkspaceId);
      setIsUserEnterprise(userEnterpriseStatus);
      
      if (!enterpriseStatus && !userEnterpriseStatus) {
        toast({
          title: "Access Denied",
          description: "This workspace is not enterprise enabled or you don't have enterprise access.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load enterprise dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSwitch = async (newWorkspaceId: string) => {
    try {
      await workspaceService.setCurrentWorkspace(newWorkspaceId);
      // Force a full reload to refresh all workspace-dependent data
      window.location.reload();
    } catch (error) {
      console.error('Error switching workspace:', error);
      toast({
        title: "Error",
        description: "Failed to switch workspace.",
        variant: "destructive",
      });
    }
  };

  const handleUpgrade = async () => {
    try {
      const currentId = (workspaceId || workspace?.id) as string;
      if (!currentId) {
        throw new Error('No workspace selected.');
      }
      const apiKey = await enterpriseService.upgradeWorkspace(currentId);
      toast({
        title: "Workspace Upgraded!",
        description: `Your API key: ${apiKey} (save this - it won't be shown again)`,
      });
      await loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isEnterprise && !isUserEnterprise) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Upgrade to Enterprise
            </CardTitle>
            <CardDescription>
              Unlock advanced features with Rantir Enterprise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Enterprise features include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>API Access with custom keys</li>
                <li>Priority Support</li>
                <li>Advanced Analytics</li>
                <li>Custom Integrations</li>
                <li>Team Member Management</li>
                <li>Development Guide & Documentation</li>
              </ul>
              <Button 
                onClick={() => handleUpgrade()}
                className="w-full"
              >
                Upgrade to Enterprise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const sidebarItems = [
    { id: 'overview' as EnterpriseTab, label: 'Overview', icon: Building2 },
    { id: 'services' as EnterpriseTab, label: 'Services', icon: Calendar },
    { id: 'team' as EnterpriseTab, label: 'Team', icon: Users },
    { id: 'api-keys' as EnterpriseTab, label: 'API Keys', icon: Key },
    { id: 'billing' as EnterpriseTab, label: 'Billing', icon: CreditCard },
    { id: 'custom-nodes' as EnterpriseTab, label: 'Custom Nodes', icon: Code },
    { id: 'templates' as EnterpriseTab, label: 'Templates', icon: FileText },
    { id: 'data' as EnterpriseTab, label: 'Data', icon: Database },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WorkspaceDetailsCard workspace={workspace} />
              <PlanCard workspaceId={workspace?.id || ''} />
            </div>
            <WorkspaceCustomizationCard workspaceId={workspace?.id || ''} />
            <AccessSummaryCard workspaceId={workspace?.id || ''} />
          </div>
        );
      case 'services':
        return <CustomServicesCard workspaceId={workspace?.id || ''} />;
      case 'team':
        return <TeamMembersCard workspaceId={workspace?.id || ''} />;
      case 'api-keys':
        return <ApiKeysCard workspaceId={workspace?.id || ''} />;
      case 'billing':
        return <BillingPlanCard workspaceId={workspace?.id || ''} />;
      case 'custom-nodes':
        return <CustomNodesCard workspaceId={workspace?.id || ''} />;
      case 'templates':
        return <CustomTemplatesAndComponentsCard workspaceId={workspace?.id || ''} />;
      case 'data':
        return <CustomDataSetsCard workspaceId={workspace?.id || ''} />;
      default:
        return null;
    }
  };

  return (
    <div className="ui-compact bg-rc-bg min-h-screen w-full">
      <div className="max-w-[1200px] mx-auto p-4 pt-8 space-y-4">
        {/* Header with dot grid background */}
        <div className="dot-grid-bg p-6 rounded-lg mb-4 relative" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 mb-4">
            {workspace?.icon_url ? (
              <img 
                src={workspace.icon_url} 
                alt={workspace.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 font-semibold">
                {workspace?.name?.substring(0, 2).toUpperCase() || 'EW'}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-sm font-medium text-foreground">{workspace?.name || 'Enterprise Workspace'}</h2>
              <p className="text-xs text-muted-foreground">Enterprise workspace with advanced features</p>
            </div>
            <EnterpriseBadge />
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-tiempos font-light text-foreground mb-2">Enterprise Dashboard</h1>
              <p className="text-muted-foreground mb-4">
                Manage your enterprise workspace, team members, API keys, and billing.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://www.rantir.com/enterprise', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Learn About Your Enterprise Plan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://www.rantir.com/licensing', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Licensing
                </Button>
              </div>
            </div>
            
            <div className="ml-8">
              <EnterpriseInfoCard />
            </div>
          </div>
        </div>

        {/* Content with sidebar */}
        <div className="flex gap-6">
          {/* Tab sidebar */}
          <div className="w-48 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}