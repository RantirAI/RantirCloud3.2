import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const planId = url.searchParams.get('planId');
    const tableId = url.searchParams.get('tableId');
    
    if (!planId || !tableId) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters",
        valid: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the table project and validate the plan exists
    const { data: project, error } = await supabaseClient
      .from("table_projects")
      .select("records")
      .eq("id", tableId)
      .single();

    if (error || !project) {
      return new Response(JSON.stringify({ 
        error: "Table not found",
        valid: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Find the specific subscription plan
    const subscriptionPlan = project.records.find((record: any) => 
      record.id === planId && record.type === 'subscription' && record.showInEmbed
    );

    if (!subscriptionPlan) {
      return new Response(JSON.stringify({ 
        error: "Subscription plan not found or not available",
        valid: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Return the validated plan details
    return new Response(JSON.stringify({ 
      valid: true,
      plan: {
        id: subscriptionPlan.id,
        name: subscriptionPlan.name,
        description: subscriptionPlan.description,
        price: subscriptionPlan.price,
        billingPeriod: subscriptionPlan.billingPeriod,
        tableId: tableId
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in validate-plan:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      valid: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});