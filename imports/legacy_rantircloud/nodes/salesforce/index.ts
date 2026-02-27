import { NodePlugin } from '@/types/node-plugin';
import { SalesforceIcon } from '@/components/flow/icons/SalesforceIcon';

// Function to resolve variables
const resolveVariable = (variableBinding: string) => {
  if (!variableBinding || typeof variableBinding !== 'string' || 
      !variableBinding.startsWith('{{') || !variableBinding.endsWith('}}')) {
    return variableBinding;
  }

  const binding = variableBinding.substring(2, variableBinding.length - 2);

  // Handle environment variables
  if (binding.startsWith('env.')) {
    const envVarName = binding.substring(4);
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envVarName] || null;
  }

  // Handle flow variables from database
  if (!binding.includes('.')) {
    const flowProjectId = window.location.pathname.split('/').pop();
    if (flowProjectId) {
      try {
        const flowVariablesKey = `flow-variables-${flowProjectId}`;
        const storedVariables = localStorage.getItem(flowVariablesKey);
        if (storedVariables) {
          const flowVariables = JSON.parse(storedVariables);
          const variable = flowVariables.find((v: any) => v.name === binding);
          return variable?.value || null;
        }
      } catch (error) {
        console.error('Error resolving flow variable:', error);
      }
    }
    return null;
  }

  return null;
};

