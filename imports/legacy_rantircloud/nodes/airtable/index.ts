import { NodePlugin } from '@/types/node-plugin';
import { AirtableIcon } from '@/components/flow/icons/AirtableIcon';

export const airtableNode: NodePlugin = {
  type: 'airtable',
  name: 'Airtable',
  description: 'Connect to Airtable to manage your data and records across bases and tables',
  category: 'action',
  icon: AirtableIcon,
  color: '#FFBF3F',
  inputs: [
    {
      name: 'apiKey',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Airtable access token',
      placeholder: 'pat1234567890abcdef...',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'List Bases', value: 'list_bases', description: 'Get all accessible bases' },
        { label: 'List Tables', value: 'list_tables', description: 'Get tables from a specific base' },
        { label: 'List Records', value: 'list_records', description: 'Get records from a table' },
        { label: 'Get Record', value: 'get_record', description: 'Get a specific record by ID' },
        { label: 'Create Record', value: 'create_record', description: 'Create a new record' },
        { label: 'Update Record', value: 'update_record', description: 'Update an existing record' },
        { label: 'Delete Record', value: 'delete_record', description: 'Delete a record' },
      ],
      description: 'Choose the action to perform with Airtable',
      dependsOnApiKey: true,
    },
  ],
  // Dynamic inputs function to show fields based on selected action
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Base ID - required for all actions except list_bases
    if (action && action !== 'list_bases') {
      dynamicInputs.push({
        name: 'baseId',
        label: 'Base ID',
        type: 'text',
        required: true,
        description: 'The ID of the Airtable base',
        placeholder: 'app1234567890abcd',
      });
    }

    // Table ID - required for record operations
    if (['list_records', 'get_record', 'create_record', 'update_record', 'delete_record'].includes(action)) {
      dynamicInputs.push({
        name: 'tableId',
        label: 'Table ID',
        type: 'text',
        required: true,
        description: 'The ID or name of the table',
        placeholder: 'tblXXXXXXXXXXXXXX or Table Name',
      });
    }

    // Record ID - required for get, update, delete operations
    if (['get_record', 'update_record', 'delete_record'].includes(action)) {
      dynamicInputs.push({
        name: 'recordId',
        label: 'Record ID',
        type: 'text',
        required: true,
        description: 'The ID of the record',
        placeholder: 'recXXXXXXXXXXXXXX',
      });
    }

    // Fields - required for create and update operations
    if (['create_record', 'update_record'].includes(action)) {
      dynamicInputs.push({
        name: 'fields',
        label: 'Fields',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON object with field values',
        placeholder: '{\n  "Name": "John Doe",\n  "Email": "john@example.com",\n  "Status": "Active"\n}',
      });
    }

    // List-specific fields - only for list_records
    if (action === 'list_records') {
      dynamicInputs.push(
        {
          name: 'filterByFormula',
          label: 'Filter Formula',
          type: 'text',
          required: false,
          description: 'Airtable formula to filter records',
          placeholder: '{Status} = "Active"',
        },
        {
          name: 'sort',
          label: 'Sort',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON array of sort objects',
          placeholder: '[{"field": "Created", "direction": "desc"}]',
        },
        {
          name: 'maxRecords',
          label: 'Max Records',
          type: 'number',
          required: false,
          description: 'Maximum number of records to return (1-100)',
          default: 100,
        },
        {
          name: 'offset',
          label: 'Offset',
          type: 'text',
          required: false,
          description: 'Pagination offset for next page',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Airtable',
    },
    {
      name: 'records',
      type: 'array',
      description: 'Array of records (for list operations)',
    },
    {
      name: 'record',
      type: 'object',
      description: 'Single record data (for get/create/update operations)',
    },
    {
      name: 'offset',
      type: 'string',
      description: 'Pagination offset for next page (if available)',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { 
      action, 
      apiKey, 
      baseId, 
      tableId, 
      recordId, 
      fields, 
      filterByFormula, 
      sort, 
      maxRecords, 
      offset 
    } = inputs;

    // Use the access token directly
    const airtableApiKey = apiKey;
    
    if (!airtableApiKey) {
      throw new Error('Airtable access token is required');
    }

    // Validate required fields based on action
    if (action !== 'list_bases' && !baseId) {
      throw new Error('Base ID is required for this action');
    }

    if (['list_records', 'get_record', 'create_record', 'update_record', 'delete_record'].includes(action) && !tableId) {
      throw new Error('Table ID is required for this action');
    }

    if (['get_record', 'update_record', 'delete_record'].includes(action) && !recordId) {
      throw new Error('Record ID is required for this action');
    }

    if (['create_record', 'update_record'].includes(action) && !fields) {
      throw new Error('Fields are required for create/update operations');
    }

    try {
      // Parse JSON fields if provided
      let parsedFields = null;
      if (fields) {
        try {
          parsedFields = JSON.parse(fields);
        } catch (e) {
          throw new Error('Fields must be valid JSON');
        }
      }

      // Parse sort if provided
      let parsedSort = null;
      if (sort) {
        try {
          parsedSort = JSON.parse(sort);
        } catch (e) {
          throw new Error('Sort must be valid JSON array');
        }
      }

      // Prepare request data
      const requestData = {
        action,
        apiKey: airtableApiKey,
        baseId,
        tableId,
        recordId,
        fields: parsedFields,
        filterByFormula,
        sort: parsedSort,
        maxRecords,
        offset,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Airtable integration.');
      }

      // Call the edge function with proper Supabase authentication
      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/airtable-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result.data,
        records: result.records || result.data?.records,
        record: result.record || result.data,
        offset: result.offset || result.data?.offset,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        records: null,
        record: null,
        offset: null,
        error: error.message,
      };
    }
  },
};