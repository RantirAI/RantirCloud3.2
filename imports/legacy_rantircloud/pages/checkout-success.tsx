import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [syncMessage, setSyncMessage] = useState('Syncing your subscription...');
  const [isRetrying, setIsRetrying] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user || !session || !sessionId) {
      navigate('/enterprise');
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
        } else if (data?.message === "Workspace is already enterprise enabled with the correct plan") {
          setSyncStatus('success');
          setSyncMessage('Your enterprise workspace is already set up and ready to use!');
          toast({
            title: 'Already Configured!',
            description: 'Your enterprise workspace is already active.',
            variant: 'default'
          });
        } else if (data?.planUpdated) {
          setSyncStatus('success');
          setSyncMessage('Your subscription plan has been updated successfully!');
          toast({
            title: 'Plan Updated!',
            description: 'Your enterprise plan has been synced with your Stripe subscription.',
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
  }, [user, session, sessionId, navigate, toast]);

  const handleContinue = () => {
    // Force reload to clear any cached data and fetch updated plan
    window.location.href = '/enterprise';
  };

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
      } else if (data?.message === "Workspace is already enterprise enabled") {
        setSyncStatus('success');
        setSyncMessage('Your enterprise workspace is already set up and ready to use!');
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {syncStatus === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
              {syncStatus === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
              {syncStatus === 'error' && <AlertCircle className="h-12 w-12 text-yellow-500" />}
            </div>
            <CardTitle className="text-2xl">
              {syncStatus === 'success' ? 'Welcome to Enterprise!' : 'Payment Successful!'}
            </CardTitle>
            <CardDescription>
              {syncMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex gap-2">
              <Button 
                onClick={handleContinue} 
                className="flex-1"
                disabled={syncStatus === 'loading'}
              >
                Continue to Enterprise Dashboard
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
            
            {syncStatus === 'loading' && (
              <p className="text-xs text-muted-foreground text-center">
                This may take a few moments...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}