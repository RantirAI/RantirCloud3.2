import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, DollarSign, Settings, FileText, Users, CheckCircle, ArrowUp } from 'lucide-react';
import { useEnterpriseBilling } from '@/hooks/useEnterpriseBilling';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingCard } from '@/components/billing/PricingCard';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';


interface BillingPlanCardProps {
  workspaceId: string;
}

export function BillingPlanCard({ workspaceId }: BillingPlanCardProps) {
  const {
    loading: enterpriseLoading,
    workspacePlan,
    members,
    usage,
    openBillingPortal
  } = useEnterpriseBilling(workspaceId);

  const { 
    loading: subscriptionLoading, 
    subscriptionStatus, 
    availablePlans: stripePlans, 
    getCurrentPlan 
  } = useSubscription();

  const loading = enterpriseLoading || subscriptionLoading;
  const currentPlan = getCurrentPlan();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Loading enterprise billing information...</div>
        </CardContent>
      </Card>
    );
  }

  const renderCurrentPlan = () => {
    if (!workspacePlan || !workspacePlan.billing_plans) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Active Plan</CardTitle>
            <CardDescription>No billing plan found for this workspace</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const plan = workspacePlan.billing_plans;
    const seatUsage = (members.length / workspacePlan.seats) * 100;
    const renewalDate = workspacePlan.current_period_end ? new Date(workspacePlan.current_period_end) : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Enterprise Plan</CardTitle>
          <CardDescription>
            Your active subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary">
                ${plan.price === 0 ? '0' : Number(plan.price).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </p>
            </div>
            <Badge variant={workspacePlan.status === 'active' ? 'default' : 'secondary'}>
              {workspacePlan.status}
            </Badge>
          </div>

          {/* Seat Usage */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Team Seats
              </span>
              <span>{members.length} / {workspacePlan.seats}</span>
            </div>
            <Progress value={seatUsage} className="h-2" />
          </div>

          {/* Renewal Info */}
          {renewalDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>Renews on {renewalDate.toLocaleDateString()}</span>
            </div>
          )}

          {/* Features */}
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium">Plan Features:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {String(feature)}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={openBillingPortal} className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Manage Billing
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderUsage = () => {
    if (!usage) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage & Limits</CardTitle>
          <CardDescription>Monitor your workspace resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Storage</span>
                <span>{usage.storage.used} / {usage.storage.limit} {usage.storage.unit}</span>
              </div>
              <Progress 
                value={(usage.storage.used / usage.storage.limit) * 100} 
                className="h-2" 
              />
            </div>

            {/* API Calls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">API Calls</span>
                <span>{usage.apiCalls.used.toLocaleString()} / {usage.apiCalls.limit.toLocaleString()} {usage.apiCalls.unit}</span>
              </div>
              <Progress 
                value={(usage.apiCalls.used / usage.apiCalls.limit) * 100} 
                className="h-2" 
              />
            </div>

            {/* Seats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Team Seats</span>
                <span>{usage.seats.used} / {usage.seats.limit} {usage.seats.unit}</span>
              </div>
              <Progress 
                value={(usage.seats.used / usage.seats.limit) * 100} 
                className="h-2" 
              />
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Active Projects</span>
                <span>{usage.projects.used} / {usage.projects.limit} {usage.projects.unit}</span>
              </div>
              <Progress 
                value={(usage.projects.used / usage.projects.limit) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAvailablePlans = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Enterprise Subscription Plans</h2>
        <p className="text-muted-foreground">
          Choose the right plan for your enterprise needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stripePlans.map((plan, index) => {
          // More precise logic for determining current plan
          let isCurrentPlan = false;
          
          if (subscriptionStatus.subscribed && subscriptionStatus.product_id) {
            // User is definitely subscribed - match by product ID
            isCurrentPlan = plan.productId === subscriptionStatus.product_id;
          } else if (plan.price === 0 && !subscriptionStatus.subscribed && !subscriptionStatus.product_id) {
            // Only show free plan as current if explicitly unsubscribed with no product ID
            isCurrentPlan = true;
          }
          
          return (
            <PricingCard
              key={plan.id}
              planId={plan.id}
              name={plan.name}
              price={plan.price}
              priceId={plan.priceId}
              features={plan.features}
              isCurrentPlan={isCurrentPlan}
              isPopular={plan.name === 'Enterprise Starter'} // Mark Enterprise Starter as popular
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Badge variant="outline" className="mb-4">Enterprise Only</Badge>
        <h2 className="text-2xl font-tiempos font-light text-foreground mb-2">
          Billing & Subscription
        </h2>
        <p className="text-muted-foreground">
          Manage your enterprise billing, usage, and subscription plans
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderCurrentPlan()}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {renderUsage()}
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {renderAvailablePlans()}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentMethodCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}