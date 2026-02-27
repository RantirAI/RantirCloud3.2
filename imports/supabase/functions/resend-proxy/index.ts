import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_BASE = 'https://api.resend.com';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      apiKey, 
      from, 
      fromName, 
      to, 
      subject, 
      contentType, 
      content, 
      cc, 
      bcc, 
      replyTo, 
      tags,
      endpoint, 
      method, 
      requestBody 
    } = body;

    console.log('Resend proxy called with action:', action);

    if (!apiKey) {
      throw new Error('Resend API key is required');
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'send_email': {
        if (!to) {
          throw new Error('Recipient email (to) is required');
        }
        if (!from) {
          throw new Error('Sender email (from) is required');
        }
        if (!subject) {
          throw new Error('Email subject is required');
        }

        // Build email payload
        const toEmails = to.split(',').map((e: string) => e.trim()).filter(Boolean);
        const fromField = fromName ? `${fromName} <${from}>` : from;
        
        const emailPayload: Record<string, any> = {
          from: fromField,
          to: toEmails,
          subject,
        };

        // Add content based on type
        if (contentType === 'html') {
          emailPayload.html = content;
        } else {
          emailPayload.text = content;
        }

        // Add optional fields
        if (cc) {
          emailPayload.cc = cc.split(',').map((e: string) => e.trim()).filter(Boolean);
        }
        if (bcc) {
          emailPayload.bcc = bcc.split(',').map((e: string) => e.trim()).filter(Boolean);
        }
        if (replyTo) {
          emailPayload.reply_to = replyTo;
        }
        if (tags) {
          try {
            emailPayload.tags = JSON.parse(tags);
          } catch (e) {
            console.warn('Failed to parse tags, skipping:', e);
          }
        }

        console.log('Sending email to:', toEmails);

        response = await fetch(`${RESEND_API_BASE}/emails`, {
          method: 'POST',
          headers,
          body: JSON.stringify(emailPayload),
        });
        break;
      }

      case 'custom_api_call': {
        if (!endpoint) {
          throw new Error('API endpoint is required for custom API call');
        }

        const url = endpoint.startsWith('/') 
          ? `${RESEND_API_BASE}${endpoint}` 
          : `${RESEND_API_BASE}/${endpoint}`;

        console.log('Making custom API call to:', url);

        const fetchOptions: RequestInit = {
          method: method || 'GET',
          headers,
        };

        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method || '')) {
          try {
            fetchOptions.body = JSON.stringify(JSON.parse(requestBody));
          } catch (e) {
            throw new Error('Request body must be valid JSON');
          }
        }

        response = await fetch(url, fetchOptions);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', responseData);
      throw new Error(responseData.message || responseData.error || `Resend API error: ${response.status}`);
    }

    console.log('Resend operation successful:', responseData.id || 'no ID');

    return new Response(JSON.stringify({
      success: true,
      id: responseData.id,
      data: responseData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Resend proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
