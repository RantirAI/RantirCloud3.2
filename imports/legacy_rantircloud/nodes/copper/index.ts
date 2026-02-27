import { NodePlugin } from '@/types/node-plugin';

export const copperNode: NodePlugin = {
  type: 'copper',
  name: 'Copper',
  description: 'CRM platform built for Google Workspace',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/copper.png',
  color: '#F5A623',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Copper API key',
      isApiKey: true,
    },
    {
      name: 'email',
      label: 'User Email',
      type: 'text',
      required: true,
      description: 'Your Copper account email',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        // Person actions
        { label: 'Create Person', value: 'createPerson' },
        { label: 'Update Person', value: 'updatePerson' },
        { label: 'Search for a Person', value: 'searchForAPerson' },
        // Lead actions
        { label: 'Create Lead', value: 'createLead' },
        { label: 'Update Lead', value: 'updateLead' },
        { label: 'Convert Lead', value: 'convertLead' },
        { label: 'Search for a Lead', value: 'searchForALead' },
        // Company actions
        { label: 'Create Company', value: 'createCompany' },
        { label: 'Update Company', value: 'updateCompany' },
        { label: 'Search for a Company', value: 'searchForACompany' },
        // Opportunity actions
        { label: 'Create Opportunity', value: 'createOpportunity' },
        { label: 'Update Opportunity', value: 'updateOpportunity' },
        { label: 'Search for an Opportunity', value: 'searchForAnOpportunity' },
        // Project actions
        { label: 'Create Project', value: 'createProject' },
        { label: 'Update Project', value: 'updateProject' },
        { label: 'Search for a Project', value: 'searchForAProject' },
        // Task actions
        { label: 'Create Task', value: 'createTask' },
        // Activity actions
        { label: 'Create Activity', value: 'createActivity' },
        { label: 'Search for an Activity', value: 'searchForAnActivity' },
        // Custom API
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    // Person actions
    if (action === 'createPerson') {
      inputs.push(
        { name: 'name', label: 'Person Name', type: 'text' as const, required: true, description: 'Full name' },
        { name: 'personEmail', label: 'Email', type: 'text' as const, required: false, description: 'Email address' },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false, description: 'Phone number' },
        { name: 'title', label: 'Title', type: 'text' as const, required: false, description: 'Job title' },
        { name: 'companyId', label: 'Company ID', type: 'text' as const, required: false, description: 'Associated company ID' },
        { name: 'details', label: 'Details', type: 'textarea' as const, required: false, description: 'Additional details' }
      );
    } else if (action === 'updatePerson') {
      inputs.push(
        { name: 'personId', label: 'Person ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'personEmail', label: 'Email', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'title', label: 'Title', type: 'text' as const, required: false }
      );
    } else if (action === 'searchForAPerson') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'personEmail', label: 'Email', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Lead actions
    else if (action === 'createLead') {
      inputs.push(
        { name: 'name', label: 'Lead Name', type: 'text' as const, required: true, description: 'Full name of the lead' },
        { name: 'leadEmail', label: 'Email', type: 'text' as const, required: false, description: 'Lead email address' },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false, description: 'Lead phone number' },
        { name: 'companyName', label: 'Company Name', type: 'text' as const, required: false },
        { name: 'title', label: 'Title', type: 'text' as const, required: false, description: 'Job title' },
        { name: 'details', label: 'Details', type: 'textarea' as const, required: false },
        { name: 'monetaryValue', label: 'Monetary Value', type: 'number' as const, required: false }
      );
    } else if (action === 'updateLead') {
      inputs.push(
        { name: 'leadId', label: 'Lead ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'leadEmail', label: 'Email', type: 'text' as const, required: false },
        { name: 'status', label: 'Status', type: 'text' as const, required: false }
      );
    } else if (action === 'convertLead') {
      inputs.push(
        { name: 'leadId', label: 'Lead ID', type: 'text' as const, required: true },
        { name: 'personDetails', label: 'Person Details (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Details for created person' },
        { name: 'companyDetails', label: 'Company Details (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Details for created company' },
        { name: 'opportunityDetails', label: 'Opportunity Details (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Details for created opportunity' }
      );
    } else if (action === 'searchForALead') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'leadEmail', label: 'Email', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Company actions
    else if (action === 'createCompany') {
      inputs.push(
        { name: 'name', label: 'Company Name', type: 'text' as const, required: true },
        { name: 'website', label: 'Website', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'address', label: 'Address (JSON)', type: 'code' as const, language: 'json' as const, required: false },
        { name: 'details', label: 'Details', type: 'textarea' as const, required: false }
      );
    } else if (action === 'updateCompany') {
      inputs.push(
        { name: 'companyId', label: 'Company ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'website', label: 'Website', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false }
      );
    } else if (action === 'searchForACompany') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'website', label: 'Website', type: 'text' as const, required: false },
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Opportunity actions
    else if (action === 'createOpportunity') {
      inputs.push(
        { name: 'name', label: 'Opportunity Name', type: 'text' as const, required: true },
        { name: 'monetaryValue', label: 'Value', type: 'number' as const, required: false },
        { name: 'pipelineId', label: 'Pipeline ID', type: 'text' as const, required: false },
        { name: 'stageId', label: 'Stage ID', type: 'text' as const, required: false },
        { name: 'closeDate', label: 'Close Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'primaryContactId', label: 'Primary Contact ID', type: 'text' as const, required: false },
        { name: 'companyId', label: 'Company ID', type: 'text' as const, required: false }
      );
    } else if (action === 'updateOpportunity') {
      inputs.push(
        { name: 'opportunityId', label: 'Opportunity ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'monetaryValue', label: 'Value', type: 'number' as const, required: false },
        { name: 'stageId', label: 'Stage ID', type: 'text' as const, required: false },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Open', value: 'Open' },
          { label: 'Won', value: 'Won' },
          { label: 'Lost', value: 'Lost' },
          { label: 'Abandoned', value: 'Abandoned' },
        ]}
      );
    } else if (action === 'searchForAnOpportunity') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'pipelineId', label: 'Pipeline ID', type: 'text' as const, required: false },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Open', value: 'Open' },
          { label: 'Won', value: 'Won' },
          { label: 'Lost', value: 'Lost' },
          { label: 'Abandoned', value: 'Abandoned' },
        ]},
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Project actions
    else if (action === 'createProject') {
      inputs.push(
        { name: 'name', label: 'Project Name', type: 'text' as const, required: true },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Open', value: 'Open' },
          { label: 'Completed', value: 'Completed' },
        ]},
        { name: 'details', label: 'Details', type: 'textarea' as const, required: false }
      );
    } else if (action === 'updateProject') {
      inputs.push(
        { name: 'projectId', label: 'Project ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Open', value: 'Open' },
          { label: 'Completed', value: 'Completed' },
        ]}
      );
    } else if (action === 'searchForAProject') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Open', value: 'Open' },
          { label: 'Completed', value: 'Completed' },
        ]},
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Task actions
    else if (action === 'createTask') {
      inputs.push(
        { name: 'name', label: 'Task Name', type: 'text' as const, required: true },
        { name: 'dueDate', label: 'Due Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'priority', label: 'Priority', type: 'select' as const, required: false, options: [
          { label: 'None', value: 'None' },
          { label: 'High', value: 'High' },
        ]},
        { name: 'relatedResourceType', label: 'Related To Type', type: 'select' as const, required: false, options: [
          { label: 'Person', value: 'person' },
          { label: 'Company', value: 'company' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Lead', value: 'lead' },
          { label: 'Project', value: 'project' },
        ]},
        { name: 'relatedResourceId', label: 'Related To ID', type: 'text' as const, required: false },
        { name: 'details', label: 'Details', type: 'textarea' as const, required: false }
      );
    }
    // Activity actions
    else if (action === 'createActivity') {
      inputs.push(
        { name: 'activityType', label: 'Activity Type', type: 'select' as const, required: true, options: [
          { label: 'Note', value: 'note' },
          { label: 'Call', value: 'call' },
          { label: 'Meeting', value: 'meeting' },
        ]},
        { name: 'details', label: 'Details', type: 'textarea' as const, required: true },
        { name: 'parentType', label: 'Parent Type', type: 'select' as const, required: true, options: [
          { label: 'Person', value: 'person' },
          { label: 'Company', value: 'company' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Lead', value: 'lead' },
          { label: 'Project', value: 'project' },
        ]},
        { name: 'parentId', label: 'Parent ID', type: 'text' as const, required: true }
      );
    } else if (action === 'searchForAnActivity') {
      inputs.push(
        { name: 'parentType', label: 'Parent Type', type: 'select' as const, required: false, options: [
          { label: 'Person', value: 'person' },
          { label: 'Company', value: 'company' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Lead', value: 'lead' },
          { label: 'Project', value: 'project' },
        ]},
        { name: 'parentId', label: 'Parent ID', type: 'text' as const, required: false },
        { name: 'activityType', label: 'Activity Type', type: 'select' as const, required: false, options: [
          { label: 'Note', value: 'note' },
          { label: 'Call', value: 'call' },
          { label: 'Meeting', value: 'meeting' },
        ]},
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 20 }
      );
    }
    // Custom API
    else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true, description: 'API endpoint path' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Copper' },
    { name: 'id', type: 'string', description: 'Created/retrieved record ID' },
    { name: 'items', type: 'array', description: 'Search results' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('copper-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
