import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Users, CheckCircle } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import { supabase } from '@/integrations/supabase/client';
import type { WorkspacePlan, WorkspaceMember } from '@/types/enterprise';

interface PlanCardProps {
  workspaceId: string;
}

export function PlanCard({ workspaceId }: PlanCardProps) {
  const [plan, setPlan] = useState<WorkspacePlan | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlanData();

    // Set up realtime subscription for workspace members changes
    const membersChannel = supabase
      .channel('workspace-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          console.log('Workspace members changed, reloading...');
          loadPlanData();
        }
      )
      .subscribe();

    // Set up realtime subscription for workspace plans changes
    const plansChannel = supabase
      .channel('workspace-plans-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_plans',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          console.log('Workspace plan changed, reloading...');
          loadPlanData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(plansChannel);
    };
  }, [workspaceId]);

  const loadPlanData = async () => {
    try {
      setLoading(true);
      const [planData, membersData] = await Promise.all([
        enterpriseService.getWorkspacePlan(workspaceId),
        enterpriseService.getWorkspaceMembers(workspaceId)
      ]);
      
      console.log('PlanCard - Full plan data:', planData);
      console.log('PlanCard - Members:', membersData);
      console.log('PlanCard - Members count:', membersData.length);
      console.log('PlanCard - Plan seats:', planData?.seats);
      
      setPlan(planData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading plan details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No plan found</p>
        </CardContent>
      </Card>
    );
  }

  const seatUsage = (members.length / plan.seats) * 100;
  const renewalDate = plan.current_period_end ? new Date(plan.current_period_end) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">Current Plan</h2>
          <p className="text-muted-foreground">
            Your enterprise subscription details
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Plan Management
        </Badge>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">{plan.billing_plans?.name || 'No Plan'}</h3>
              <p className="text-xs text-muted-foreground">
                {plan.billing_plans?.price === 0 ? 'Free Plan' : `$${Number(plan.billing_plans?.price).toFixed(0)}/monthly`}
              </p>
            </div>
            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {plan.status}
            </Badge>
          </div>

          {/* Seat Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Team Seats
              </span>
              <span>{members.length} / {plan.seats}</span>
            </div>
            <Progress value={seatUsage} className="h-1.5" />
          </div>

          {/* Renewal Info */}
          {renewalDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Renews on {renewalDate.toLocaleDateString()}</span>
            </div>
          )}

          {/* Features */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Plan Features:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {Array.isArray(plan.billing_plans?.features) && plan.billing_plans.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {String(feature)}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" className="text-xs">
              Manage Plan
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              Upgrade
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}