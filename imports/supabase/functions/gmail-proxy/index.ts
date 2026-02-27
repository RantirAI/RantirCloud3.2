import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, action, ...params } = await req.json();

    if (!accessToken) {
      throw new Error("Missing Gmail access token");
    }

    let url = 'https://gmail.googleapis.com/gmail/v1';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'gmailSendEmail':
        url = `${url}/users/me/messages/send`;
        method = 'POST';
        
        // Construct email message
        const emailLines = [
          `To: ${params.to}`,
          params.cc ? `Cc: ${params.cc}` : '',
          params.bcc ? `Bcc: ${params.bcc}` : '',
          `Subject: ${params.subject}`,
          '',
          params.body
        ].filter(line => line !== '');
        
        const email = emailLines.join('\r\n');
        const encodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        body = JSON.stringify({
          raw: encodedEmail
        });
        break;
        
      case 'customApiCall':
        url = `${url}${params.endpoint}`;
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
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    return new Response(JSON.stringify({
      result,
      messageId: result.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Gmail proxy error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});