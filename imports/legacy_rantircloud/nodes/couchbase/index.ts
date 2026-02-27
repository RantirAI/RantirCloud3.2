import { NodePlugin } from '@/types/node-plugin';

export const couchbaseNode: NodePlugin = {
  type: 'couchbase',
  name: 'Couchbase',
  description: 'Interact with Couchbase NoSQL database',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/couchbase.png',
  color: '#EA2328',
  inputs: [
    {
      name: 'connectionString',
      label: 'Connection String',
      type: 'text',
      required: true,
      description: 'Couchbase cluster connection string',
      placeholder: 'couchbase://localhost',
      isApiKey: true,
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      description: 'Couchbase username',
      placeholder: 'admin',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'text',
      required: true,
      description: 'Couchbase password',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Document', value: 'get', description: 'Retrieve a document by ID' },
        { label: 'Insert Document', value: 'insert', description: 'Insert a new document' },
        { label: 'Upsert Document', value: 'upsert', description: 'Insert or update a document' },
        { label: 'Remove Document', value: 'remove', description: 'Delete a document by ID' },
        { label: 'Query (N1QL)', value: 'query', description: 'Execute a N1QL query' },
      ],
      description: 'Choose the Couchbase operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    dynamicInputs.push({
      name: 'bucket',
      label: 'Bucket Name',
      type: 'text',
      required: true,
      description: 'Target bucket name',
      placeholder: 'my-bucket',
    });

    if (action === 'query') {
      dynamicInputs.push({
        name: 'query',
        label: 'N1QL Query',
        type: 'code',
        language: 'sql',
        required: true,
        description: 'N1QL query to execute',
        placeholder: 'SELECT * FROM `bucket` WHERE type = "user" LIMIT 10',
      });
      dynamicInputs.push({
        name: 'parameters',
        label: 'Query Parameters',
        type: 'code',
        language: 'json',
        required: false,
        description: 'Named parameters for the query as JSON',
        placeholder: '{"name": "John", "age": 30}',
      });
    } else {
      dynamicInputs.push({
        name: 'scope',
        label: 'Scope',
        type: 'text',
        required: false,
        description: 'Scope name (default: _default)',
        placeholder: '_default',
      });
      dynamicInputs.push({
        name: 'collection',
        label: 'Collection',
        type: 'text',
        required: false,
        description: 'Collection name (default: _default)',
        placeholder: '_default',
      });
      dynamicInputs.push({
        name: 'documentId',
        label: 'Document ID',
        type: 'text',
        required: true,
        description: 'Unique document identifier',
        placeholder: 'doc-123',
      });

      if (action === 'insert' || action === 'upsert') {
        dynamicInputs.push({
          name: 'document',
          label: 'Document',
          type: 'code',
          language: 'json',
          required: true,
          description: 'JSON document to store',
          placeholder: '{\n  "type": "user",\n  "name": "John Doe"\n}',
        });
      }
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Retrieved document or query results' },
    { name: 'cas', type: 'string', description: 'CAS value for document operations' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/couchbase-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: result.data,
        cas: result.cas,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        cas: null,
        error: error.message,
      };
    }
  },
};
