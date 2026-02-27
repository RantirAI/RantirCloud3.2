import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/errors.ts";

// Generate MD5 hash of email for Mailchimp subscriber lookup
async function getSubscriberHash(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      throw new Error("Missing Mailchimp API key");
    }

    // Extract datacenter from API key
    const datacenter = apiKey.split('-').pop();
    if (!datacenter) {
      throw new Error("Invalid Mailchimp API key format");
    }

    const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`;
    let url = baseUrl;
    let method = 'GET';
    let body: string | null = null;

    switch (action) {
      // === MEMBER ACTIONS ===
      case 'addMemberToList':
      case 'addSubscriber': // backward compatibility
        url = `${baseUrl}/lists/${params.listId}/members`;
        method = 'POST';
        body = JSON.stringify({
          email_address: params.email,
          status: params.status || 'subscribed',
          merge_fields: {
            FNAME: params.firstName || params.mergeFields?.FNAME || '',
            LNAME: params.lastName || params.mergeFields?.LNAME || '',
            PHONE: params.phone || params.mergeFields?.PHONE || '',
            ...params.mergeFields
          }
        });
        break;

      case 'updateSubscriberInList':
      case 'updateSubscriber': // backward compatibility
        const updateHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/members/${updateHash}`;
        method = 'PATCH';
        body = JSON.stringify({
          email_address: params.email,
          status: params.status,
          merge_fields: {
            FNAME: params.firstName || params.mergeFields?.FNAME || '',
            LNAME: params.lastName || params.mergeFields?.LNAME || '',
            PHONE: params.phone || params.mergeFields?.PHONE || '',
            ...params.mergeFields
          }
        });
        break;

      case 'archiveSubscriber':
      case 'removeSubscriber': // backward compatibility
        const archiveHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/members/${archiveHash}`;
        method = 'DELETE';
        break;

      case 'unsubscribeEmail':
        const unsubHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/members/${unsubHash}`;
        method = 'PATCH';
        body = JSON.stringify({ status: 'unsubscribed' });
        break;

      case 'findSubscriber':
      case 'getSubscriber': // backward compatibility
        const findHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/members/${findHash}`;
        break;

      // === NOTE ACTIONS ===
      case 'addNoteToSubscriber':
        const noteHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/members/${noteHash}/notes`;
        method = 'POST';
        body = JSON.stringify({ note: params.note });
        break;

      // === TAG ACTIONS ===
      case 'addSubscriberToTag':
        url = `${baseUrl}/lists/${params.listId}/segments/${params.tagId}/members`;
        method = 'POST';
        body = JSON.stringify({ email_address: params.email });
        break;

      case 'removeSubscriberFromTag':
        const tagHash = await getSubscriberHash(params.email);
        url = `${baseUrl}/lists/${params.listId}/segments/${params.tagId}/members/${tagHash}`;
        method = 'DELETE';
        break;

      case 'findTag':
        url = `${baseUrl}/lists/${params.listId}/segments?type=static`;
        break;

      // === CAMPAIGN ACTIONS ===
      case 'createCampaign':
        url = `${baseUrl}/campaigns`;
        method = 'POST';
        body = JSON.stringify({
          type: params.type || 'regular',
          recipients: {
            list_id: params.listId
          },
          settings: {
            subject_line: params.subject,
            from_name: params.fromName,
            reply_to: params.replyTo
          }
        });
        break;

      case 'getCampaignReport':
        url = `${baseUrl}/reports/${params.campaignId}`;
        break;

      case 'findCampaign':
        url = `${baseUrl}/campaigns`;
        break;

      case 'sendCampaign':
        url = `${baseUrl}/campaigns/${params.campaignId}/actions/send`;
        method = 'POST';
        break;

      // === AUDIENCE ACTIONS ===
      case 'createAudience':
        url = `${baseUrl}/lists`;
        method = 'POST';
        body = JSON.stringify({
          name: params.audienceName,
          contact: {
            company: params.company,
            address1: params.address,
            city: params.city,
            state: params.state,
            zip: params.zip,
            country: params.country
          },
          permission_reminder: params.permissionReminder,
          campaign_defaults: {
            from_name: params.fromName,
            from_email: params.fromEmail,
            subject: '',
            language: 'en'
          },
          email_type_option: true
        });
        break;

      case 'getAudiences':
        url = `${baseUrl}/lists?count=${params.limit || 10}`;
        break;

      // === E-COMMERCE ACTIONS ===
      case 'findCustomer':
        url = `${baseUrl}/ecommerce/stores/${params.storeId}/customers?email=${encodeURIComponent(params.email)}`;
        break;

      // === CUSTOM API CALL ===
      case 'customApiCall':
        url = `${baseUrl}${params.endpoint}`;
        method = params.method || 'GET';
        if (params.body && method !== 'GET') {
          body = JSON.stringify(params.body);
        }
        if (params.queryParams) {
          const searchParams = new URLSearchParams(params.queryParams);
          url += `?${searchParams.toString()}`;
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errorDetail = errBody.detail || errBody.title || `HTTP ${response.status}`;
      } catch {
        errorDetail = await response.text().catch(() => `HTTP ${response.status}`);
      }
      throw new Error(errorDetail);
    }

    const result = method === 'DELETE' ? { success: true } : await response.json();
    
    return new Response(JSON.stringify({
      result,
      subscriberId: result.id,
      status: 'success'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Mailchimp proxy error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error), success: false }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
