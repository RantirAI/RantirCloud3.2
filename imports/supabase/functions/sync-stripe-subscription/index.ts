import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    
    let user;
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw userError;
      user = userData.user;
    } catch (authErr) {
      const errMsg = authErr instanceof Error ? authErr.message : String(authErr);
      // Check if it's a JSON parsing error (HTML response)
      if (errMsg.includes('Unexpected token') || errMsg.includes('<html')) {
        throw new Error("Authentication service temporarily unavailable. Please try again.");
      }
      throw new Error(`Authentication failed: ${errMsg}`);
    }
    
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get Stripe subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No Stripe customer found",
        syncPerformed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No active Stripe subscription found",
        syncPerformed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    
    logStep("Found active subscription", { 
      subscriptionId: subscription.id, 
      productId 
    });

    // Get user's current workspace
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('current_workspace_id')
      .eq('id', user.id)
      .single();

    if (settingsError || !settings?.current_workspace_id) {
      throw new Error("No current workspace found");
    }

    const workspaceId = settings.current_workspace_id;
    logStep("Found workspace", { workspaceId });

    // Check if workspace is already enterprise
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('is_enterprise')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) throw new Error(`Failed to fetch workspace: ${workspaceError.message}`);

    // Map Stripe product to billing plan
    const planMapping: Record<string, string> = {
      'prod_T7ucTeFQnRD56y': 'enterprise_starter',  // Enterprise Starter
      'prod_T7ugqWo7VfoEus': 'enterprise_lite',     // Enterprise Lite
      'prod_T7uh1MpjEGUMaz': 'enterprise_premium',  // Enterprise Premium
      'prod_T7uprf8xKAmUQf': 'enterprise',          // Enterprise
    };

    const planCode = planMapping[productId];
    if (!planCode) {
      logStep("Product not eligible for enterprise", { productId });
      return new Response(JSON.stringify({ 
        error: "Subscription plan is not eligible for enterprise features",
        syncPerformed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // If workspace is already enterprise, check if we need to update the plan
    if (workspace.is_enterprise) {
      logStep("Workspace already enterprise - checking plan sync");
      
      // Get the plan ID for the Stripe product
      const { data: targetPlan, error: planError } = await supabaseClient
        .from('billing_plans')
        .select('id')
        .eq('code', planCode)
        .eq('is_active', true)
        .single();

      if (planError || !targetPlan) {
        throw new Error(`Failed to find billing plan: ${planCode}`);
      }

      // Check current workspace plan
      const { data: currentPlan, error: currentPlanError } = await supabaseClient
        .from('workspace_plans')
        .select('plan_id, billing_plans(code)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .single();

      if (currentPlanError && currentPlanError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch current plan: ${currentPlanError.message}`);
      }

      // If plan matches, no update needed
      if (currentPlan && currentPlan.plan_id === targetPlan.id) {
        logStep("Workspace plan already matches Stripe subscription");
        return new Response(JSON.stringify({ 
          message: "Workspace is already enterprise enabled with the correct plan",
          syncPerformed: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update the workspace plan
      logStep("Updating workspace plan to match Stripe subscription", { 
        from: currentPlan?.billing_plans?.code, 
        to: planCode 
      });

      if (currentPlan) {
        // Update existing plan
        const { error: updateError } = await supabaseClient
          .from('workspace_plans')
          .update({ 
            plan_id: targetPlan.id,
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', workspaceId)
          .eq('status', 'active');

        if (updateError) {
          throw new Error(`Failed to update workspace plan: ${updateError.message}`);
        }
      } else {
        // Create new plan record
        const { error: insertError } = await supabaseClient
          .from('workspace_plans')
          .insert({
            workspace_id: workspaceId,
            plan_id: targetPlan.id,
            seats: 10,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to create workspace plan: ${insertError.message}`);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: "Enterprise workspace plan synced with Stripe subscription",
        planUpdated: true,
        syncPerformed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Upgrading workspace to enterprise", { planCode });

    // Create a client with user context for the RPC call
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Call the database function to upgrade workspace with user context
    const { data: upgradeResult, error: upgradeError } = await userClient
      .rpc('make_workspace_enterprise', { 
        target_workspace_id: workspaceId 
      });

    if (upgradeError) {
      throw new Error(`Failed to upgrade workspace: ${upgradeError.message}`);
    }

    logStep("Workspace upgraded successfully", upgradeResult);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Enterprise workspace created and synced with Stripe subscription",
      apiKey: upgradeResult.api_key,
      syncPerformed: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      syncPerformed: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
