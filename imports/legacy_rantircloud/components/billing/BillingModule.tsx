import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  CheckCircle, 
  ExternalLink, 
  Download,
  DollarSign,
  FileText,
  Settings,
  Check,
  Calendar,
  Sparkles,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBilling } from '@/hooks/useBilling';
import { useSubscription } from '@/hooks/useSubscription';
import { PaymentMethodCard } from './PaymentMethodCard';
import { cn } from '@/lib/utils';



interface BillingModuleProps {
  workspaceId?: string;
  className?: string;
}

// AI Credit Packs configuration
const creditPacks = Array.from({ length: 8 }, (_, i) => ({
  id: `credit-pack-${i + 1}`,
  tier: i + 1,
  credits: (i + 1) * 200,
  price: 99,
}));

export function BillingModule({ workspaceId, className }: BillingModuleProps) {
  const { 
    loading: billingLoading, 
    currentPlan: dbCurrentPlan, 
    usage, 
    invoices, 
    downloadInvoice,
    openBillingPortal 
  } = useBilling();

  const {
    loading: subLoading,
    subscriptionStatus,
    availablePlans,
    getCurrentPlan,
    createCheckout
  } = useSubscription();

  const { toast } = useToast();
  const loading = billingLoading || subLoading;

  const handleManageBilling = () => {
    openBillingPortal();
  };

  const handleDownloadInvoice = (invoice: any) => {
    downloadInvoice(invoice.id);
  };

  const handleSubscribe = async (priceId: string) => {
    await createCheckout(priceId);
  };

  const handlePurchaseCredits = () => {
    window.open('https://calendly.com/rantir/30min', '_blank');
    toast({
      title: "Scheduling Call",
      description: "Opening Calendly to purchase AI credit packs.",
    });
  };

  const currentPlan = getCurrentPlan();
  const isSubscribed = subscriptionStatus.subscribed;

  const renderUsageCard = () => {
    if (!usage) return null;
    
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b bg-muted/30 text-sm font-medium">
              <span>Resource</span>
              <span>Usage</span>
              <span className="text-right">Status</span>
            </div>
            
            {/* Usage items */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b items-center">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                  {usage.storage.used > 0 && (
                    <div 
                      className="w-2 h-2 bg-primary rounded-full" 
                      style={{ opacity: Math.min(usage.storage.used / usage.storage.limit, 1) }}
                    />
                  )}
                </div>
                <span className="font-medium">Storage</span>
              </div>
              <span className="text-muted-foreground">{usage.storage.used.toFixed(1)} / {usage.storage.limit} {usage.storage.unit}</span>
              <div className="text-right">
                <span className={`text-sm ${usage.storage.used / usage.storage.limit > 0.8 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Math.round((usage.storage.used / usage.storage.limit) * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 border-b items-center">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                  {usage.flows.used > 0 && (
                    <div 
                      className="w-2 h-2 bg-primary rounded-full" 
                      style={{ opacity: Math.min(usage.flows.used / usage.flows.limit, 1) }}
                    />
                  )}
                </div>
                <span className="font-medium">Logic Flows</span>
              </div>
              <span className="text-muted-foreground">{usage.flows.used} / {usage.flows.limit} {usage.flows.unit}</span>
              <div className="text-right">
                <span className={`text-sm ${usage.flows.used / usage.flows.limit > 0.8 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Math.round((usage.flows.used / usage.flows.limit) * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 border-b items-center">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                  {usage.apps.used > 0 && (
                    <div 
                      className="w-2 h-2 bg-primary rounded-full" 
                      style={{ opacity: Math.min(usage.apps.used / usage.apps.limit, 1) }}
                    />
                  )}
                </div>
                <span className="font-medium">Applications</span>
              </div>
              <span className="text-muted-foreground">{usage.apps.used} / {usage.apps.limit} {usage.apps.unit}</span>
              <div className="text-right">
                <span className={`text-sm ${usage.apps.used / usage.apps.limit > 0.8 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Math.round((usage.apps.used / usage.apps.limit) * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 border-b-0 items-center">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                  {usage.databases.used > 0 && (
                    <div 
                      className="w-2 h-2 bg-primary rounded-full" 
                      style={{ opacity: Math.min(usage.databases.used / usage.databases.limit, 1) }}
                    />
                  )}
                </div>
                <span className="font-medium">Database Records</span>
              </div>
              <span className="text-muted-foreground">{usage.databases.used.toLocaleString()} / {usage.databases.limit.toLocaleString()} {usage.databases.unit}</span>
              <div className="text-right">
                <span className={`text-sm ${usage.databases.used / usage.databases.limit > 0.8 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Math.round((usage.databases.used / usage.databases.limit) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPlansCard = () => (
    <div className="space-y-8">
      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Subscription Plans</CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </div>
            {isSubscribed && (
              <Button variant="outline" onClick={handleManageBilling}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {availablePlans.map((plan) => {
              const isCurrentPlan = isSubscribed && currentPlan?.id === plan.id;
              const isPopular = plan.id === 'ai-core-access';
              
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative overflow-hidden transition-all",
                    isCurrentPlan && 'border-2 border-primary shadow-lg',
                    isPopular && !isCurrentPlan && 'border-primary shadow-md'
                  )}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-0 right-0">
                      <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <Badge className="absolute top-4 right-4" variant="default">
                      Current Plan
                    </Badge>
                  )}
                  
                  <CardHeader className={cn(isPopular && "pt-8")}>
                    <CardTitle className="text-sm">{plan.name}</CardTitle>
                    <div className="text-2xl font-bold">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleSubscribe(plan.priceId)}
                      >
                        Subscribe for ${plan.price}/mo
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            All plans include a 14-day money-back guarantee
          </p>
        </CardContent>
      </Card>

      {/* AI Credit Packs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Credit Add-ons</CardTitle>
          </div>
          <CardDescription>Boost your AI capabilities with additional credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {creditPacks.map((pack) => (
              <Card 
                key={pack.id} 
                className={cn(
                  "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50",
                  pack.tier === 4 && "border-primary shadow-md"
                )}
              >
                {pack.tier === 4 && (
                  <Badge className="absolute top-2 right-2 bg-primary text-xs">
                    Popular
                  </Badge>
                )}
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Tier {pack.tier}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{pack.credits.toLocaleString()}</span>
                    <span className="text-muted-foreground"> credits</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-2">
                  <div className="text-sm text-muted-foreground">
                    ${pack.price}/pack
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    variant={pack.tier === 4 ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={handlePurchaseCredits}
                  >
                    Add Credits
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Schedule a call to purchase AI credit packs for your account
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderInvoicesCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Billing history</CardTitle>
        <CardDescription>View and download your invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-medium">{invoice.number}</div>
                  <div className="text-sm text-muted-foreground">
                    {invoice.date} • USD ${invoice.amount.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                  {invoice.status === 'paid' ? 'Paid' : invoice.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadInvoice(invoice)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {invoices.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">Loading billing information...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Usage & Overages</span>
            <span className="sm:hidden">Usage</span>
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment Methods</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
          <TabsTrigger 
            value="plans" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
          >
            <Settings className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger 
            value="invoices" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
          >
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>
                You are currently on the {currentPlan?.name || 'No Plan'} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{currentPlan?.name || 'No Active Plan'}</h3>
                  <p className="text-2xl font-bold text-primary">
                    ${currentPlan?.price || 0}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </div>
                {isSubscribed && <Badge variant="default">Active</Badge>}
              </div>
              
              {isSubscribed ? (
                <Button onClick={handleManageBilling} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSubscribe(availablePlans[1]?.priceId || '')} 
                  className="w-full"
                >
                  Subscribe Now
                </Button>
              )}
            </CardContent>
          </Card>
          {renderUsageCard()}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentMethodCard />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {renderPlansCard()}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          {renderInvoicesCard()}
        </TabsContent>
      </Tabs>
    </div>
  );
}