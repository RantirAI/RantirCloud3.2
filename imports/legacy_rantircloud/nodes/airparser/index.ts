import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const airparserNode: NodePlugin = {
  type: 'airparser',
  name: 'Airparser',
  description: 'Extract structured data from emails, PDFs, and documents using AI',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05c9572f76a9963596d7b_677c7f499272a25a2e877fb4_672ef7f8d88bcff7f66fcd79_airparser_80dd7f2890.png',
  color: '#F59E0B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Airparser API key'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Document Data', value: 'get_document' },
        { label: 'Upload Document', value: 'upload_document' },
        { label: 'List Documents', value: 'list_documents' },
        { label: 'List Inboxes', value: 'list_inboxes' }
      ],
      description: 'Select the Airparser action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'get_document':
        dynamicInputs.push(
          { name: 'document_id', label: 'Document ID', type: 'text', required: true, description: 'ID of the document to get parsed data from' }
        );
        break;

      case 'upload_document':
        dynamicInputs.push(
          { name: 'inbox_id', label: 'Inbox ID', type: 'text', required: true, description: 'ID of the inbox to upload to (found in your Airparser dashboard URL)' },
          { name: 'document_url', label: 'Document URL', type: 'text', required: true, description: 'URL of the document to upload' },
          { name: 'meta', label: 'Metadata (optional)', type: 'textarea', required: false, description: 'JSON metadata to attach to the document' }
        );
        break;

      case 'list_documents':
        dynamicInputs.push(
          { name: 'inbox_id', label: 'Inbox ID', type: 'text', required: true, description: 'ID of the inbox to list documents from' },
          { name: 'page', label: 'Page (optional)', type: 'number', required: false, description: 'Page number for pagination' },
          { name: 'from_date', label: 'From Date (optional)', type: 'text', required: false, description: 'From date in YYYY-MM-DD format' },
          { name: 'to_date', label: 'To Date (optional)', type: 'text', required: false, description: 'To date in YYYY-MM-DD format' }
        );
        break;

      case 'list_inboxes':
        // No additional inputs needed
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'data',
      type: 'object',
      description: 'The extracted data or response from Airparser'
    },
    {
      name: 'document_id',
      type: 'string',
      description: 'ID of the processed document'
    },
    {
      name: 'status',
      type: 'string',
      description: 'Processing status'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    }
  ],
  execute: async (inputs, context) => {
    try {
      // Call our Supabase Edge Function instead of direct API calls
      const { data, error } = await supabase.functions.invoke('airparser-proxy', {
        body: inputs
      });

      if (error) {
        throw new Error(`Proxy function error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        document_id: null,
        status: 'error',
        error: error.message
      };
    }
  }
};