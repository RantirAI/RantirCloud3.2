import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { csvData } = await req.json();
    console.log("Starting subscriber import process...");

    // Parse CSV data (assuming it's already parsed into an array of objects)
    const subscribers = csvData;
    console.log(`Processing ${subscribers.length} subscribers`);

    // Step 1: Map CSV plan descriptions to billing plan codes
    const mapPlanToBillingCode = (planDescription: string, monthlyValue: string) => {
      const value = parseFloat(monthlyValue) || 0;
      
      // Prioritize monthly value for accurate mapping since plan descriptions don't always match
      if (value >= 3999) return 'enterprise';
      if (value >= 799) return 'enterprise_premium';
      if (value >= 299) return 'enterprise_lite';
      if (value >= 99) return 'enterprise_starter';
      if (value >= 49) return 'user';
      
      // Only use personal plan if no payment value
      if (value > 0) return 'user'; // Any payment gets at least user plan
      return 'personal';
    };

    console.log("✓ Plan mapping function ready");

    // Step 2: Process each subscriber
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const subscriber of subscribers) {
      try {
        console.log(`Processing subscriber: ${subscriber.email}`);

        // Create user account
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: subscriber.email,
          password: 'rantir2025',
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: subscriber.name || subscriber.email.split('@')[0]
          }
        });

        if (userError) {
          console.error(`Error creating user ${subscriber.email}:`, userError);
          results.push({
            email: subscriber.email,
            status: 'error',
            error: userError.message
          });
          errorCount++;
          continue;
        }

        const userId = userData.user?.id;
        if (!userId) {
          console.error(`No user ID returned for ${subscriber.email}`);
          results.push({
            email: subscriber.email,
            status: 'error', 
            error: 'No user ID returned'
          });
          errorCount++;
          continue;
        }

        // Create workspace for the user
        const workspaceName = `${subscriber.name || subscriber.email.split('@')[0]}'s Workspace`;
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            user_id: userId,
            name: workspaceName,
            is_default: true,
            is_enterprise: subscriber.plan?.includes('enterprise') || false
          })
          .select()
          .single();

        if (workspaceError) {
          console.error(`Error creating workspace for ${subscriber.email}:`, workspaceError);
          results.push({
            email: subscriber.email,
            status: 'error',
            error: `Workspace creation failed: ${workspaceError.message}`
          });
          errorCount++;
          continue;
        }

        // Get billing plan ID using proper mapping
        const planCode = mapPlanToBillingCode(subscriber.plan, subscriber.monthlyValue);
        console.log(`Mapping plan "${subscriber.plan}" ($${subscriber.monthlyValue}) to code: ${planCode}`);
        
        const { data: planData, error: planError } = await supabase
          .from('billing_plans')
          .select('id')
          .eq('code', planCode)
          .single();

        let actualPlanId = planData?.id;
        if (planError || !actualPlanId) {
          console.log(`Plan mapping failed for ${subscriber.plan} (${subscriber.monthlyValue}), determining appropriate plan based on value`);
          
          // Smart fallback based on monthly value - avoid personal plan for paying customers
          const monthlyValue = parseFloat(subscriber.monthlyValue) || 0;
          let fallbackPlanCode = 'personal'; // Only if truly no value
          
          if (monthlyValue >= 3999) {
            fallbackPlanCode = 'enterprise';
          } else if (monthlyValue >= 799) {
            fallbackPlanCode = 'enterprise_premium';
          } else if (monthlyValue >= 299) {
            fallbackPlanCode = 'enterprise_lite';
          } else if (monthlyValue >= 99) {
            fallbackPlanCode = 'enterprise_starter';
          } else if (monthlyValue >= 49) {
            fallbackPlanCode = 'user';
          } else if (monthlyValue > 0) {
            // If they have any payment but less than $49, give them user plan
            fallbackPlanCode = 'user';
          }
          
          console.log(`Using smart fallback plan: ${fallbackPlanCode} for monthly value: $${monthlyValue}`);
          
          const { data: fallbackPlan } = await supabase
            .from('billing_plans')
            .select('id')
            .eq('code', fallbackPlanCode)
            .single();
          actualPlanId = fallbackPlan?.id;
        }

        // Create workspace plan assignment
        if (actualPlanId) {
          const { error: workspacePlanError } = await supabase
            .from('workspace_plans')
            .insert({
              workspace_id: workspaceData.id,
              plan_id: actualPlanId,
              seats: 1,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            });

          if (workspacePlanError) {
            console.error(`Error creating workspace plan for ${subscriber.email}:`, workspacePlanError);
          }
        }

        // Add user as workspace member
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceData.id,
            user_id: userId,
            role: 'owner',
            user_group: subscriber.plan?.includes('enterprise') ? 'enterprise' : 'standard',
            joined_at: new Date().toISOString()
          });

        if (memberError) {
          console.error(`Error adding workspace member for ${subscriber.email}:`, memberError);
        }

        // Update user settings to set current workspace
        const { error: settingsError } = await supabase
          .from('user_settings')
          .update({ current_workspace_id: workspaceData.id })
          .eq('id', userId);

        if (settingsError) {
          console.error(`Error updating user settings for ${subscriber.email}:`, settingsError);
        }

        results.push({
          email: subscriber.email,
          status: 'success',
          userId: userId,
          workspaceId: workspaceData.id,
          plan: subscriber.plan
        });

        successCount++;
        console.log(`✓ Successfully processed ${subscriber.email}`);

      } catch (error) {
        console.error(`Unexpected error processing ${subscriber.email}:`, error);
        results.push({
          email: subscriber.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
        errorCount++;
      }
    }

    console.log(`Import completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${successCount} successful, ${errorCount} errors`,
        results: results,
        summary: {
          total: subscribers.length,
          successful: successCount,
          errors: errorCount
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in import-subscribers function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});