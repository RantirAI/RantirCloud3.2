import { corsHeaders } from '../_shared/cors.ts';

console.log('AI Answer Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`AI Answer Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('AI Answer Proxy - API key is missing');
      throw new Error('AI Answer API key is required');
    }

    console.log(`AI Answer Proxy - Processing action: ${action}`);

    const baseUrl = 'https://api.aianswer.ai';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'ask_question':
        endpoint = '/api/v1/ask';
        method = 'POST';
        requestBody = {
          question: actionInputs.question,
          context: actionInputs.context || '',
          model: actionInputs.model || 'gpt-3.5-turbo',
          max_tokens: actionInputs.maxTokens ? parseInt(actionInputs.maxTokens) : 1000,
          temperature: actionInputs.temperature ? parseFloat(actionInputs.temperature) : 0.7,
        };
        break;

      case 'create_knowledge_base':
        endpoint = '/api/v1/knowledge-bases';
        method = 'POST';
        requestBody = {
          name: actionInputs.knowledgeBaseName,
          description: actionInputs.description || '',
          documents: actionInputs.documents ? JSON.parse(actionInputs.documents) : [],
        };
        break;

      case 'get_knowledge_bases':
        endpoint = '/api/v1/knowledge-bases';
        break;

      case 'get_knowledge_base':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}`;
        break;

      case 'update_knowledge_base':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}`;
        method = 'PUT';
        requestBody = {
          name: actionInputs.knowledgeBaseName,
          description: actionInputs.description || '',
        };
        break;

      case 'delete_knowledge_base':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}`;
        method = 'DELETE';
        break;

      case 'add_document':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}/documents`;
        method = 'POST';
        requestBody = {
          title: actionInputs.documentTitle,
          content: actionInputs.content,
          url: actionInputs.url || '',
        };
        break;

      case 'get_documents':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}/documents`;
        break;

      case 'update_document':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}/documents/${actionInputs.documentId}`;
        method = 'PUT';
        requestBody = {
          title: actionInputs.documentTitle,
          content: actionInputs.content,
          url: actionInputs.url || '',
        };
        break;

      case 'delete_document':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}/documents/${actionInputs.documentId}`;
        method = 'DELETE';
        break;

      case 'search_knowledge_base':
        endpoint = `/api/v1/knowledge-bases/${actionInputs.knowledgeBaseId}/search`;
        method = 'POST';
        requestBody = {
          query: actionInputs.searchQuery,
          limit: actionInputs.limit ? parseInt(actionInputs.limit) : 10,
        };
        break;

      case 'custom_api_call':
        endpoint = actionInputs.endpoint;
        method = actionInputs.method || 'GET';
        if (actionInputs.requestBody) {
          try {
            requestBody = JSON.parse(actionInputs.requestBody);
          } catch (error) {
            throw new Error('Invalid JSON in request body');
          }
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`AI Answer Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`AI Answer Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      console.error('AI Answer Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('AI Answer Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      answer: !Array.isArray(result) && action === 'ask_question' ? result : null,
      knowledgeBases: Array.isArray(result) && action === 'get_knowledge_bases' ? result : null,
      knowledgeBase: !Array.isArray(result) && ['create_knowledge_base', 'get_knowledge_base', 'update_knowledge_base'].includes(action) ? result : null,
      documents: Array.isArray(result) && action === 'get_documents' ? result : null,
      document: !Array.isArray(result) && ['add_document', 'update_document'].includes(action) ? result : null,
      searchResults: Array.isArray(result) && action === 'search_knowledge_base' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('AI Answer Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      answer: null,
      knowledgeBases: null,
      knowledgeBase: null,
      documents: null,
      document: null,
      searchResults: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});