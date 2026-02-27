import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
}

interface UsageMetrics {
  storage: { used: number; limit: number; unit: string };
  flows: { used: number; limit: number; unit: string };
  apps: { used: number; limit: number; unit: string };
  databases: { used: number; limit: number; unit: string };
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

export function useBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<BillingPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Get user's current workspace and billing plan
      const { data: userSettings, error: userSettingsError } = await supabase
        .from('user_settings')
        .select('current_workspace_id')
        .eq('id', user?.id)
        .maybeSingle();

      console.log('Loading billing data for user:', user?.id);
      console.log('User settings:', userSettings, userSettingsError);

      let currentBillingPlan = null;
      let planLimits = {
        storage_limit_gb: 6,
        max_databases: 10,
        max_flows: 10,
        max_apps: 5,
        max_records_per_db: 1000000
      };

      if (userSettings?.current_workspace_id) {
        // Get the workspace plan with billing plan limits
        const { data: workspacePlan, error: workspacePlanError } = await supabase
          .from('workspace_plans')
          .select('plan_id')
          .eq('workspace_id', userSettings.current_workspace_id)
          .maybeSingle();

        console.log('Workspace plan query:', workspacePlan, workspacePlanError);

        // Then get the billing plan details with limits
        if (workspacePlan?.plan_id) {
          const { data: billingPlan, error: billingPlanError } = await supabase
            .from('billing_plans')
            .select('id, name, price, interval, features, storage_limit_gb, max_databases, max_flows, max_apps, max_records_per_db')
            .eq('id', workspacePlan.plan_id)
            .maybeSingle();

          console.log('Billing plan query:', billingPlan, billingPlanError);

          if (billingPlan) {
            currentBillingPlan = {
              id: billingPlan.id,
              name: billingPlan.name,
              price: Number(billingPlan.price),
              interval: billingPlan.interval as 'month' | 'year',
              features: Array.isArray(billingPlan.features) ? billingPlan.features : []
            };
            console.log('Final billing plan to set:', currentBillingPlan);
            
            // Extract limits from billing plan
            planLimits = {
              storage_limit_gb: (billingPlan as any).storage_limit_gb || 6,
              max_databases: (billingPlan as any).max_databases || 10,
              max_flows: (billingPlan as any).max_flows || 10,
              max_apps: (billingPlan as any).max_apps || 5,
              max_records_per_db: (billingPlan as any).max_records_per_db || 1000000
            };
          }
        }
      }

      // Get REAL storage usage from Supabase Storage
      const { data: storageUsed } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: user?.id
      });

      // Get REAL project counts
      const { data: databaseCount } = await supabase.rpc('get_user_database_count', {
        user_uuid: user?.id
      });
      const { data: flowCount } = await supabase.rpc('get_user_flow_count', {
        user_uuid: user?.id
      });
      const { data: appCount } = await supabase.rpc('get_user_app_count', {
        user_uuid: user?.id
      });

      // Calculate usage metrics with REAL data
      const usageMetrics: UsageMetrics = {
        storage: {
          used: storageUsed || 0,
          limit: planLimits.storage_limit_gb,
          unit: 'GB'
        },
        flows: {
          used: flowCount || 0,
          limit: planLimits.max_flows,
          unit: 'flows'
        },
        apps: {
          used: appCount || 0,
          limit: planLimits.max_apps,
          unit: 'apps'
        },
        databases: {
          used: databaseCount || 0,
          limit: planLimits.max_databases,
          unit: 'databases'
        }
      };

      setUsage(usageMetrics);

      // Set current plan from database or fallback to Personal
      setCurrentPlan(currentBillingPlan || {
        id: 'personal',
        name: 'Personal',
        price: 0,
        interval: 'month',
        features: [
          '6GB Storage',
          '10 Logic Flows',
          '5 Applications',
          '1M Database Records',
          'Community Support'
        ]
      });

      // Load available billing plans from database
      const { data: billingPlansData, error: billingPlansError } = await supabase
        .from('billing_plans')
        .select('id, name, price, interval, features, is_active')
        .eq('is_active', true)
        .order('price', { ascending: true });

      console.log('Available billing plans:', billingPlansData, billingPlansError);

      if (billingPlansData && !billingPlansError) {
        const formattedPlans = billingPlansData.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          interval: plan.interval as 'month' | 'year',
          features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
          isPopular: plan.name.toLowerCase().includes('professional') || plan.name.toLowerCase().includes('enterprise_lite')
        }));
        setAvailablePlans(formattedPlans);
      } else {
        // Fallback to default plans if database query fails
        setAvailablePlans([
          {
            id: 'personal',
            name: 'Personal',
            price: 0,
            interval: 'month',
            features: [
              '6GB Storage',
              '10 Logic Flows',
              '5 Applications',
              '1M Database Records',
              'Community Support'
            ]
          }
        ]);
      }

      // For invoices, we'll use mock data since we don't have a proper billing system yet
      // In production, this would come from Stripe or another payment processor
      setInvoices([]);

    } catch (error) {
      console.error('Error loading billing data:', error);
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
      // In a real app, this would integrate with Stripe or another payment processor
      toast({
        title: 'Plan Upgrade',
        description: 'Redirecting to payment processor...'
      });
      
      // Mock successful upgrade
      setTimeout(() => {
        const newPlan = availablePlans.find(p => p.id === planId);
        if (newPlan) {
          setCurrentPlan(newPlan);
          toast({
            title: 'Plan Upgraded',
            description: `Successfully upgraded to ${newPlan.name} plan.`
          });
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: 'Upgrade Failed',
        description: 'Failed to upgrade plan. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      // In a real app, this would download the actual invoice PDF
      toast({
        title: 'Downloading Invoice',
        description: 'Your invoice is being prepared for download...'
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download invoice. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const openBillingPortal = async () => {
    console.log('[useBilling] openBillingPortal called');
    try {
      console.log('[useBilling] Invoking customer-portal function');
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      console.log('[useBilling] Function response:', { data, error });
      
      if (error) {
        console.error('[useBilling] Error from function:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log('[useBilling] Opening portal URL:', data.url);
        // Open Stripe Customer Portal in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Opening Billing Portal",
          description: "View your invoices and manage billing in the Stripe portal.",
        });
      } else {
        console.error('[useBilling] No URL in response data:', data);
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('[useBilling] Error opening billing portal:', error);
      toast({
        title: 'Portal Error',
        description: error instanceof Error ? error.message : 'Failed to open billing portal. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    currentPlan,
    availablePlans,
    usage,
    invoices,
    upgradePlan,
    downloadInvoice,
    openBillingPortal,
    refetch: loadBillingData
  };
}