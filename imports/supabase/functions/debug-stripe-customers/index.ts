import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEBUG-STRIPE] ${step}${detailsStr}`);
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
    logStep("Debug function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Get ALL customers (up to 100) to see what emails exist
    const allCustomers = await stripe.customers.list({ limit: 100 });
    logStep("Found customers", { count: allCustomers.data.length });

    // Get customers matching current user email
    const matchingCustomers = await stripe.customers.list({ 
      email: user.email, 
      limit: 10 
    });
    logStep("Customers matching current email", { 
      count: matchingCustomers.data.length,
      customers: matchingCustomers.data.map((c: any) => ({ id: c.id, email: c.email }))
    });

    // Get all subscriptions
    const allSubscriptions = await stripe.subscriptions.list({ limit: 100 });
    logStep("Found subscriptions", { 
      count: allSubscriptions.data.length,
      subscriptions: allSubscriptions.data.map((s: any) => ({
        id: s.id,
        customer: s.customer,
        status: s.status,
        productId: s.items.data[0]?.price?.product
      }))
    });

    // Look for customers with similar emails (in case there's a typo)
    const similarEmailCustomers = allCustomers.data.filter((customer: any) => 
      customer.email && 
      (customer.email.toLowerCase().includes('rcroager') || 
       customer.email.toLowerCase().includes('marjentech'))
    );
    logStep("Customers with similar emails", { 
      customers: similarEmailCustomers.map((c: any) => ({ id: c.id, email: c.email }))
    });

    return new Response(JSON.stringify({
      currentUserEmail: user.email,
      totalCustomers: allCustomers.data.length,
      matchingCustomers: matchingCustomers.data.length,
      totalSubscriptions: allSubscriptions.data.length,
      allCustomerEmails: allCustomers.data
        .filter((c: any) => c.email)
        .map((c: any) => c.email)
        .sort(),
      similarEmailCustomers: similarEmailCustomers.map((c: any) => ({
        id: c.id,
        email: c.email,
        created: c.created
      })),
      subscriptionsDetails: allSubscriptions.data.map((s: any) => ({
        id: s.id,
        customer: s.customer,
        customerEmail: allCustomers.data.find((c: any) => c.id === s.customer)?.email,
        status: s.status,
        productId: s.items.data[0]?.price?.product,
        priceId: s.items.data[0]?.price?.id
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in debug function", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});