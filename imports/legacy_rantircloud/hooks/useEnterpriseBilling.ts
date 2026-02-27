import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { enterpriseService } from '@/services/enterpriseService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { WorkspacePlan, WorkspaceMember, BillingPlan } from '@/types/enterprise';

interface EnterpriseUsageMetrics {
  storage: { used: number; limit: number; unit: string };
  apiCalls: { used: number; limit: number; unit: string };
  seats: { used: number; limit: number; unit: string };
  projects: { used: number; limit: number; unit: string };
}

export function useEnterpriseBilling(workspaceId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workspacePlan, setWorkspacePlan] = useState<WorkspacePlan | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<EnterpriseUsageMetrics | null>(null);

  useEffect(() => {
    if (workspaceId) {
      loadEnterpriseBillingData();
    }
  }, [workspaceId, user]);

  const loadEnterpriseBillingData = async () => {
    try {
      setLoading(true);
      
      // Load workspace plan, members, and available billing plans
      const [planData, membersData, plansData] = await Promise.all([
        enterpriseService.getWorkspacePlan(workspaceId),
        enterpriseService.getWorkspaceMembers(workspaceId),
        enterpriseService.getBillingPlans()
      ]);
      
      setWorkspacePlan(planData);
      setMembers(membersData);
      setAvailablePlans(plansData);

      // Get REAL storage usage from Supabase Storage
      const { data: storageData } = await supabase.rpc('get_workspace_storage_usage', {
        workspace_uuid: workspaceId
      });

      // Get REAL project count across all workspace members
      const { data: projectCount } = await supabase.rpc('get_workspace_project_count', {
        workspace_uuid: workspaceId
      });

      // Get limits from billing plan
      const plan = planData?.billing_plans as any;
      
      // Calculate enterprise usage metrics with REAL data
      const usageMetrics: EnterpriseUsageMetrics = {
        storage: {
          used: storageData || 0,
          limit: plan?.storage_limit_gb || 50,
          unit: 'GB'
        },
        apiCalls: {
          used: 0, // TODO: Implement API call tracking
          limit: plan?.max_api_calls_monthly || 10000,
          unit: 'calls/month'
        },
        seats: {
          used: membersData.length,
          limit: planData?.seats || 1,
          unit: 'seats'
        },
        projects: {
          used: projectCount || 0,
          limit: (plan?.max_databases || 0) + (plan?.max_flows || 0) + (plan?.max_apps || 0),
          unit: 'projects'
        }
      };

      setUsage(usageMetrics);

    } catch (error) {
      console.error('Error loading enterprise billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const upgradePlan = async (planId: string) => {
    try {
      // TODO: Implement plan upgrade via Stripe or billing system
      toast({
        title: 'Plan Upgrade',
        description: 'Redirecting to billing portal for plan upgrade...'
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: 'Upgrade Failed',
        description: 'Failed to upgrade plan. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const openBillingPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe Customer Portal in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Opening Billing Portal",
          description: "View your invoices and manage billing in the Stripe portal.",
        });
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: 'Portal Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    workspacePlan,
    members,
    availablePlans,
    usage,
    upgradePlan,
    openBillingPortal,
    refetch: loadEnterpriseBillingData
  };
}