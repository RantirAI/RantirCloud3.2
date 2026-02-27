import { NodePlugin } from '@/types/node-plugin';
import { FileText } from 'lucide-react';

export const googleDocsNode: NodePlugin = {
  type: 'google-docs',
  name: 'Google Docs',
  description: 'Create, read, edit and manage Google Docs documents',
  category: 'action',
  icon: FileText,
  color: '#4285F4',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Google OAuth2 access token for authentication',
      isApiKey: true
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Document', value: 'create_document' },
        { label: 'Append Text', value: 'append_text' },
        { label: 'Find Document', value: 'find_document' },
        { label: 'Read Document', value: 'read_document' },
        { label: 'Edit Template File', value: 'edit_template' },
        { label: 'Custom API Call', value: 'custom_api' }
      ],
      description: 'Select the Google Docs operation to perform'
    }
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The complete response from Google Docs API'
    },
    {
      name: 'documentId',
      type: 'string',
      description: 'The ID of the document'
    },
    {
      name: 'documentUrl',
      type: 'string',
      description: 'The URL of the document'
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content of the document (for read operations)'
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const dynamicInputs = [];
    const { action } = currentInputs;

    // Add action-specific inputs
    if (action) {
      switch (action) {
        case 'create_document':
          dynamicInputs.push(
            {
              name: 'documentTitle',
              label: 'Document Title',
              type: 'text',
              required: true,
              description: 'Title for the new document',
              placeholder: 'My New Document'
            },
            {
              name: 'initialContent',
              label: 'Initial Content',
              type: 'textarea',
              required: false,
              description: 'Initial text content for the document',
              placeholder: 'Enter initial content...'
            },
            {
              name: 'folderId',
              label: 'Folder ID',
              type: 'text',
              required: false,
              description: 'Google Drive folder ID to create the document in'
            }
          );
          break;

        case 'append_text':
          dynamicInputs.push(
            {
              name: 'documentId',
              label: 'Document ID',
              type: 'text',
              required: true,
              description: 'ID of the Google Doc to append text to'
            },
            {
              name: 'textToAppend',
              label: 'Text to Append',
              type: 'textarea',
              required: true,
              description: 'Text content to append to the document',
              placeholder: 'Enter text to append...'
            },
            {
              name: 'insertIndex',
              label: 'Insert Index',
              type: 'number',
              required: false,
              description: 'Position to insert text (leave empty to append at end)',
              placeholder: '1'
            }
          );
          break;

        case 'find_document':
          dynamicInputs.push(
            {
              name: 'searchQuery',
              label: 'Search Query',
              type: 'text',
              required: true,
              description: 'Search query to find documents',
              placeholder: 'name contains "report"'
            },
            {
              name: 'maxResults',
              label: 'Max Results',
              type: 'number',
              required: false,
              description: 'Maximum number of results to return',
              default: 10
            },
            {
              name: 'folderId',
              label: 'Folder ID',
              type: 'text',
              required: false,
              description: 'Search within specific folder (optional)'
            }
          );
          break;

        case 'read_document':
          dynamicInputs.push(
            {
              name: 'documentId',
              label: 'Document ID',
              type: 'text',
              required: true,
              description: 'ID of the Google Doc to read'
            },
            {
              name: 'includeFormatting',
              label: 'Include Formatting',
              type: 'boolean',
              required: false,
              description: 'Whether to include formatting information',
              default: false
            }
          );
          break;

        case 'edit_template':
          dynamicInputs.push(
            {
              name: 'templateDocumentId',
              label: 'Template Document ID',
              type: 'text',
              required: true,
              description: 'ID of the template document'
            },
            {
              name: 'newDocumentTitle',
              label: 'New Document Title',
              type: 'text',
              required: true,
              description: 'Title for the new document created from template'
            },
            {
              name: 'replacements',
              label: 'Text Replacements',
              type: 'code',
              language: 'json',
              required: false,
              description: 'JSON object with placeholder replacements',
              placeholder: '{\n  "{{name}}": "John Doe",\n  "{{date}}": "2024-01-01",\n  "{{company}}": "Acme Corp"\n}'
            },
            {
              name: 'folderId',
              label: 'Destination Folder ID',
              type: 'text',
              required: false,
              description: 'Folder to save the new document'
            }
          );
          break;

        case 'custom_api':
          dynamicInputs.push(
            {
              name: 'endpoint',
              label: 'API Endpoint',
              type: 'text',
              required: true,
              description: 'Google Docs API endpoint (without base URL)',
              placeholder: 'documents/DOCUMENT_ID'
            },
            {
              name: 'method',
              label: 'HTTP Method',
              type: 'select',
              required: true,
              options: [
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'PATCH', value: 'PATCH' },
                { label: 'DELETE', value: 'DELETE' }
              ],
              default: 'GET'
            },
            {
              name: 'requestBody',
              label: 'Request Body',
              type: 'code',
              language: 'json',
              required: false,
              description: 'JSON request body for POST/PUT/PATCH requests',
              placeholder: '{\n  "requests": [\n    {\n      "insertText": {\n        "location": {"index": 1},\n        "text": "Hello World"\n      }\n    }\n  ]\n}'
            },
            {
              name: 'queryParams',
              label: 'Query Parameters',
              type: 'code',
              language: 'json',
              required: false,
              description: 'Additional query parameters',
              placeholder: '{\n  "includeTabsContent": true\n}'
            }
          );
          break;
      }

      // Add field mapping for operations that handle dynamic data
      if (['append_text', 'edit_template', 'custom_api'].includes(action)) {
        dynamicInputs.push({
          name: 'fieldMapping',
          label: 'Field Mapping',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Dynamic field mapping configuration',
          placeholder: '{\n  "sourceField": "destinationField",\n  "userEmail": "{{email}}",\n  "userName": "{{name}}"\n}'
        });
      }
    }

    return dynamicInputs;
  },
  async execute(inputs, context) {
    const { action, accessToken, ...actionInputs } = inputs;

    // Use the provided access token for authentication
    if (!accessToken) {
      throw new Error('Access Token is required for Google Docs authentication');
    }

    try {
      // Use Supabase proxy function for Google Docs API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('google-docs-proxy', {
        body: {
          accessToken,
          action,
          ...actionInputs
        }
      });

      if (error) {
        throw new Error(`Google Docs proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Google Docs operation failed: ${error.message}`);
    }
  }
};