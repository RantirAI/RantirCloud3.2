import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create anon client with user's auth token
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message || "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for vault operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, flowProjectId, name, value, description, secretId } = body;

    if (!flowProjectId) {
      return new Response(
        JSON.stringify({ error: "Missing flowProjectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the flow project
    const { data: flowProject, error: flowError } = await supabase
      .from("flow_projects")
      .select("id, user_id")
      .eq("id", flowProjectId)
      .eq("user_id", user.id)
      .single();

    if (flowError || !flowProject) {
      return new Response(
        JSON.stringify({ error: "Flow project not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "create": {
        if (!name || !value) {
          return new Response(
            JSON.stringify({ error: "Missing name or value" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if secret already exists
        const { data: existing } = await supabase
          .from("flow_secrets")
          .select("id")
          .eq("flow_project_id", flowProjectId)
          .eq("name", name)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ error: "Secret with this name already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("create_flow_secret", {
          p_flow_project_id: flowProjectId,
          p_name: name,
          p_value: value,
          p_description: description || null,
        });

        if (error) {
          console.error("Error creating secret:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create secret", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ id: data, success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { data, error } = await supabase
          .from("flow_secrets")
          .select("id, name, description, created_at, updated_at")
          .eq("flow_project_id", flowProjectId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error listing secrets:", error);
          return new Response(
            JSON.stringify({ error: "Failed to list secrets", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(data || []),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!name || !value) {
          return new Response(
            JSON.stringify({ error: "Missing name or value" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("update_flow_secret", {
          p_flow_project_id: flowProjectId,
          p_name: name,
          p_new_value: value,
        });

        if (error) {
          console.error("Error updating secret:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update secret", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!data) {
          return new Response(
            JSON.stringify({ error: "Secret not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!secretId) {
          return new Response(
            JSON.stringify({ error: "Missing secretId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("delete_flow_secret", {
          p_secret_id: secretId,
        });

        if (error) {
          console.error("Error deleting secret:", error);
          return new Response(
            JSON.stringify({ error: "Failed to delete secret", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!data) {
          return new Response(
            JSON.stringify({ error: "Secret not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action", validActions: ["create", "list", "update", "delete"] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err: any) {
    console.error("Secrets manager error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
