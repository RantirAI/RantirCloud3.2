import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      connectionString, 
      action, 
      to, 
      from, 
      subject, 
      message 
    } = await req.json();

    if (!connectionString) {
      throw new Error('Connection string is required');
    }

    console.log(`[Azure Communication Services] Action: ${action}`);

    if (action !== 'sendEmail') {
      throw new Error(`Unknown action: ${action}`);
    }

    if (!to || !from || !subject || !message) {
      throw new Error('To, from, subject, and message are required');
    }

    // Parse connection string to get endpoint
    const endpointMatch = connectionString.match(/endpoint=([^;]+)/i);
    if (!endpointMatch) {
      throw new Error('Invalid connection string format');
    }

    const endpoint = endpointMatch[1];
    const url = `${endpoint}/emails:send?api-version=2023-03-31`;

    // Parse access key from connection string
    const keyMatch = connectionString.match(/accesskey=([^;]+)/i);
    if (!keyMatch) {
      throw new Error('Access key not found in connection string');
    }

    const accessKey = keyMatch[1];

    console.log(`[Azure Communication Services] Sending email to: ${to}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessKey}`,
      },
      body: JSON.stringify({
        senderAddress: from,
        recipients: {
          to: [{ address: to }]
        },
        content: {
          subject: subject,
          plainText: message
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Azure Communication Services] Error:', errorData);
      throw new Error('Failed to send email via Azure Communication Services');
    }

    const responseData = response.status === 202 ? { messageId: response.headers.get('x-ms-request-id') } : await response.json();

    console.log('[Azure Communication Services] Success');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Azure Communication Services] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