export const salesforceNode: NodePlugin = {
  type: 'salesforce',
  name: 'Salesforce',
  description: 'Connect to Salesforce API for CRUD operations, queries, and bulk data management',
  category: 'action',
  icon: SalesforceIcon,
  color: '#00A1E0',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Salesforce API Key for authentication',
      isApiKey: true
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Run SOQL Query', value: 'run_query' },
        { label: 'Create Object', value: 'create_object' },
        { label: 'Update Object', value: 'update_object' },
        { label: 'Batch Upsert', value: 'batch_upsert' },
        { label: 'Bulk Upsert', value: 'bulk_upsert' },
        { label: 'Custom API Call', value: 'custom_api' }
      ],
      description: 'Select the Salesforce action to perform'
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs.action;
    const dynamicInputs = [];

    // Add action-specific inputs
    if (action) {
      switch (action) {
      case 'run_query':
        dynamicInputs.push({
          name: 'soqlQuery',
          label: 'SOQL Query',
          type: 'code',
          language: 'javascript',
          required: true,
          description: 'SOQL query to execute',
          placeholder: 'SELECT Id, Name FROM Account LIMIT 10'
        });
        break;

      case 'create_object':
        dynamicInputs.push(
          {
            name: 'objectType',
            label: 'Object Type',
            type: 'text',
            required: true,
            description: 'Salesforce object type (e.g., Account, Contact, Lead)',
            placeholder: 'Account'
          },
          {
            name: 'recordData',
            label: 'Record Data',
            type: 'code',
            language: 'json',
            required: true,
            description: 'JSON object with field values',
            placeholder: '{\n  "Name": "Example Account",\n  "Industry": "Technology"\n}'
          }
        );
        break;

      case 'update_object':
        dynamicInputs.push(
          {
            name: 'objectType',
            label: 'Object Type',
            type: 'text',
            required: true,
            description: 'Salesforce object type (e.g., Account, Contact, Lead)',
            placeholder: 'Account'
          },
          {
            name: 'recordId',
            label: 'Record ID',
            type: 'text',
            required: true,
            description: 'Salesforce record ID to update',
            placeholder: '0031234567890123'
          },
          {
            name: 'recordData',
            label: 'Record Data',
            type: 'code',
            language: 'json',
            required: true,
            description: 'JSON object with field values to update',
            placeholder: '{\n  "Name": "Updated Account",\n  "Industry": "Technology"\n}'
          }
        );
        break;

      case 'batch_upsert':
      case 'bulk_upsert':
        dynamicInputs.push(
          {
            name: 'objectType',
            label: 'Object Type',
            type: 'text',
            required: true,
            description: 'Salesforce object type (e.g., Account, Contact, Lead)',
            placeholder: 'Account'
          },
          {
            name: 'batchData',
            label: 'Batch Data',
            type: 'code',
            language: 'json',
            required: true,
            description: 'Array of records for batch operations',
            placeholder: '[\n  {\n    "Name": "Account 1",\n    "Industry": "Technology"\n  },\n  {\n    "Name": "Account 2",\n    "Industry": "Finance"\n  }\n]'
          },
          {
            name: 'externalIdField',
            label: 'External ID Field',
            type: 'text',
            required: false,
            description: 'Field name to use as external ID for upsert operations',
            placeholder: 'External_Id__c'
          }
        );
        break;

      case 'custom_api':
        dynamicInputs.push(
          {
            name: 'apiMethod',
            label: 'API Method',
            type: 'select',
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' }
            ],
            description: 'HTTP method for custom API calls'
          },
          {
            name: 'apiEndpoint',
            label: 'API Endpoint',
            type: 'text',
            required: true,
            description: 'Custom API endpoint (relative to base URL)',
            placeholder: '/services/data/v58.0/sobjects/Account'
          },
          {
            name: 'apiBody',
            label: 'API Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Request body for POST/PATCH requests',
            placeholder: '{\n  "key": "value"\n}'
          }
        );
        break;
      }

      // Add field mapping for all actions that handle data
      if (['create_object', 'update_object', 'batch_upsert', 'bulk_upsert'].includes(action)) {
        dynamicInputs.push({
          name: 'fieldMapping',
          label: 'Field Mapping',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Dynamic field mapping configuration',
          placeholder: '{\n  "sourceField": "destinationField",\n  "email": "Email",\n  "firstName": "FirstName"\n}'
        });
      }
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
      description: 'Response data from Salesforce'
    },
    {
      name: 'records',
      type: 'array',
      description: 'Array of records (for query operations)'
    },
    {
      name: 'recordId',
      type: 'string',
      description: 'ID of created/updated record'
    },
    {
      name: 'totalSize',
      type: 'number',
      description: 'Total number of records returned'
    },
    {
      name: 'errors',
      type: 'array',
      description: 'Array of error messages if any'
    },
    {
      name: 'rawResponse',
      type: 'object',
      description: 'Complete raw response from Salesforce API'
    }
  ],
  async execute(inputs, context) {
    const {
      apiKey,
      action,
      soqlQuery,
      objectType,
      recordId,
      recordData,
      batchData,
      externalIdField,
      apiMethod,
      apiEndpoint,
      apiBody,
      fieldMapping
    } = inputs;

    // Resolve variables
    const resolvedInputs = {
      apiKey: resolveVariable(apiKey),
      action: resolveVariable(action),
      soqlQuery: resolveVariable(soqlQuery),
      objectType: resolveVariable(objectType),
      recordId: resolveVariable(recordId),
      recordData: recordData ? JSON.parse(resolveVariable(recordData)) : null,
      batchData: batchData ? JSON.parse(resolveVariable(batchData)) : null,
      externalIdField: resolveVariable(externalIdField),
      apiMethod: resolveVariable(apiMethod),
      apiEndpoint: resolveVariable(apiEndpoint),
      apiBody: apiBody ? JSON.parse(resolveVariable(apiBody)) : null,
      fieldMapping: fieldMapping ? JSON.parse(resolveVariable(fieldMapping)) : null
    };

    try {
      // Use the provided API key for authentication
      if (!resolvedInputs.apiKey) {
        throw new Error('API Key is required for Salesforce authentication');
      }

      // Use Supabase proxy function for Salesforce API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('salesforce-proxy', {
        body: {
          apiKey: resolvedInputs.apiKey,
          action: resolvedInputs.action,
          soqlQuery: resolvedInputs.soqlQuery,
          objectType: resolvedInputs.objectType,
          recordId: resolvedInputs.recordId,
          recordData: resolvedInputs.recordData,
          batchData: resolvedInputs.batchData,
          externalIdField: resolvedInputs.externalIdField,
          apiMethod: resolvedInputs.apiMethod,
          apiEndpoint: resolvedInputs.apiEndpoint,
          apiBody: resolvedInputs.apiBody,
          fieldMapping: resolvedInputs.fieldMapping
        }
      });

      if (error) {
        throw new Error(`Salesforce proxy error: ${error.message}`);
      }

      return data;

    } catch (error) {
      throw new Error(`Salesforce action failed: ${error.message}`);
    }
  }
};

// Helper functions
async function executeQuery(apiKey: string, baseUrl: string, query: string) {
  const response = await fetch(`${baseUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Query failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    data,
    records: data.records || [],
    totalSize: data.totalSize || 0,
    rawResponse: data
  };
}

async function createObject(apiKey: string, baseUrl: string, objectType: string, recordData: any, fieldMapping?: any) {
  if (!objectType || !recordData) {
    throw new Error('Object type and record data are required for create operation');
  }

  // Apply field mapping if provided
  const mappedData = applyFieldMapping(recordData, fieldMapping);

  const response = await fetch(`${baseUrl}/services/data/v58.0/sobjects/${objectType}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mappedData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Create failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: data.success,
    recordId: data.id,
    data,
    errors: data.errors || [],
    rawResponse: data
  };
}

