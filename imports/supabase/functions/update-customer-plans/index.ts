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

    console.log("Starting customer plan updates...");

    // Customer data with correct monthly values
    const customerUpdates = [
      { email: 'william@relevant.training', monthlyValue: 799 },
      { email: 'nate.wearin@fuegoux.com', monthlyValue: 299 },
      { email: 'samuel@kikoff.com', monthlyValue: 3999 },
      { email: 'brian@signatureheadshotsorlando.com', monthlyValue: 299 },
      { email: 'susan@susanbakermd.com', monthlyValue: 399 },
      { email: 'ssutton@travelinsured.com', monthlyValue: 1499 },
      { email: 'dave@leaseleads.co', monthlyValue: 49 },
      { email: 'gidget@typeiii.tech', monthlyValue: 299 },
      { email: 'gvickers@mrvgroup.org', monthlyValue: 999 },
      { email: 'amber_kate@hotmail.com', monthlyValue: 599 },
      { email: 'graeve@thedatagroup.cloud', monthlyValue: 299 },
      { email: 'rcroager@marjentech.com', monthlyValue: 249 }
    ];

    // Map monthly value to correct plan code
    const mapValueToPlan = (value: number) => {
      if (value >= 3999) return 'enterprise';
      if (value >= 799) return 'enterprise_premium';
      if (value >= 299) return 'enterprise_lite';
      if (value >= 99) return 'enterprise_starter';
      if (value >= 49) return 'user';
      return 'personal';
    };

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const customer of customerUpdates) {
      try {
        console.log(`Processing ${customer.email} with $${customer.monthlyValue}`);

        // Get user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        const user = userData.users?.find(u => u.email === customer.email);
        
        if (!user) {
          console.log(`User not found: ${customer.email}`);
          continue;
        }

        // Get user's current workspace
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('current_workspace_id')
          .eq('id', user.id)
          .single();

        if (!userSettings?.current_workspace_id) {
          console.log(`No workspace found for ${customer.email}`);
          continue;
        }

        // Determine correct plan
        const correctPlanCode = mapValueToPlan(customer.monthlyValue);
        console.log(`Mapping ${customer.email} ($${customer.monthlyValue}) to plan: ${correctPlanCode}`);

        // Get the plan ID
        const { data: planData } = await supabase
          .from('billing_plans')
          .select('id, name')
          .eq('code', correctPlanCode)
          .single();

        if (!planData) {
          console.log(`Plan not found for code: ${correctPlanCode}`);
          continue;
        }

        // Update workspace plan
        const { error: updateError } = await supabase
          .from('workspace_plans')
          .update({
            plan_id: planData.id,
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', userSettings.current_workspace_id);

        if (updateError) {
          console.error(`Error updating plan for ${customer.email}:`, updateError);
          errorCount++;
          results.push({
            email: customer.email,
            status: 'error',
            error: updateError.message
          });
        } else {
          console.log(`✓ Updated ${customer.email} to ${planData.name} plan`);
          successCount++;
          results.push({
            email: customer.email,
            status: 'success',
            oldPlan: 'Personal',
            newPlan: planData.name,
            monthlyValue: customer.monthlyValue
          });
        }

      } catch (error) {
        console.error(`Unexpected error for ${customer.email}:`, error);
        errorCount++;
        results.push({
          email: customer.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    console.log(`Plan updates completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan updates completed: ${successCount} successful, ${errorCount} errors`,
        results: results,
        summary: {
          total: customerUpdates.length,
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
    console.error("Error in update-customer-plans function:", error);
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