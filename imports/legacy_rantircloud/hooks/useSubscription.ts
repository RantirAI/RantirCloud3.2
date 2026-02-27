import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CACHE_KEY = 'rantir_subscription_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

interface PlanTier {
  id: string;
  name: string;
  price: number;
  priceId: string;
  productId: string;
  features: string[];
}

// Helper to get cached subscription
const getCachedSubscription = (): { data: SubscriptionStatus; isValid: boolean } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < CACHE_TTL;
      return { data, isValid };
    }
  } catch (e) {
    console.error('Error reading subscription cache:', e);
  }
  return null;
};

// Helper to set cached subscription
const setCachedSubscription = (data: SubscriptionStatus) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Error caching subscription:', e);
  }
};

export function useSubscription() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const initializedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  
  // Initialize with cached data if available - this prevents initial loading flash
  const [loading, setLoading] = useState(() => {
    const cached = getCachedSubscription();
    return !cached?.isValid;
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(() => {
    const cached = getCachedSubscription();
    return cached?.data || {
      subscribed: false,
      product_id: null,
      subscription_end: null,
    };
  });

  // Define available plans with actual Stripe price IDs
  const availablePlans: PlanTier[] = [
    {
      id: 'base-access',
      name: 'Rantir Cloud Base Access',
      price: 49,
      priceId: 'price_1SBemXImpjRdNU8DGS7wD4WY',
      productId: 'prod_T7ubaOiV7kIn0i',
      features: ['Full platform access', 'Cloud databases', 'App builder', 'Flow automation', 'Priority support']
    },
    {
      id: 'ai-core-access',
      name: 'Rantir Cloud AI Core Access',
      price: 99,
      priceId: 'price_1SBen4ImpjRdNU8D492k0x7p',
      productId: 'prod_T7ucTeFQnRD56y',
      features: ['Everything in Base Access', 'AI-powered features', 'Advanced automation', 'Team collaboration', 'Admin dashboard']
    },
  
  ];

  const checkSubscription = async (showToast = false, force = false) => {
    if (!user || !session) {
      console.log('[useSubscription] No user or session, setting to unsubscribed');
      setSubscriptionStatus({
        subscribed: false,
        product_id: null,
        subscription_end: null,
      });
      setLoading(false);
      return;
    }

    // Skip if we have valid cache and not forcing refresh
    if (!force && !showToast) {
      const cached = getCachedSubscription();
      if (cached?.isValid) {
        console.log('[useSubscription] Using cached subscription data');
        setSubscriptionStatus(cached.data);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      
      console.log('[useSubscription] Checking subscription for user:', user.email);
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[useSubscription] Check subscription response:', { data, error });

      if (error) {
        console.error('Error checking subscription:', error);
        if (showToast) {
          toast({
            title: 'Subscription Check Failed',
            description: `Failed to check subscription status: ${error.message}`,
            variant: 'destructive'
          });
        }
        setSubscriptionStatus({
          subscribed: false,
          product_id: null,
          subscription_end: null,
        });
        return;
      }

      if (data.error) {
        console.error('Subscription function error:', data.error);
        if (showToast) {
          toast({
            title: 'Subscription Error',
            description: `Error: ${data.error}`,
            variant: 'destructive'
          });
        }
        setSubscriptionStatus({
          subscribed: false,
          product_id: null,
          subscription_end: null,
        });
        return;
      }

      setSubscriptionStatus(data);
      setCachedSubscription(data); // Cache the result
      
      // Auto-sync with enterprise if subscription is active and eligible
      if (data.subscribed && data.product_id) {
        const eligibleProducts = [
          'prod_T7ubaOiV7kIn0i', // Rantir Cloud Base Access
          'prod_T7ucTeFQnRD56y', // Rantir Cloud AI Core Access
        ];
        
        if (eligibleProducts.includes(data.product_id)) {
          console.log('[useSubscription] Subscription detected, auto-syncing...');
          // Don't await - let it run in background
          syncWithEnterprise(true).catch(err => {
            console.error('[useSubscription] Auto-sync failed:', err);
          });
        }
      }
      
      // Only show toast for manual refresh
      if (showToast) {
        if (data.subscribed) {
          console.log('Subscription found:', data);
          toast({
            title: 'Subscription Active!',
            description: `Your subscription is now active.`,
            variant: 'default'
          });
        } else {
          toast({
            title: 'No Active Subscription',
            description: 'No active subscription found. It may take a few moments for new subscriptions to appear.',
            variant: 'default'
          });
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (showToast) {
        toast({
          title: 'Connection Error', 
          description: `Failed to connect to subscription service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive'
        });
      }
      setSubscriptionStatus({
        subscribed: false,
        product_id: null,
        subscription_end: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    await checkSubscription(true);
  };

  const syncWithEnterprise = async (silent = false) => {
    if (!user || !session) {
      if (!silent) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to sync subscription data.',
          variant: 'destructive'
        });
      }
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error syncing with enterprise:', error);
        if (!silent) {
          toast({
            title: 'Sync Failed',
            description: 'Failed to sync with enterprise billing system.',
            variant: 'destructive'
          });
        }
        return;
      }

      if (data.error) {
        // If already enterprise, don't show error
        if (data.error.includes('already enterprise') || !data.syncPerformed) {
          console.log('[syncWithEnterprise] Workspace already enterprise or no sync needed');
          return;
        }
        
        if (!silent) {
          toast({
            title: 'Sync Failed',
            description: data.error,
            variant: 'destructive'
          });
        }
        return;
      }

      if (data.syncPerformed) {
        toast({
          title: 'Enterprise Access Activated! 🎉',
          description: 'Your workspace has been upgraded to enterprise.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error syncing with enterprise:', error);
      if (!silent) {
        toast({
          title: 'Sync Error',
          description: 'Failed to sync subscription data.',
          variant: 'destructive'
        });
      }
    }
  };

  const createCheckout = async (priceId: string) => {
    if (!user || !session) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to subscribe.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating checkout:', error);
        toast({
          title: 'Checkout Error',
          description: 'Failed to create checkout session.',
          variant: 'destructive'
        });
        return;
      }

      if (data.url) {
        // Open checkout in new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Checkout Error',
        description: 'Failed to create checkout session.',
        variant: 'destructive'
      });
    }
  };

  const getCurrentPlan = (): PlanTier => {
    console.log('getCurrentPlan called with:', {
      subscribed: subscriptionStatus.subscribed,
      product_id: subscriptionStatus.product_id,
      availablePlans: availablePlans.map(p => ({ id: p.id, name: p.name, productId: p.productId }))
    });

    if (!subscriptionStatus.subscribed || !subscriptionStatus.product_id) {
      console.log('Returning free plan - not subscribed or no product_id');
      return availablePlans[0]; // Personal (free) plan
    }

    const matchedPlan = availablePlans.find(plan => plan.productId === subscriptionStatus.product_id);
    console.log('Plan matching result:', {
      searchingFor: subscriptionStatus.product_id,
      found: matchedPlan ? { id: matchedPlan.id, name: matchedPlan.name, productId: matchedPlan.productId } : 'No match',
      matchedPlan: matchedPlan,
      willReturn: matchedPlan ? matchedPlan.name : availablePlans[0].name
    });

    if (matchedPlan) {
      console.log('✅ FOUND MATCHING PLAN:', matchedPlan.name);
      return matchedPlan;
    } else {
      console.log('❌ NO MATCH - returning fallback:', availablePlans[0].name);
      return availablePlans[0];
    }
  };

  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // Only re-check subscription if:
    // 1. We have a user AND session
    // 2. The user ID actually changed (not just a token refresh)
    if (user && session) {
      if (currentUserId !== lastUserIdRef.current) {
        // New user logged in - do full check
        lastUserIdRef.current = currentUserId;
        initializedRef.current = true;
        checkSubscription();
      } else if (!initializedRef.current) {
        // Same user, first initialization
        initializedRef.current = true;
        checkSubscription();
      }
      // Otherwise: same user, already initialized = skip (prevents tab-switch reload)
    } else if (!user || !session) {
      // Reset if user logs out
      lastUserIdRef.current = null;
      initializedRef.current = false;
      setLoading(false); // Ensure loading is cleared when no user
    }
  }, [user?.id, !!session]); // Depend on user.id, not the full objects

  // Auto-refresh removed to prevent constant page refreshing
  // Users can manually refresh using the refetch or forceRefresh functions

  return {
    loading,
    subscriptionStatus,
    availablePlans,
    getCurrentPlan,
    createCheckout,
    refetch: checkSubscription,
    forceRefresh,
    syncWithEnterprise,
  };
}