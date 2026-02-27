import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webflow-signature, stripe-signature, x-hub-signature-256, x-shopify-hmac-sha256, x-slack-signature, x-slack-request-timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// Detect webhook provider from headers
function detectProvider(headers: Record<string, string>): string | null {
  const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
  
  if (headerKeys.some(k => k === 'x-webflow-signature')) return 'webflow';
  if (headerKeys.some(k => k === 'stripe-signature')) return 'stripe';
  if (headerKeys.some(k => k === 'x-hub-signature-256' || k === 'x-github-event')) return 'github';
  if (headerKeys.some(k => k === 'x-shopify-hmac-sha256' || k === 'x-shopify-topic')) return 'shopify';
  if (headerKeys.some(k => k === 'x-slack-signature')) return 'slack';
  if (headerKeys.some(k => k === 'x-sendgrid-event-id')) return 'sendgrid';
  if (headerKeys.some(k => k === 'x-twilio-signature')) return 'twilio';
  
  return null;
}

// Get client IP from request
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Expected path: /webhook-test-listener/{flowProjectId}/{nodeId}
    // After split: ['webhook-test-listener', flowProjectId, nodeId]
    const flowProjectId = pathParts[1];
    const nodeId = pathParts[2];

    if (!flowProjectId || !nodeId) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid URL. Expected format: /webhook-test-listener/{flowProjectId}/{nodeId}' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let body = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        const formObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          formObj[key] = value;
        });
        body = formObj;
      } catch {
        body = {};
      }
    } else if (contentType.includes('text/')) {
      try {
        body = { text: await req.text() };
      } catch {
        body = {};
      }
    }

    // Collect headers (exclude sensitive ones)
    const headers: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    req.headers.forEach((value, key) => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        headers[key.toLowerCase()] = value;
      }
    });

    // Parse query parameters
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Detect provider
    const providerDetected = detectProvider(headers);
    
    // Get client IP
    const sourceIp = getClientIp(req);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify flow project exists
    const { data: flowProject, error: flowError } = await supabase
      .from('flow_projects')
      .select('id, user_id')
      .eq('id', flowProjectId)
      .single();

    if (flowError || !flowProject) {
      return new Response(
        JSON.stringify({ error: 'Flow project not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store the captured payload
    const { data: insertedPayload, error: insertError } = await supabase
      .from('webhook_test_payloads')
      .insert({
        flow_project_id: flowProjectId,
        node_id: nodeId,
        method: req.method,
        headers,
        body,
        query,
        source_ip: sourceIp,
        provider_detected: providerDetected,
        user_id: flowProject.user_id,
        is_sample: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing payload:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store payload', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook test payload captured successfully',
        payloadId: insertedPayload.id,
        provider: providerDetected,
        capturedAt: insertedPayload.captured_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook test listener error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
