import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, RefreshCw, Bug, Loader2, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DebugSubscription } from '@/components/billing/DebugSubscription';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [syncMessage, setSyncMessage] = useState('Syncing your subscription...');
  const [isRetrying, setIsRetrying] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user || !session || !sessionId) {
      return;
    }

    const syncSubscription = async () => {
      try {
        setSyncStatus('loading');
        setSyncMessage('Syncing your subscription with enterprise billing...');

        // Wait a moment for Stripe to fully process the subscription
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync with enterprise system
        const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error syncing with enterprise:', error);
          setSyncStatus('error');
          setSyncMessage('Failed to sync with enterprise billing system. You can manually sync later.');
          toast({
            title: 'Sync Warning',
            description: 'Your subscription is active, but enterprise sync failed. You can manually sync in settings.',
            variant: 'default'
          });
        } else {
          setSyncStatus('success');
          setSyncMessage('Your subscription has been activated and synced successfully!');
          toast({
            title: 'Subscription Active!',
            description: 'Your subscription is now active and enterprise billing is synced.',
            variant: 'default'
          });
        }
      } catch (error) {
        console.error('Error during sync:', error);
        setSyncStatus('error');
        setSyncMessage('Sync failed, but your subscription is active. You can manually sync later.');
      }
    };

    syncSubscription();
  }, [user, session, sessionId, toast]);

  const handleManualSync = async () => {
    if (!session) return;
    
    try {
      setIsRetrying(true);
      setSyncMessage('Attempting manual sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setSyncStatus('error');
        setSyncMessage('Manual sync failed. Please try again later.');
      } else {
        setSyncStatus('success');
        setSyncMessage('Manual sync completed successfully!');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Manual sync failed. Please try again later.');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="container mx-auto py-16">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              {syncStatus === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {syncStatus === 'success' && <CheckCircle className="h-8 w-8 text-green-600" />}
              {syncStatus === 'error' && <AlertCircle className="h-8 w-8 text-yellow-500" />}
            </div>
            <CardTitle className="text-2xl font-semibold">
              Payment Successful!
            </CardTitle>
            <p className="text-muted-foreground">
              {syncStatus === 'error' 
                ? 'Failed to sync with enterprise billing system. You can manually sync later.'
                : syncStatus === 'success'
                ? 'Your subscription has been activated and synced successfully!'
                : 'Syncing your subscription with enterprise billing...'
              }
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {syncStatus === 'success' && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✅ Payment processed successfully</p>
                <p>✅ Subscription activated</p>
                <p>✅ Enterprise billing synced</p>
                <p>✅ Enterprise features unlocked</p>
              </div>
            )}
            
            {syncStatus === 'error' && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✅ Payment processed successfully</p>
                <p>✅ Subscription activated</p>
                <p>⚠️ Enterprise billing sync pending</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button asChild className="flex-1" disabled={syncStatus === 'loading'}>
                <Link to="/enterprise">
                  Continue to Enterprise Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              
              {syncStatus === 'error' && (
                <Button 
                  variant="outline" 
                  onClick={handleManualSync}
                  disabled={isRetrying}
                >
                  {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Retry Sync'}
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/enterprise">
                  View Enterprise Dashboard</Link>
              </Button>
              
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            
            {syncStatus === 'loading' && (
              <p className="text-xs text-muted-foreground">
                This may take a few moments...
              </p>
            )}

            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: {sessionId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}