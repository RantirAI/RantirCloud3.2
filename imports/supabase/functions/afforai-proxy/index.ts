import { corsHeaders } from '../_shared/cors.ts';

console.log('Afforai Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Afforai Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('Afforai Proxy - API key is missing');
      throw new Error('Afforai API key is required');
    }

    console.log(`Afforai Proxy - Processing action: ${action}`);

    const baseUrl = 'https://api.afforai.com';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'create_document':
        endpoint = '/api/v1/documents';
        method = 'POST';
        requestBody = {
          name: actionInputs.documentName,
          content: actionInputs.content,
          type: actionInputs.documentType || 'text',
          library_id: actionInputs.libraryId,
        };
        break;

      case 'get_documents':
        endpoint = '/api/v1/documents';
        if (actionInputs.libraryId) {
          endpoint += `?library_id=${actionInputs.libraryId}`;
        }
        break;

      case 'get_document':
        endpoint = `/api/v1/documents/${actionInputs.documentId}`;
        break;

      case 'update_document':
        endpoint = `/api/v1/documents/${actionInputs.documentId}`;
        method = 'PUT';
        requestBody = {
          name: actionInputs.documentName,
          content: actionInputs.content,
        };
        break;

      case 'delete_document':
        endpoint = `/api/v1/documents/${actionInputs.documentId}`;
        method = 'DELETE';
        break;

      case 'ask_question':
        endpoint = '/api/v1/chat';
        method = 'POST';
        requestBody = {
          question: actionInputs.question,
          library_id: actionInputs.libraryId,
          document_ids: actionInputs.documentIds ? actionInputs.documentIds.split(',') : [],
          model: actionInputs.model || 'gpt-3.5-turbo',
        };
        break;

      case 'get_libraries':
        endpoint = '/api/v1/libraries';
        break;

      case 'create_library':
        endpoint = '/api/v1/libraries';
        method = 'POST';
        requestBody = {
          name: actionInputs.libraryName,
          description: actionInputs.description || '',
        };
        break;

      case 'update_library':
        endpoint = `/api/v1/libraries/${actionInputs.libraryId}`;
        method = 'PUT';
        requestBody = {
          name: actionInputs.libraryName,
          description: actionInputs.description || '',
        };
        break;

      case 'delete_library':
        endpoint = `/api/v1/libraries/${actionInputs.libraryId}`;
        method = 'DELETE';
        break;

      case 'upload_file':
        endpoint = '/api/v1/documents/upload';
        method = 'POST';
        requestBody = {
          file_url: actionInputs.fileUrl,
          name: actionInputs.fileName,
          library_id: actionInputs.libraryId,
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

    console.log(`Afforai Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Afforai Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      console.error('Afforai Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Afforai Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      documents: Array.isArray(result) && action === 'get_documents' ? result : null,
      document: !Array.isArray(result) && ['create_document', 'get_document', 'update_document', 'upload_file'].includes(action) ? result : null,
      libraries: Array.isArray(result) && action === 'get_libraries' ? result : null,
      library: !Array.isArray(result) && ['create_library', 'update_library'].includes(action) ? result : null,
      answer: !Array.isArray(result) && action === 'ask_question' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Afforai Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      documents: null,
      document: null,
      libraries: null,
      library: null,
      answer: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});