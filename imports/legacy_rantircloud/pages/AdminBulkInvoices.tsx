import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBulkInvoices } from "@/utils/createBulkInvoices";
import { createStripeCustomersWithSubscriptions } from "@/utils/createStripeCustomers";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";

const INITIAL_CUSTOMERS = [
  { email: "william@relevant.training", priceId: "" },
  { email: "nate.wearin@fuegoux.com", priceId: "" },
  { email: "samuel@kikoff.com", priceId: "" },
  { email: "brian@signatureheadshotsorlando.com", priceId: "" },
  { email: "susan@susanbakermd.com", priceId: "" },
  { email: "ssutton@travelinsured.com", priceId: "" },
  { email: "dave@leaseleads.co", priceId: "" },
  { email: "gidget@typeiii.tech", priceId: "" },
  { email: "gvickers@mrvgroup.org", priceId: "" },
  { email: "amber_kate@hotmail.com", priceId: "" },
  { email: "graeve@thedatagroup.cloud", priceId: "" },
  { email: "rcroager@marjentech.com", priceId: "" }
];

export default function AdminBulkInvoices() {
  const [loading, setLoading] = useState(false);
  const [creatingCustomers, setCreatingCustomers] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);

  const updatePriceId = (email: string, priceId: string) => {
    setCustomers(prev => 
      prev.map(c => c.email === email ? { ...c, priceId } : c)
    );
  };

  const handleCreateCustomers = async () => {
    const customersWithPrices = customers.filter(c => c.priceId.trim());
    
    if (customersWithPrices.length === 0) {
      toast.error("Please enter at least one Price ID");
      return;
    }

    setCreatingCustomers(true);
    setResults(null);

    try {
      const result = await createStripeCustomersWithSubscriptions(customersWithPrices);
      
      toast.success(`Created ${result.summary.successful} customers with subscriptions`);
      
      if (result.summary.failed > 0) {
        toast.error(`Failed to create ${result.summary.failed} customers`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setCreatingCustomers(false);
    }
  };

  const handleCreateInvoices = async () => {
    setLoading(true);
    setResults(null);

    try {
      const customerEmails = customers.map(c => c.email);
      const result = await createBulkInvoices(customerEmails);
      setResults(result);
      
      if (result.summary.successful > 0) {
        toast.success(`Successfully created ${result.summary.successful} invoices`);
      }
      if (result.summary.failed > 0) {
        toast.error(`Failed to create ${result.summary.failed} invoices`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Invoice Creation</CardTitle>
          <CardDescription>
            Create customers with subscriptions and invoices for {customers.length} customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Step 1: Assign Price IDs</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
              {customers.map((customer) => (
                <div key={customer.email} className="flex gap-3 items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{customer.email}</p>
                  </div>
                  <Input
                    type="text"
                    value={customer.priceId}
                    onChange={(e) => updatePriceId(customer.email, e.target.value)}
                    placeholder="price_xxxxxxxxxxxxx"
                    className="w-64"
                  />
                </div>
              ))}
            </div>

            <Button 
              onClick={handleCreateCustomers} 
              disabled={creatingCustomers}
              size="lg"
              className="w-full"
              variant="secondary"
            >
              {creatingCustomers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Customers...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Customers with Subscriptions
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Then</span>
            </div>
          </div>

          <Button
            onClick={handleCreateInvoices} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Invoices...
              </>
            ) : (
              "Step 2: Create All Invoices"
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{results.summary.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-600">Successful</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{results.summary.successful}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-destructive">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{results.summary.failed}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Detailed Results:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.results.map((result: any, index: number) => (
                    <Card key={index} className={result.success ? "border-green-500/50" : "border-destructive/50"}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-sm">{result.email}</p>
                            {result.success ? (
                              <>
                                <p className="text-xs text-muted-foreground">
                                  Invoice #{result.invoiceNumber} - {result.currency} {result.amount}
                                </p>
                                {result.invoiceUrl && (
                                  <a 
                                    href={result.invoiceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    View Invoice
                                  </a>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-destructive">{result.error}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}