import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_DOCS_API_BASE = 'https://docs.googleapis.com/v1';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

interface GoogleDocsRequest {
  accessToken: string;
  action: string;
  documentTitle?: string;
  initialContent?: string;
  folderId?: string;
  documentId?: string;
  textToAppend?: string;
  insertIndex?: number;
  searchQuery?: string;
  maxResults?: number;
  includeFormatting?: boolean;
  templateDocumentId?: string;
  newDocumentTitle?: string;
  replacements?: string;
  endpoint?: string;
  method?: string;
  requestBody?: any;
  queryParams?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      accessToken,
      action,
      documentTitle,
      initialContent,
      folderId,
      documentId,
      textToAppend,
      insertIndex,
      searchQuery,
      maxResults,
      includeFormatting,
      templateDocumentId,
      newDocumentTitle,
      replacements,
      endpoint,
      method = 'GET',
      requestBody,
      queryParams
    }: GoogleDocsRequest = await req.json();

    if (!accessToken) {
      throw new Error('Google Docs access token is required');
    }

    console.log(`Google Docs Proxy: Processing action: ${action}`);

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    let result: any;
    let outputDocumentId: string = '';
    let documentUrl: string = '';
    let content: string = '';

    switch (action) {
      case 'create_document': {
        // First create the document
        const createResponse = await fetch(`${GOOGLE_DOCS_API_BASE}/documents`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: documentTitle
          })
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create document: ${createResponse.statusText}`);
        }

        const document = await createResponse.json();
        outputDocumentId = document.documentId;
        documentUrl = `https://docs.google.com/document/d/${outputDocumentId}`;

        // Move to folder if specified
        if (folderId) {
          await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${outputDocumentId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              addParents: folderId
            })
          });
        }

        // Add initial content if provided
        if (initialContent) {
          await fetch(`${GOOGLE_DOCS_API_BASE}/documents/${outputDocumentId}:batchUpdate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              requests: [{
                insertText: {
                  location: { index: 1 },
                  text: initialContent
                }
              }]
            })
          });
        }

        result = document;
        break;
      }

      case 'append_text': {
        outputDocumentId = documentId!;
        documentUrl = `https://docs.google.com/document/d/${outputDocumentId}`;

        // Get document to find the end index
        const docResponse = await fetch(`${GOOGLE_DOCS_API_BASE}/documents/${outputDocumentId}`, {
          headers
        });

        if (!docResponse.ok) {
          throw new Error(`Failed to read document: ${docResponse.statusText}`);
        }

        const doc = await docResponse.json();
        const endIndex = insertIndex || doc.body.content[doc.body.content.length - 1].endIndex - 1;

        // Append text
        const response = await fetch(`${GOOGLE_DOCS_API_BASE}/documents/${outputDocumentId}:batchUpdate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            requests: [{
              insertText: {
                location: { index: endIndex },
                text: textToAppend
              }
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to append text: ${response.statusText}`);
        }

        result = await response.json();
        break;
      }

      case 'find_document': {
        let searchUrl = `${GOOGLE_DRIVE_API_BASE}/files?q=mimeType='application/vnd.google-apps.document'`;
        
        if (searchQuery) {
          searchUrl += ` and ${searchQuery}`;
        }
        
        if (folderId) {
          searchUrl += ` and '${folderId}' in parents`;
        }

        if (maxResults) {
          searchUrl += `&pageSize=${maxResults}`;
        }

        const response = await fetch(searchUrl, { headers });

        if (!response.ok) {
          throw new Error(`Failed to search documents: ${response.statusText}`);
        }

        result = await response.json();
        break;
      }

      case 'read_document': {
        outputDocumentId = documentId!;
        documentUrl = `https://docs.google.com/document/d/${outputDocumentId}`;

        const response = await fetch(`${GOOGLE_DOCS_API_BASE}/documents/${outputDocumentId}`, {
          headers
        });

        if (!response.ok) {
          throw new Error(`Failed to read document: ${response.statusText}`);
        }

        const document = await response.json();
        
        // Extract text content
        content = '';
        if (document.body && document.body.content) {
          for (const element of document.body.content) {
            if (element.paragraph) {
              for (const textElement of element.paragraph.elements || []) {
                if (textElement.textRun) {
                  content += textElement.textRun.content;
                }
              }
            }
          }
        }

        result = document;
        break;
      }

      case 'edit_template': {
        // First, copy the template
        const copyResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${templateDocumentId}/copy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: newDocumentTitle
          })
        });

        if (!copyResponse.ok) {
          throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
        }

        const newDoc = await copyResponse.json();
        outputDocumentId = newDoc.id;
        documentUrl = `https://docs.google.com/document/d/${outputDocumentId}`;

        // Apply replacements if provided
        if (replacements) {
          const replacementObj = typeof replacements === 'string' ? JSON.parse(replacements) : replacements;
          const requests = [];

          for (const [placeholder, value] of Object.entries(replacementObj)) {
            requests.push({
              replaceAllText: {
                containsText: {
                  text: placeholder,
                  matchCase: false
                },
                replaceText: value as string
              }
            });
          }

          if (requests.length > 0) {
            await fetch(`${GOOGLE_DOCS_API_BASE}/documents/${outputDocumentId}:batchUpdate`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ requests })
            });
          }
        }

        // Move to folder if specified
        if (folderId) {
          await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${outputDocumentId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              addParents: folderId
            })
          });
        }

        result = newDoc;
        break;
      }

      case 'custom_api': {
        let url = `${GOOGLE_DOCS_API_BASE}/${endpoint}`;
        
        // Add query parameters if provided
        if (queryParams) {
          const params = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, value as string);
          });
          url += `?${searchParams.toString()}`;
        }

        const requestOptions: RequestInit = {
          method,
          headers
        };

        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
          requestOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
        }

        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`Custom API call failed: ${response.statusText}`);
        }

        result = await response.json();
        break;
      }

      default:
        throw new Error(`Unsupported Google Docs action: ${action}`);
    }

    console.log(`Google Docs Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      result,
      documentId: outputDocumentId,
      documentUrl,
      content,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google Docs Proxy Error:', error);
    return new Response(JSON.stringify({
      result: null,
      documentId: '',
      documentUrl: '',
      content: '',
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});