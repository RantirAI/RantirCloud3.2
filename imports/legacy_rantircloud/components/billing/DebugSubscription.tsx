import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Bug, RefreshCw } from 'lucide-react';

interface DebugData {
  currentUserEmail: string;
  totalCustomers: number;
  matchingCustomers: number;
  totalSubscriptions: number;
  allCustomerEmails: string[];
  similarEmailCustomers: Array<{
    id: string;
    email: string;
    created: number;
  }>;
  subscriptionsDetails: Array<{
    id: string;
    customer: string;
    customerEmail?: string;
    status: string;
    productId?: string;
    priceId?: string;
  }>;
}

export function DebugSubscription() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDebug = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('debug-stripe-customers', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setError(error.message || 'Failed to debug subscription');
        return;
      }

      setDebugData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Subscription Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDebug} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Debugging...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              Debug Stripe Connection
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
            Error: {error}
          </div>
        )}

        {debugData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{debugData.totalCustomers}</div>
                <div className="text-xs text-muted-foreground">Total Customers</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{debugData.matchingCustomers}</div>
                <div className="text-xs text-muted-foreground">Matching Email</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{debugData.totalSubscriptions}</div>
                <div className="text-xs text-muted-foreground">Total Subscriptions</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{debugData.similarEmailCustomers.length}</div>
                <div className="text-xs text-muted-foreground">Similar Emails</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Your Email: {debugData.currentUserEmail}</h4>
            </div>

            {debugData.similarEmailCustomers.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Customers with Similar Emails:</h4>
                <div className="space-y-2">
                  {debugData.similarEmailCustomers.map((customer) => (
                    <div key={customer.id} className="p-2 bg-muted rounded text-sm">
                      <div className="font-medium">{customer.email}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {customer.id} | Created: {new Date(customer.created * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugData.subscriptionsDetails.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">All Subscriptions:</h4>
                <div className="space-y-2">
                  {debugData.subscriptionsDetails.map((sub) => (
                    <div key={sub.id} className="p-2 bg-muted rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status}
                        </Badge>
                        <span className="font-medium">{sub.customerEmail || 'No email'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sub ID: {sub.id} | Customer: {sub.customer}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Product: {sub.productId} | Price: {sub.priceId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">All Customer Emails in Stripe:</h4>
              <div className="max-h-32 overflow-y-auto bg-muted p-2 rounded text-xs">
                {debugData.allCustomerEmails.length > 0 ? (
                  debugData.allCustomerEmails.map((email, index) => (
                    <div key={index}>{email}</div>
                  ))
                ) : (
                  <div className="text-muted-foreground">No customer emails found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}