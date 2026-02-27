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

    const baseUrl = 'https://api.contextual.ai/v1';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;
    let useFormData = false;

    switch (action) {
      case 'queryAgent':
        endpoint = `/agents/${params.agentId}/query`;
        body = {
          messages: [
            {
              role: 'user',
              content: params.query,
            }
          ],
          conversation_id: params.conversationId || undefined,
          stream: params.streamResponse === 'true',
          retrieve_strategy: params.retrieveStrategy || 'auto',
        };
        break;

      case 'generate':
        // Contextual AI /generate endpoint requires model and messages array
        endpoint = '/generate';
        const messages: any[] = [];
        
        // Add user message
        messages.push({
          role: 'user',
          content: params.prompt,
        });

        body = {
          model: params.model || 'v2',  // Required - 'v1' or 'v2'
          messages,
          system_prompt: params.systemPrompt || undefined,
          temperature: parseFloat(params.temperature) || 0,
          top_p: parseFloat(params.topP) || 0.9,
          max_new_tokens: parseInt(params.maxTokens) || 1024,
          avoid_commentary: params.avoidCommentary === 'true',
        };

        // Add knowledge context if provided (for RAG)
        if (params.knowledge) {
          try {
            body.knowledge = JSON.parse(params.knowledge);
          } catch {
            // If not valid JSON, treat as single knowledge item
            body.knowledge = [params.knowledge];
          }
        }
        break;

      case 'ingestDocument':
        endpoint = `/datastores/${params.datastoreId}/documents`;
        body = {
          url: params.documentUrl || undefined,
          content: params.documentContent || undefined,
          name: params.documentName || undefined,
          metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
        };
        break;

      case 'parseFile':
        // Parse endpoint requires multipart/form-data with file upload
        // We need to fetch the file from URL and re-upload it
        endpoint = '/parse';
        
        if (!params.fileUrl) {
          throw new Error('File URL is required for parseFile action');
        }

        try {
          // Fetch the file from the provided URL
          const fileResponse = await fetch(params.fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
          }

          const fileBlob = await fileResponse.blob();
          
          // Extract filename from URL or use default
          const urlParts = params.fileUrl.split('/');
          const fileName = urlParts[urlParts.length - 1] || 'document.pdf';

          // Create FormData for multipart upload
          const formData = new FormData();
          formData.append('raw_file', fileBlob, fileName);
          formData.append('output_type', params.outputType || 'markdown-document');
          
          if (params.parseMode) {
            formData.append('parse_mode', params.parseMode);
          }

          console.log(`Contextual AI Parse: POST ${baseUrl}${endpoint}`);

          const parseResponse = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              // Don't set Content-Type for FormData - browser/fetch will set it with boundary
            },
            body: formData,
          });

          const parseContentType = parseResponse.headers.get('content-type');
          const isParseJsonResponse = parseContentType && (parseContentType.includes('application/json') || parseContentType.includes('+json'));
          
          if (!isParseJsonResponse) {
            const text = await parseResponse.text();
            try {
              const parseData = JSON.parse(text);
              if (!parseResponse.ok) {
                return new Response(JSON.stringify({ success: false, error: parseData.message || parseData.error || 'Parse failed', details: parseData }), {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
              return new Response(JSON.stringify({ success: true, data: parseData, result: parseData.content || parseData.text || parseData.markdown || null }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } catch {
              console.error('Contextual AI Parse - Non-JSON response:', text.substring(0, 500));
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

          const parseData = await parseResponse.json();

          if (!parseResponse.ok) {
            console.error('Contextual AI Parse error:', parseData);
            return new Response(JSON.stringify({ 
              success: false, 
              error: parseData.message || parseData.error || 'Parse failed', 
              details: parseData 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ 
            success: true, 
            data: parseData,
            result: parseData.content || parseData.text || parseData.markdown || null,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (fetchError) {
          console.error('File fetch error:', fetchError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to fetch and parse file: ${fetchError.message}` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      case 'createAgent':
        endpoint = '/agents';
        body = {
          name: params.agentName,
          description: params.description || undefined,
          datastore_ids: params.datastoreIds ? params.datastoreIds.split(',').map((id: string) => id.trim()) : undefined,
          system_prompt: params.systemPrompt || undefined,
          model: params.model || undefined,
        };
        break;

      case 'inviteUsers':
        endpoint = '/users/invite';
        body = {
          emails: params.emails.split(',').map((email: string) => email.trim()),
          role: params.role,
          agent_ids: params.agentIds ? params.agentIds.split(',').map((id: string) => id.trim()) : undefined,
        };
        break;

      case 'createDatastore':
        endpoint = '/datastores';
        body = {
          name: params.datastoreName,
          description: params.description || undefined,
          embedding_model: params.embeddingModel || undefined,
          chunk_size: params.chunkSize ? parseInt(params.chunkSize) : undefined,
          chunk_overlap: params.chunkOverlap ? parseInt(params.chunkOverlap) : undefined,
        };
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Contextual AI: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
          console.error('Contextual AI API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('Contextual AI API - Non-JSON response:', text.substring(0, 500));
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
      console.error('Contextual AI API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      result: data.response || data.message?.content || data.text || data.content || data.result || null,
      agentId: data.id || data.agent_id || null,
      datastoreId: data.id || data.datastore_id || null,
      documentId: data.id || data.document_id || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contextual AI proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
