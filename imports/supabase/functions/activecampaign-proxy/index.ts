import { corsHeaders } from '../_shared/cors.ts';

console.log('ActiveCampaign Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`ActiveCampaign Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, baseUrl, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('ActiveCampaign Proxy - API key is missing');
      throw new Error('ActiveCampaign API key is required');
    }

    if (!baseUrl) {
      console.error('ActiveCampaign Proxy - Base URL is missing');
      throw new Error('ActiveCampaign base URL is required');
    }

    console.log(`ActiveCampaign Proxy - Processing action: ${action}`);

    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'add_contact_to_account':
        endpoint = '/api/3/accountContacts';
        method = 'POST';
        requestBody = {
          accountContact: {
            contact: actionInputs.contactId,
            account: actionInputs.accountId,
          }
        };
        break;

      case 'add_tag':
        endpoint = '/api/3/contactTags';
        method = 'POST';
        requestBody = {
          contactTag: {
            contact: actionInputs.contactId,
            tag: actionInputs.tagId,
          }
        };
        break;

      case 'create_account':
        endpoint = '/api/3/accounts';
        method = 'POST';
        requestBody = {
          account: {
            name: actionInputs.name,
            accountUrl: actionInputs.accountUrl || '',
          }
        };
        break;

      case 'create_contact':
        endpoint = '/api/3/contacts';
        method = 'POST';
        requestBody = {
          contact: {
            email: actionInputs.email,
            firstName: actionInputs.firstName || '',
            lastName: actionInputs.lastName || '',
            phone: actionInputs.phone || '',
          }
        };
        break;

      case 'update_account':
        endpoint = `/api/3/accounts/${actionInputs.accountId}`;
        method = 'PUT';
        requestBody = {
          account: {
            name: actionInputs.name || '',
            accountUrl: actionInputs.accountUrl || '',
          }
        };
        break;

      case 'update_contact':
        endpoint = `/api/3/contacts/${actionInputs.contactId}`;
        method = 'PUT';
        requestBody = {
          contact: {
            email: actionInputs.email || '',
            firstName: actionInputs.firstName || '',
            lastName: actionInputs.lastName || '',
            phone: actionInputs.phone || '',
          }
        };
        break;

      case 'subscribe_unsubscribe_list':
        endpoint = '/api/3/contactLists';
        method = 'POST';
        requestBody = {
          contactList: {
            list: actionInputs.listId,
            contact: actionInputs.contactId,
            status: actionInputs.subscriptionStatus === 'subscribe' ? 1 : 2,
          }
        };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`ActiveCampaign Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`ActiveCampaign Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      console.error('ActiveCampaign Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('ActiveCampaign Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      contactId: result.contact?.id || result.contactTag?.contact || result.accountContact?.contact || null,
      accountId: result.account?.id || result.accountContact?.account || null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('ActiveCampaign Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      contactId: null,
      accountId: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});