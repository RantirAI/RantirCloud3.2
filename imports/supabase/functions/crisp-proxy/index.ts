import { corsHeaders } from '../_shared/cors.ts';

const CRISP_API_BASE = 'https://api.crisp.chat/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      apiId,
      apiKey, 
      websiteId,
      sessionId,
      noteContent,
      email,
      nickname,
      contactData,
      state,
      searchQuery,
      peopleId,
      method,
      endpoint,
      requestBody
    } = body;

    console.log('Crisp proxy called with action:', action);

    if (!apiId || !apiKey) {
      throw new Error('API credentials are required');
    }

    if (!websiteId && action !== 'createCustomApiCall') {
      throw new Error('Website ID is required');
    }

    const authHeader = 'Basic ' + btoa(`${apiId}:${apiKey}`);
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'X-Crisp-Tier': 'plugin',
    };

    let response;
    let responseData;

    switch (action) {
      case 'addNoteToConversation': {
        if (!sessionId) {
          throw new Error('Session ID is required');
        }
        if (!noteContent) {
          throw new Error('Note content is required');
        }

        console.log('Adding note to conversation:', sessionId);

        const notePayload = {
          type: 'note',
          content: noteContent,
          from: 'operator',
          origin: 'chat',
        };

        response = await fetch(
          `${CRISP_API_BASE}/website/${websiteId}/conversation/${sessionId}/message`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(notePayload),
          }
        );

        responseData = await response.json();
        break;
      }

      case 'createConversation': {
        console.log('Creating conversation');
        
        response = await fetch(`${CRISP_API_BASE}/website/${websiteId}/conversation`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });

        responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.reason || 'Failed to create conversation');
        }

        const newSessionId = responseData.data?.session_id;

        // Update contact info if provided
        if (newSessionId && (email || nickname)) {
          const metaPayload: Record<string, any> = {};
          if (email) metaPayload.email = email;
          if (nickname) metaPayload.nickname = nickname;

          await fetch(`${CRISP_API_BASE}/website/${websiteId}/conversation/${newSessionId}/meta`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(metaPayload),
          });
        }

        responseData = { session_id: newSessionId, ...responseData.data };
        break;
      }

      case 'createOrUpdateContact': {
        if (!email) {
          throw new Error('Email is required');
        }

        console.log('Creating or updating contact:', email);

        // First, search for existing contact
        const searchResponse = await fetch(
          `${CRISP_API_BASE}/website/${websiteId}/people/profiles/1?search_text=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers,
          }
        );

        const searchData = await searchResponse.json();
        let existingPeopleId = null;

        if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
          // Find exact match
          const exactMatch = searchData.data.find((p: any) => p.email === email);
          if (exactMatch) {
            existingPeopleId = exactMatch.people_id;
          }
        }

        let updateData: Record<string, any> = { email };
        if (nickname) updateData.nickname = nickname;
        
        if (contactData) {
          try {
            const additionalData = typeof contactData === 'string' ? JSON.parse(contactData) : contactData;
            updateData = { ...updateData, ...additionalData };
          } catch (e) {
            console.warn('Invalid contact data JSON, ignoring');
          }
        }

        if (existingPeopleId) {
          // Update existing contact
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/people/profile/${existingPeopleId}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateData),
            }
          );
        } else {
          // Create new contact
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/people/profile`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(updateData),
            }
          );
        }

        responseData = await response.json();
        break;
      }

      case 'updateConversationState': {
        if (!sessionId) {
          throw new Error('Session ID is required');
        }
        if (!state) {
          throw new Error('State is required');
        }

        console.log('Updating conversation state:', sessionId, state);

        response = await fetch(
          `${CRISP_API_BASE}/website/${websiteId}/conversation/${sessionId}/state`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ state }),
          }
        );

        responseData = await response.json();
        break;
      }

      case 'findConversation': {
        console.log('Finding conversation');

        if (sessionId) {
          // Get specific conversation
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/conversation/${sessionId}`,
            {
              method: 'GET',
              headers,
            }
          );
        } else if (searchQuery) {
          // Search conversations
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/conversations/1?search_query=${encodeURIComponent(searchQuery)}`,
            {
              method: 'GET',
              headers,
            }
          );
        } else {
          // List recent conversations
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/conversations/1`,
            {
              method: 'GET',
              headers,
            }
          );
        }

        responseData = await response.json();
        break;
      }

      case 'findUserProfile': {
        console.log('Finding user profile');

        if (peopleId) {
          // Get specific profile
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/people/profile/${peopleId}`,
            {
              method: 'GET',
              headers,
            }
          );
        } else if (email) {
          // Search by email
          response = await fetch(
            `${CRISP_API_BASE}/website/${websiteId}/people/profiles/1?search_text=${encodeURIComponent(email)}`,
            {
              method: 'GET',
              headers,
            }
          );
        } else {
          throw new Error('Either email or peopleId is required');
        }

        responseData = await response.json();
        break;
      }

      case 'createCustomApiCall': {
        if (!endpoint) {
          throw new Error('Endpoint is required');
        }

        const httpMethod = method || 'GET';
        console.log('Custom API call:', httpMethod, endpoint);

        // Replace placeholders in endpoint
        let finalEndpoint = endpoint.replace('{websiteId}', websiteId || '');

        const fetchOptions: RequestInit = {
          method: httpMethod,
          headers,
        };

        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
          try {
            fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
          } catch (e) {
            fetchOptions.body = requestBody;
          }
        }

        response = await fetch(`${CRISP_API_BASE}${finalEndpoint}`, fetchOptions);
        responseData = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorMsg = responseData?.reason || responseData?.message || `Crisp API error: ${response.status}`;
      throw new Error(errorMsg);
    }

    console.log('Crisp operation successful');

    return new Response(JSON.stringify({
      success: true,
      sessionId: responseData?.session_id || responseData?.data?.session_id,
      data: responseData?.data || responseData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Crisp proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
