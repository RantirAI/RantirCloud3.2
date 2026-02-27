import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
}

export function PaymentMethodCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-payment-methods');
      
      if (error) throw error;
      
      if (data?.paymentMethods) {
        setPaymentMethods(data.paymentMethods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleManagePaymentMethods = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe Customer Portal in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Redirecting to Payment Portal",
          description: "Opening Stripe Customer Portal to manage your payment methods.",
        });
        // Refresh payment methods after user returns
        setTimeout(() => fetchPaymentMethods(), 2000);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open payment portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    return '💳';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payment methods for subscriptions and billing
              </CardDescription>
            </div>
            <Button onClick={handleManagePaymentMethods} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Loading payment methods...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payment methods added yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click "Add Payment Method" above to securely add payment methods through Stripe
              </p>
              <div className="p-4 border rounded-lg bg-muted/30 max-w-md mx-auto">
                <div className="flex items-start gap-3 text-left">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Secure Payment Processing</h4>
                    <p className="text-xs text-muted-foreground">
                      Your payment information is securely processed through Stripe Customer Portal. 
                      You can add credit/debit cards and manage automatic billing settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div 
                  key={pm.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold">
                      {getCardBrandIcon(pm.brand)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">
                          {pm.brand} ****{pm.last4}
                        </p>
                        {pm.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear} • {pm.cardholderName}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleManagePaymentMethods}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Automatic payments</h4>
                    <p className="text-xs text-muted-foreground">
                      Your default payment method will be charged automatically for subscriptions
                    </p>
                  </div>
                  <Badge className="bg-blue-500 hover:bg-blue-600">Enabled</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}