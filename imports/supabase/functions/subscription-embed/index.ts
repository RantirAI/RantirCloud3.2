import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tableId = url.pathname.split('/').pop();
    
    if (!tableId) {
      throw new Error("Table ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the table project and its subscription records
    const { data: project, error } = await supabaseClient
      .from("table_projects")
      .select("records")
      .eq("id", tableId)
      .single();

    if (error || !project) {
      throw new Error("Project not found");
    }

    // Filter subscription plans that are visible in embed
    const subscriptions = project.records.filter((record: any) => 
      record.type === 'subscription' && record.showInEmbed
    );

    return new Response(JSON.stringify({ subscriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in subscription-embed:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});