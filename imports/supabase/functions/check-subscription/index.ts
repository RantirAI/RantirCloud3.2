import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header - returning unsubscribed");
      return new Response(JSON.stringify({ 
        subscribed: false,
        error: "Not authenticated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle authentication errors gracefully - return unsubscribed instead of 500
    if (userError || !userData?.user?.email) {
      logStep("Auth failed - returning unsubscribed", { 
        error: userError?.message, 
        hasUser: !!userData?.user 
      });
      return new Response(JSON.stringify({ 
        subscribed: false,
        error: userError?.message || "User not authenticated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    
    // First check for customers by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    logStep("Searched for customers by email", { email: user.email, found: customers.data.length });
    
    if (customers.data.length === 0) {
      // If no customer found by email, let's check recent customers
      const recentCustomers = await stripe.customers.list({ limit: 10 });
      logStep("Recent customers check", { 
        total: recentCustomers.data.length,
        emails: recentCustomers.data.map((c: any) => c.email).filter(Boolean)
      });
      
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        debug_info: {
          searched_email: user.email,
          recent_customer_emails: recentCustomers.data.map((c: any) => c.email).filter(Boolean)
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      // Handle potential null/undefined current_period_end
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        raw_period_end: subscription.current_period_end,
        product_id: subscription.items.data[0].price.product
      });
      // Get product ID from the subscription
      productId = subscription.items.data[0].price.product;
      logStep("Determined subscription tier", { productId });
    } else {
      // Check for any subscriptions (including inactive ones)
      const allSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });
      logStep("No active subscription found", { 
        totalSubscriptions: allSubscriptions.data.length,
        subscriptionStatuses: allSubscriptions.data.map((s: any) => s.status)
      });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      debug_info: {
        customer_id: customerId,
        customer_email: customers.data[0].email,
        subscription_count: subscriptions.data.length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      subscribed: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});