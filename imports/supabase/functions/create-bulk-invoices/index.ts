import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BULK-INVOICES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const { emails } = await req.json();
    
    if (!emails || !Array.isArray(emails)) {
      throw new Error("emails array is required");
    }

    logStep("Processing emails", { count: emails.length, emails });

    const results = [];
    
    for (const email of emails) {
      try {
        logStep(`Processing customer: ${email}`);
        
        // Find customer by email
        const customers = await stripe.customers.list({ email, limit: 1 });
        
        if (customers.data.length === 0) {
          logStep(`No customer found for ${email}`);
          results.push({
            email,
            success: false,
            error: "Customer not found in Stripe"
          });
          continue;
        }

        const customer = customers.data[0];
        logStep(`Found customer`, { customerId: customer.id, email });

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 10
        });

        if (subscriptions.data.length === 0) {
          logStep(`No active subscription for ${email}`);
          results.push({
            email,
            customerId: customer.id,
            success: false,
            error: "No active subscription found"
          });
          continue;
        }

        // Get the first active subscription
        const subscription = subscriptions.data[0];
        const subscriptionItems = subscription.items.data;
        
        logStep(`Creating invoice for ${email}`, { 
          subscriptionId: subscription.id,
          itemCount: subscriptionItems.length 
        });

        // Create invoice
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          auto_advance: false, // Don't automatically finalize
          description: `Invoice for subscription ${subscription.id}`,
        });

        // Add invoice items based on subscription items
        for (const item of subscriptionItems) {
          const priceId = typeof item.price === 'string' ? item.price : item.price.id;
          await stripe.invoiceItems.create({
            customer: customer.id,
            invoice: invoice.id,
            price: priceId,
            quantity: item.quantity || 1,
          });
        }

        // Finalize the invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

        logStep(`Invoice created successfully for ${email}`, { 
          invoiceId: finalizedInvoice.id,
          amount: finalizedInvoice.amount_due,
          currency: finalizedInvoice.currency
        });

        results.push({
          email,
          customerId: customer.id,
          success: true,
          invoiceId: finalizedInvoice.id,
          invoiceNumber: finalizedInvoice.number,
          amount: finalizedInvoice.amount_due / 100, // Convert from cents
          currency: finalizedInvoice.currency.toUpperCase(),
          subscriptionId: subscription.id,
          invoiceUrl: finalizedInvoice.hosted_invoice_url
        });

      } catch (error) {
        logStep(`Error processing ${email}`, { error: error.message });
        results.push({
          email,
          success: false,
          error: error.message
        });
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    logStep("Bulk invoice creation completed", summary);

    return new Response(JSON.stringify({
      summary,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-bulk-invoices", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
