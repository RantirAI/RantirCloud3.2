import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingCard } from '@/components/billing/PricingCard';
import { AICreditPacks } from '@/components/billing/AICreditPacks';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function SelectPlan() {
  const { user, loading: authLoading } = useAuth();
  const { availablePlans, subscriptionStatus, loading: subLoading, forceRefresh } = useSubscription();
  const navigate = useNavigate();
  const [canRedirect, setCanRedirect] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Wait a bit before allowing redirects to prevent loops
    if (!authLoading && !subLoading) {
      const timer = setTimeout(() => setCanRedirect(true), 500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, subLoading, user, navigate]);

  useEffect(() => {
    // Only redirect if we're ready and have a paid subscription
    if (canRedirect && subscriptionStatus.subscribed && subscriptionStatus.product_id) {
      navigate('/');
    }
  }, [canRedirect, subscriptionStatus.subscribed, subscriptionStatus.product_id, navigate]);

  const handleRefresh = async () => {
    await forceRefresh();
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground">
              Select a subscription to access the Rantir Cloud platform
            </p>
          </div>

          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Welcome to Rantir Cloud! 🚀</span>
                <button
                  onClick={handleRefresh}
                  className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={subLoading}
                >
                  {subLoading ? 'Checking...' : 'Check Subscription'}
                </button>
              </CardTitle>
              <CardDescription>
                Choose a plan that fits your needs. All plans include full platform access.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {availablePlans.map((plan) => (
              <PricingCard
                key={plan.id}
                planId={plan.id}
                name={plan.name}
                price={plan.price}
                priceId={plan.priceId}
                features={plan.features}
                isPopular={plan.id === 'ai-core-access'}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day money-back guarantee
            </p>
          </div>

          <Separator className="my-12" />

          <AICreditPacks />
        </div>
      </div>
    </div>
  );
}
