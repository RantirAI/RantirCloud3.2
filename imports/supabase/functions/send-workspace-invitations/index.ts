import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { workspace_id, emails } = await req.json();

    if (!workspace_id || !emails || !Array.isArray(emails)) {
      throw new Error("Invalid request parameters");
    }

    // Verify user is workspace owner
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from("workspaces")
      .select("user_id")
      .eq("id", workspace_id)
      .single();

    if (workspaceError || workspace.user_id !== user.id) {
      throw new Error("Not authorized for this workspace");
    }

    // Create workspace invitations
    const invitations = emails.map((email: string) => ({
      workspace_id,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
      token: crypto.randomUUID(),
      role: 'member',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }));

    const { data: createdInvitations, error: insertError } = await supabaseClient
      .from("workspace_invitations")
      .insert(invitations)
      .select();

    if (insertError) throw insertError;

    // TODO: Send invitation emails via Resend
    // For now, just return the invitation tokens
    console.log("Invitations created:", createdInvitations);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitations: createdInvitations.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
