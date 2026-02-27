import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CUSTOMERS] ${step}${detailsStr}`);
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
    
    const { customers } = await req.json();
    
    if (!customers || !Array.isArray(customers)) {
      throw new Error("customers array is required");
    }

    logStep("Processing customers", { count: customers.length });

    const results = [];
    
    for (const customerData of customers) {
      try {
        const { email, name, priceId } = customerData;
        
        if (!priceId) {
          throw new Error("priceId is required for each customer");
        }
        
        logStep(`Processing: ${email}`, { priceId });
        
        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({ email, limit: 1 });
        
        let customer;
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          logStep(`Customer exists`, { customerId: customer.id, email });
          
          // Check if they already have an active subscription
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1
          });
          
          if (subscriptions.data.length > 0) {
            logStep(`Customer already has active subscription`, { email });
            results.push({
              email,
              success: true,
              customerId: customer.id,
              subscriptionId: subscriptions.data[0].id,
              alreadyExisted: true
            });
            continue;
          }
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email,
            name: name || email.split('@')[0],
            description: `Auto-created customer for ${email}`
          });
          logStep(`Customer created`, { customerId: customer.id, email });
        }

        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        logStep(`Subscription created`, { 
          subscriptionId: subscription.id,
          email,
          status: subscription.status 
        });

        results.push({
          email,
          success: true,
          customerId: customer.id,
          subscriptionId: subscription.id,
          status: subscription.status,
          alreadyExisted: existingCustomers.data.length > 0
        });

      } catch (error) {
        logStep(`Error processing ${customerData.email}`, { error: error.message });
        results.push({
          email: customerData.email,
          success: false,
          error: error.message
        });
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      alreadyExisted: results.filter(r => r.alreadyExisted).length
    };

    logStep("Customer creation completed", summary);

    return new Response(JSON.stringify({
      summary,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-customers", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
