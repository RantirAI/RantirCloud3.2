import { corsHeaders } from '../_shared/cors.ts';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

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
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      htmlContent,
      textContent,
      templateId,
      templateParams,
      email,
      attributes,
      listIds,
      customEndpoint,
      customMethod,
      customBody
    } = body;

    if (!apiKey) {
      throw new Error('Brevo API key is required');
    }

    let apiUrl = '';
    let requestMethod = 'GET';
    let requestBody: any = null;

    // Build request based on action
    switch (action) {
      case 'send_email':
        apiUrl = `${BREVO_API_BASE}/smtp/email`;
        requestMethod = 'POST';
        
        const emailData: any = {
          sender: { email: fromEmail, name: fromName || fromEmail },
          to: [{ email: toEmail, name: toName || toEmail }],
          subject: subject
        };

        if (templateId) {
          emailData.templateId = templateId;
          if (templateParams) {
            emailData.params = templateParams;
          }
        } else {
          if (htmlContent) emailData.htmlContent = htmlContent;
          if (textContent) emailData.textContent = textContent;
        }

        requestBody = emailData;
        break;

      case 'create_contact':
        if (!email) {
          throw new Error('Email is required for create contact');
        }
        apiUrl = `${BREVO_API_BASE}/contacts`;
        requestMethod = 'POST';
        requestBody = {
          email: email,
          attributes: attributes || {},
          listIds: listIds || []
        };
        break;

      case 'update_contact':
        if (!email) {
          throw new Error('Email is required for update contact');
        }
        apiUrl = `${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`;
        requestMethod = 'PUT';
        requestBody = {
          attributes: attributes || {},
          listIds: listIds || []
        };
        break;

      case 'get_contact':
        if (!email) {
          throw new Error('Email is required for get contact');
        }
        apiUrl = `${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`;
        requestMethod = 'GET';
        break;

      case 'delete_contact':
        if (!email) {
          throw new Error('Email is required for delete contact');
        }
        apiUrl = `${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`;
        requestMethod = 'DELETE';
        break;

      case 'create_or_update_contact':
        if (!email) {
          throw new Error('Email is required for create or update contact');
        }
        
        // First, try to get the contact to see if it exists
        console.log(`Brevo Proxy: Checking if contact exists: ${email}`);
        const checkResponse = await fetch(`${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'api-key': apiKey,
            'Accept': 'application/json'
          }
        });

        if (checkResponse.ok) {
          // Contact exists, update it
          console.log(`Brevo Proxy: Contact exists, updating: ${email}`);
          apiUrl = `${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`;
          requestMethod = 'PUT';
          requestBody = {
            attributes: attributes || {},
            listIds: listIds || []
          };
        } else if (checkResponse.status === 404) {
          // Contact doesn't exist, create it
          console.log(`Brevo Proxy: Contact doesn't exist, creating: ${email}`);
          apiUrl = `${BREVO_API_BASE}/contacts`;
          requestMethod = 'POST';
          requestBody = {
            email: email,
            attributes: attributes || {},
            listIds: listIds || []
          };
        } else {
          // Some other error occurred while checking
          const errorData = await checkResponse.json().catch(() => ({}));
          throw new Error(`Failed to check contact existence: ${errorData.message || 'Unknown error'}`);
        }
        break;

      case 'add_to_list':
        if (!email || !listIds) {
          throw new Error('Email and list IDs are required for add to list');
        }
        apiUrl = `${BREVO_API_BASE}/contacts/lists/${listIds[0]}/contacts/add`;
        requestMethod = 'POST';
        requestBody = {
          emails: [email]
        };
        break;

      case 'remove_from_list':
        if (!email || !listIds) {
          throw new Error('Email and list IDs are required for remove from list');
        }
        apiUrl = `${BREVO_API_BASE}/contacts/lists/${listIds[0]}/contacts/remove`;
        requestMethod = 'POST';
        requestBody = {
          emails: [email]
        };
        break;

      case 'get_lists':
        apiUrl = `${BREVO_API_BASE}/contacts/lists`;
        requestMethod = 'GET';
        break;

      case 'custom_api_call': {
        if (!customEndpoint) {
          throw new Error('Custom endpoint is required for custom_api_call');
        }
        
        apiUrl = customEndpoint.startsWith('http') 
          ? customEndpoint 
          : `${BREVO_API_BASE}${customEndpoint}`;
        requestMethod = customMethod || 'GET';
        
        if (customBody && ['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
          requestBody = customBody;
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Brevo Proxy: Making ${requestMethod} request to ${apiUrl}`);

    // Make request to Brevo API
    const headers: Record<string, string> = {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(apiUrl, {
      method: requestMethod,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Brevo API Error:`, responseData);
      throw new Error(responseData.message || responseData.error || 'Brevo API request failed');
    }

    console.log(`Brevo Proxy: Successfully processed ${action}`);

    // Format response based on action
    let formattedResponse = {
      success: true,
      data: responseData,
    };

    if (action === 'send_email') {
      (formattedResponse as any).messageId = responseData.messageId;
    } else if (action === 'get_contact') {
      (formattedResponse as any).contact = responseData;
    } else if (action === 'get_lists') {
      (formattedResponse as any).lists = responseData.lists || [];
    }

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Brevo Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});