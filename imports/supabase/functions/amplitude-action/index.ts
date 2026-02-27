import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, userId, eventType, eventProperties, userProperties } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    let result;

    if (action === 'track_event') {
      if (!userId || !eventType) {
        throw new Error('User ID and event type are required for tracking events');
      }

      const eventData = {
        user_id: userId,
        event_type: eventType,
        event_properties: eventProperties ? JSON.parse(eventProperties) : {},
        time: Date.now(),
      };

      const response = await fetch('https://api2.amplitude.com/2/httpapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify({
          api_key: apiKey,
          events: [eventData],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amplitude API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'identify_user') {
      if (!userId || !userProperties) {
        throw new Error('User ID and user properties are required for identifying users');
      }

      const identifyData = {
        user_id: userId,
        user_properties: JSON.parse(userProperties),
      };

      const response = await fetch('https://api2.amplitude.com/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify({
          api_key: apiKey,
          identification: [identifyData],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amplitude API error: ${errorText}`);
      }

      result = await response.json();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Amplitude action error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
