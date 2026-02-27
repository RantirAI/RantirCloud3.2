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
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Correct base URL for Cody AI API
    const baseUrl = 'https://getcody.ai/api/v1';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'sendMessage': {
        // POST /messages - Send a message to a conversation
        // Auto-create conversation if not provided
        let conversationId = params.conversationId?.toString().trim();
        const botId = params.botId?.toString().trim();
        
        if (!conversationId) {
          if (!botId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Either conversationId or botId is required. Provide botId to auto-create a new conversation.',
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Create a new conversation first
          console.log('Cody: Creating new conversation for bot:', botId);
          const createConvResponse = await fetch(`${baseUrl}/conversations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: params.conversationName || 'New Conversation',
              bot_id: botId,
            }),
          });
          
          const convData = await createConvResponse.json();
          
          if (!createConvResponse.ok) {
            console.error('Cody: Failed to create conversation:', convData);
            return new Response(JSON.stringify({
              success: false,
              error: convData.message || 'Failed to create conversation',
              details: convData,
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          conversationId = convData.data?.id || convData.id;
          console.log('Cody: Created new conversation:', conversationId);
        }
        
        endpoint = '/messages';
        body = {
          content: params.message || params.content,
          conversation_id: conversationId,
        };
        // Store for response handling
        params._autoCreatedConversation = !params.conversationId;
        params._conversationId = conversationId;
        break;
      }

      case 'createConversation':
        // POST /conversations - Create a new conversation
        endpoint = '/conversations';
        body = {
          name: params.name || 'New Conversation',
          bot_id: params.botId,
        };
        break;

      case 'getConversations':
        // GET /conversations - List all conversations
        endpoint = '/conversations';
        method = 'GET';
        if (params.botId) {
          endpoint += `?bot_id=${params.botId}`;
        }
        break;

      case 'getConversation':
        // GET /conversations/{id} - Get specific conversation
        endpoint = `/conversations/${params.conversationId}`;
        method = 'GET';
        break;

      case 'findConversation':
        // GET /conversations with optional filter
        if (params.conversationId) {
          endpoint = `/conversations/${params.conversationId}`;
        } else {
          endpoint = '/conversations';
          if (params.botId) {
            endpoint += `?bot_id=${params.botId}`;
          }
        }
        method = 'GET';
        break;

      case 'deleteConversation':
        // DELETE /conversations/{id}
        endpoint = `/conversations/${params.conversationId}`;
        method = 'DELETE';
        break;

      case 'getBots':
        // GET /bots - List all bots
        endpoint = '/bots';
        method = 'GET';
        break;

      case 'getBot':
        // GET /bots/{id} - Get specific bot
        endpoint = `/bots/${params.botId}`;
        method = 'GET';
        break;

      case 'findBot':
        // GET /bots or GET /bots/{id}
        if (params.botId) {
          endpoint = `/bots/${params.botId}`;
        } else {
          endpoint = '/bots';
        }
        method = 'GET';
        break;

      case 'createDocumentFromText':
      case 'createDocument':
        // POST /documents - Create a document from text content
        endpoint = '/documents';
        body = {
          name: params.name,
          folder_id: params.folderId,
          content: params.content, // API expects content only, no bot_id
        };
        break;

      case 'uploadFile':
        // Two-step file upload process:
        // 1. Get signed URL: POST /uploads/signed-url
        // 2. Upload file to signed URL (client-side)
        // 3. Create document: POST /documents/file
        
        // Step 1: Get signed URL
        const signedUrlResponse = await fetch(`${baseUrl}/uploads/signed-url`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_name: params.fileName,
            content_type: params.contentType || 'application/octet-stream',
          }),
        });

        if (!signedUrlResponse.ok) {
          const errorData = await signedUrlResponse.json();
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to get signed URL',
            details: errorData,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const signedUrlData = await signedUrlResponse.json();
        
        // If returnSignedUrl is true, return the signed URL for client-side upload
        if (params.returnSignedUrl) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              signedUrl: signedUrlData.url,
              key: signedUrlData.key,
              expiresAt: signedUrlData.expires_at,
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If key is provided (file already uploaded), create document from file
        if (params.key) {
          const createDocResponse = await fetch(`${baseUrl}/documents/file`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folder_id: params.folderId,
              key: params.key,
            }),
          });

          const docData = await createDocResponse.json();
          
          if (!createDocResponse.ok) {
            return new Response(JSON.stringify({
              success: false,
              error: docData.message || 'Failed to create document from file',
              details: docData,
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: docData,
            documentId: docData.id,
            message: 'File uploaded successfully',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Return signed URL data for manual upload
        return new Response(JSON.stringify({
          success: true,
          data: {
            signedUrl: signedUrlData.url,
            key: signedUrlData.key,
            message: 'Upload file to signedUrl, then call createDocumentFromFile with the key',
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'createDocumentFromFile':
        // POST /documents/file - Create document from uploaded file
        endpoint = '/documents/file';
        body = {
          folder_id: params.folderId,
          key: params.key,
        };
        break;

      case 'getDocuments':
        // GET /documents - List documents
        endpoint = '/documents';
        method = 'GET';
        if (params.folderId) {
          endpoint += `?folder_id=${params.folderId}`;
        }
        break;

      case 'deleteDocument':
        // DELETE /documents/{id}
        endpoint = `/documents/${params.documentId}`;
        method = 'DELETE';
        break;

      case 'getFolders':
        // GET /folders - List folders
        endpoint = '/folders';
        method = 'GET';
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Cody: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Cody API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format responses based on action
    if (action === 'sendMessage') {
      return new Response(JSON.stringify({
        success: true,
        data,
        response: data.content || data.message,
        conversationId: params._conversationId || data.conversation_id,
        messageId: data.id,
        newConversationCreated: params._autoCreatedConversation || false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'createDocumentFromText' || action === 'createDocument') {
      return new Response(JSON.stringify({
        success: true,
        data,
        documentId: data.id,
        message: 'Document created successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'findBot') {
      if (Array.isArray(data) || data.data) {
        const bots = data.data || data;
        if (params.botName) {
          const filtered = bots.filter((b: any) => 
            b.name?.toLowerCase().includes(params.botName.toLowerCase())
          );
          return new Response(JSON.stringify({
            success: true,
            data: filtered,
            bot: filtered[0] || null,
            botId: filtered[0]?.id || null,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({
          success: true,
          data: bots,
          bot: bots[0] || null,
          botId: bots[0]?.id || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data,
        bot: data,
        botId: data.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'findConversation') {
      if (Array.isArray(data) || data.data) {
        const conversations = data.data || data;
        return new Response(JSON.stringify({
          success: true,
          data: conversations,
          conversation: conversations[0] || null,
          conversationId: conversations[0]?.id || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data,
        conversation: data,
        conversationId: data.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'createConversation') {
      return new Response(JSON.stringify({
        success: true,
        data,
        conversationId: data.id,
        conversation: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cody proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