async function updateObject(apiKey: string, baseUrl: string, objectType: string, recordId: string, recordData: any, fieldMapping?: any) {
  if (!objectType || !recordId || !recordData) {
    throw new Error('Object type, record ID, and record data are required for update operation');
  }

  // Apply field mapping if provided
  const mappedData = applyFieldMapping(recordData, fieldMapping);

  const response = await fetch(`${baseUrl}/services/data/v58.0/sobjects/${objectType}/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mappedData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Update failed: ${error.message || response.statusText}`);
  }

  return {
    success: true,
    recordId,
    data: { id: recordId },
    rawResponse: {}
  };
}

async function batchUpsert(apiKey: string, baseUrl: string, objectType: string, batchData: any[], externalIdField?: string, fieldMapping?: any) {
  if (!objectType || !batchData || !Array.isArray(batchData)) {
    throw new Error('Object type and batch data array are required for batch upsert');
  }

  // Apply field mapping to each record if provided
  const mappedData = batchData.map(record => applyFieldMapping(record, fieldMapping));

  const endpoint = externalIdField 
    ? `${baseUrl}/services/data/v58.0/sobjects/${objectType}/${externalIdField}`
    : `${baseUrl}/services/data/v58.0/sobjects/${objectType}`;

  const results = [];
  const errors = [];

  // Process records in batches of 200 (Salesforce limit)
  for (let i = 0; i < mappedData.length; i += 200) {
    const batch = mappedData.slice(i, i + 200);
    
    for (const record of batch) {
      try {
        const response = await fetch(endpoint, {
          method: externalIdField ? 'PATCH' : 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });

        const result = await response.json();
        if (response.ok) {
          results.push(result);
        } else {
          errors.push(result);
        }
      } catch (error) {
        errors.push({ error: error.message, record });
      }
    }
  }

  return {
    success: errors.length === 0,
    data: results,
    totalSize: results.length,
    errors,
    rawResponse: { results, errors }
  };
}

async function bulkUpsert(apiKey: string, baseUrl: string, objectType: string, batchData: any[], externalIdField?: string, fieldMapping?: any) {
  if (!objectType || !batchData || !Array.isArray(batchData)) {
    throw new Error('Object type and batch data array are required for bulk upsert');
  }

  // Apply field mapping to each record if provided
  const mappedData = batchData.map(record => applyFieldMapping(record, fieldMapping));

  // Create bulk job
  const jobResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      object: objectType,
      operation: externalIdField ? 'upsert' : 'insert',
      externalIdFieldName: externalIdField,
      contentType: 'JSON'
    })
  });

  if (!jobResponse.ok) {
    const error = await jobResponse.json();
    throw new Error(`Bulk job creation failed: ${error.message || jobResponse.statusText}`);
  }

  const job = await jobResponse.json();

  // Upload data to job
  const uploadResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest/${job.id}/batches`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mappedData)
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`Bulk data upload failed: ${error.message || uploadResponse.statusText}`);
  }

  // Close job
  const closeResponse = await fetch(`${baseUrl}/services/data/v58.0/jobs/ingest/${job.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ state: 'UploadComplete' })
  });

  if (!closeResponse.ok) {
    const error = await closeResponse.json();
    throw new Error(`Bulk job close failed: ${error.message || closeResponse.statusText}`);
  }

  const closedJob = await closeResponse.json();

  return {
    success: true,
    data: closedJob,
    jobId: job.id,
    rawResponse: closedJob
  };
}

async function customApiCall(apiKey: string, baseUrl: string, method: string, endpoint: string, body?: any) {
  if (!method || !endpoint) {
    throw new Error('API method and endpoint are required for custom API calls');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Custom API call failed: ${error}`);
  }

  const data = await response.json();
  return {
    success: true,
    data,
    rawResponse: data
  };
}

function applyFieldMapping(data: any, fieldMapping?: any): any {
  if (!fieldMapping || !data) {
    return data;
  }

  const mappedData: any = {};
  
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    if (data.hasOwnProperty(sourceField)) {
      mappedData[targetField as string] = data[sourceField];
    }
  }

  // Include any fields not in the mapping
  for (const [key, value] of Object.entries(data)) {
    if (!fieldMapping.hasOwnProperty(key)) {
      mappedData[key] = value;
    }
  }

  return mappedData;
}