import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export function SubscriptionDebug() {
  const { subscriptionStatus, getCurrentPlan, forceRefresh, syncWithEnterprise, loading } = useSubscription();
  const currentPlan = getCurrentPlan();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Subscription Debug Info
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncWithEnterprise(false)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Enterprise
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div><strong>Subscribed:</strong> {subscriptionStatus.subscribed ? 'Yes' : 'No'}</div>
          <div><strong>Product ID:</strong> {subscriptionStatus.product_id || 'None'}</div>
          <div><strong>Subscription End:</strong> {subscriptionStatus.subscription_end || 'None'}</div>
          <div><strong>Current Plan ID:</strong> {currentPlan.id}</div>
          <div><strong>Current Plan Name:</strong> {currentPlan.name}</div>
          <div><strong>Current Plan Price:</strong> ${currentPlan.price}</div>
          <div><strong>Expected Match:</strong> 
            {subscriptionStatus.product_id === 'prod_T7uprf8xKAmUQf' ? 
              'Should be "Enterprise" ($3999)' : 
              'Not the Enterprise product ID'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}