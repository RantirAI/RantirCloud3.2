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
    const { apiKey, action, email, publicationId, subscriberId, status, customFields } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    const baseUrl = 'https://api.beehiiv.com/v2';
    let result;

    if (action === 'create_subscription') {
      if (!email || !publicationId) {
        throw new Error('Email and publication ID are required for creating subscriptions');
      }

      const subscriptionData: any = {
        email,
        publication_id: publicationId,
        reactivate_existing: false,
        send_welcome_email: true,
      };

      if (customFields) {
        subscriptionData.custom_fields = JSON.parse(customFields);
      }

      const response = await fetch(`${baseUrl}/publications/${publicationId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`beehiiv API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'get_subscription') {
      if (!subscriberId) {
        throw new Error('Subscriber ID is required for getting subscriptions');
      }

      const response = await fetch(`${baseUrl}/subscriptions/${subscriberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`beehiiv API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'update_subscription') {
      if (!subscriberId) {
        throw new Error('Subscriber ID is required for updating subscriptions');
      }

      const updateData: any = {};

      if (status) {
        updateData.status = status;
      }

      if (customFields) {
        updateData.custom_fields = JSON.parse(customFields);
      }

      const response = await fetch(`${baseUrl}/subscriptions/${subscriberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`beehiiv API error: ${errorText}`);
      }

      result = await response.json();
    } else if (action === 'delete_subscription') {
      if (!subscriberId) {
        throw new Error('Subscriber ID is required for deleting subscriptions');
      }

      const response = await fetch(`${baseUrl}/subscriptions/${subscriberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`beehiiv API error: ${errorText}`);
      }

      result = { success: true, message: 'Subscription deleted successfully' };
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('beehiiv action error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
