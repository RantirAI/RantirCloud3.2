import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, apiSecret, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.convertkit.com/v3';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      // Subscriber actions
      case 'getSubscriberById':
        endpoint = `/subscribers/${params.subscriberId}?api_secret=${apiSecret || apiKey}`;
        break;

      case 'getSubscriberByEmail':
        endpoint = `/subscribers?api_secret=${apiSecret || apiKey}&email_address=${encodeURIComponent(params.email)}`;
        break;

      case 'listSubscribers':
        const listParams = new URLSearchParams();
        listParams.append('api_secret', apiSecret || apiKey);
        if (params.page) listParams.append('page', params.page.toString());
        if (params.sortOrder) listParams.append('sort_order', params.sortOrder);
        if (params.sortField) listParams.append('sort_field', params.sortField);
        endpoint = `/subscribers?${listParams.toString()}`;
        break;

      case 'updateSubscriber':
        endpoint = `/subscribers/${params.subscriberId}`;
        method = 'PUT';
        body = {
          api_secret: apiSecret || apiKey,
          first_name: params.firstName || undefined,
          email_address: params.email || undefined,
          fields: params.fields ? JSON.parse(params.fields) : undefined,
        };
        break;

      case 'unsubscribeSubscriber':
        endpoint = '/unsubscribe';
        method = 'PUT';
        body = {
          api_secret: apiSecret || apiKey,
          email: params.email,
        };
        break;

      case 'listSubscriberTagsByEmail':
        endpoint = `/subscribers?api_secret=${apiSecret || apiKey}&email_address=${encodeURIComponent(params.email)}`;
        // Will need to get subscriber first, then get tags
        break;

      case 'listTagsBySubscriberId':
        endpoint = `/subscribers/${params.subscriberId}/tags?api_key=${apiKey}`;
        break;

      // Webhook actions
      case 'createWebhook':
        endpoint = '/automations/hooks';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          target_url: params.targetUrl,
          event: { name: params.event },
        };
        break;

      case 'deleteWebhook':
        endpoint = `/automations/hooks/${params.webhookId}`;
        method = 'DELETE';
        body = { api_secret: apiSecret || apiKey };
        break;

      // Custom Field actions
      case 'listFields':
        endpoint = `/custom_fields?api_key=${apiKey}`;
        break;

      case 'createField':
        endpoint = '/custom_fields';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          label: params.label,
        };
        break;

      case 'updateField':
        endpoint = `/custom_fields/${params.fieldId}`;
        method = 'PUT';
        body = {
          api_secret: apiSecret || apiKey,
          label: params.label,
        };
        break;

      case 'deleteField':
        endpoint = `/custom_fields/${params.fieldId}`;
        method = 'DELETE';
        body = { api_secret: apiSecret || apiKey };
        break;

      // Broadcast actions
      case 'listBroadcasts':
        endpoint = `/broadcasts?api_secret=${apiSecret || apiKey}`;
        break;

      case 'createBroadcast':
        endpoint = '/broadcasts';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          subject: params.subject,
          content: params.content,
          description: params.description || undefined,
          public: params.public === 'true',
        };
        break;

      case 'getBroadcastById':
        endpoint = `/broadcasts/${params.broadcastId}?api_secret=${apiSecret || apiKey}`;
        break;

      case 'updateBroadcast':
        endpoint = `/broadcasts/${params.broadcastId}`;
        method = 'PUT';
        body = {
          api_secret: apiSecret || apiKey,
          subject: params.subject || undefined,
          content: params.content || undefined,
          description: params.description || undefined,
        };
        break;

      case 'deleteBroadcast':
        endpoint = `/broadcasts/${params.broadcastId}`;
        method = 'DELETE';
        body = { api_secret: apiSecret || apiKey };
        break;

      case 'broadcastStats':
        endpoint = `/broadcasts/${params.broadcastId}/stats?api_secret=${apiSecret || apiKey}`;
        break;

      // Form actions
      case 'listForms':
        endpoint = `/forms?api_key=${apiKey}`;
        break;

      case 'addSubscriberToForm':
        endpoint = `/forms/${params.formId}/subscribe`;
        method = 'POST';
        body = {
          api_key: apiKey,
          email: params.email,
          first_name: params.firstName || undefined,
          fields: params.fields ? JSON.parse(params.fields) : undefined,
        };
        break;

      case 'listFormSubscriptions':
        const formSubParams = new URLSearchParams();
        formSubParams.append('api_secret', apiSecret || apiKey);
        if (params.page) formSubParams.append('page', params.page.toString());
        endpoint = `/forms/${params.formId}/subscriptions?${formSubParams.toString()}`;
        break;

      // Sequence actions
      case 'listSequences':
        endpoint = `/sequences?api_key=${apiKey}`;
        break;

      case 'addSubscriberToSequence':
        endpoint = `/sequences/${params.sequenceId}/subscribe`;
        method = 'POST';
        body = {
          api_key: apiKey,
          email: params.email,
          first_name: params.firstName || undefined,
          fields: params.fields ? JSON.parse(params.fields) : undefined,
        };
        break;

      case 'listSubscriptionsToSequence':
        const seqSubParams = new URLSearchParams();
        seqSubParams.append('api_secret', apiSecret || apiKey);
        if (params.page) seqSubParams.append('page', params.page.toString());
        endpoint = `/sequences/${params.sequenceId}/subscriptions?${seqSubParams.toString()}`;
        break;

      // Tag actions
      case 'listTags':
        endpoint = `/tags?api_key=${apiKey}`;
        break;

      case 'createTag':
        endpoint = '/tags';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          tag: { name: params.tagName },
        };
        break;

      case 'tagSubscriber':
        endpoint = `/tags/${params.tagId}/subscribe`;
        method = 'POST';
        body = {
          api_key: apiKey,
          email: params.email,
          first_name: params.firstName || undefined,
        };
        break;

      case 'removeTagFromSubscriberByEmail':
        endpoint = `/tags/${params.tagId}/unsubscribe`;
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          email: params.email,
        };
        break;

      case 'removeTagFromSubscriberById':
        endpoint = `/subscribers/${params.subscriberId}/tags/${params.tagId}`;
        method = 'DELETE';
        endpoint += `?api_secret=${apiSecret || apiKey}`;
        break;

      case 'listSubscriptionsToATag':
        const tagSubParams = new URLSearchParams();
        tagSubParams.append('api_secret', apiSecret || apiKey);
        if (params.page) tagSubParams.append('page', params.page.toString());
        endpoint = `/tags/${params.tagId}/subscriptions?${tagSubParams.toString()}`;
        break;

      // Purchase actions
      case 'listPurchases':
        endpoint = `/purchases?api_secret=${apiSecret || apiKey}`;
        break;

      case 'getPurchaseById':
        endpoint = `/purchases/${params.purchaseId}?api_secret=${apiSecret || apiKey}`;
        break;

      case 'createSinglePurchase':
        endpoint = '/purchases';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          purchase: {
            email_address: params.email,
            transaction_id: params.transactionId,
            products: [{
              pid: params.productId,
              name: params.productName,
              lid: params.productId,
            }],
            currency: params.currency || 'USD',
            subtotal: params.subtotal,
            total: params.total,
          },
        };
        break;

      case 'createPurchases':
        endpoint = '/bulk/purchases';
        method = 'POST';
        body = {
          api_secret: apiSecret || apiKey,
          purchases: params.purchases ? JSON.parse(params.purchases) : [],
        };
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`ConvertKit: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && (contentType.includes('application/json') || contentType.includes('+json'));
    
    if (!isJsonResponse) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!response.ok) {
          console.error('ConvertKit API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('ConvertKit API - Non-JSON response:', text.substring(0, 500));
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'API returned non-JSON response',
          details: text.substring(0, 200)
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const data = await response.json();

    if (!response.ok) {
      console.error('ConvertKit API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract relevant data
    let items = null;
    let subscriberId = null;

    if (data.subscribers) items = data.subscribers;
    else if (data.tags) items = data.tags;
    else if (data.forms) items = data.forms;
    else if (data.sequences) items = data.sequences;
    else if (data.broadcasts) items = data.broadcasts;
    else if (data.custom_fields) items = data.custom_fields;
    else if (data.purchases) items = data.purchases;
    else if (data.subscriptions) items = data.subscriptions;

    if (data.subscription?.subscriber?.id) subscriberId = data.subscription.subscriber.id.toString();
    else if (data.subscriber?.id) subscriberId = data.subscriber.id.toString();

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      subscriberId,
      items,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ConvertKit proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
