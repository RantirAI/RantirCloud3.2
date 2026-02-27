import { NodePlugin } from '@/types/node-plugin';

export const clickfunnelsNode: NodePlugin = {
  type: 'clickfunnels',
  name: 'ClickFunnels',
  description: 'Sales funnel builder and marketing automation platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clickfunnels.png',
  color: '#1E88E5',
  inputs: [
    {
      name: 'apiKey',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your ClickFunnels API access token',
      isApiKey: true,
    },
    {
      name: 'workspaceSubdomain',
      label: 'Workspace Subdomain',
      type: 'text',
      required: true,
      description: 'Your workspace subdomain (e.g., "myworkspace" from myworkspace.myclickfunnels.com)',
    },
    {
      name: 'workspaceId',
      label: 'Workspace ID',
      type: 'text',
      required: true,
      description: 'Your ClickFunnels Workspace ID',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Opportunity', value: 'createOpportunity' },
        { label: 'Apply Tag to Contact', value: 'applyTagToContact' },
        { label: 'Remove Tag from Contact', value: 'removeTagFromContact' },
        { label: 'Enroll Contact into Course', value: 'enrollContactIntoCourse' },
        { label: 'Update or Create Contact', value: 'updateOrCreateContact' },
        { label: 'Search Contacts', value: 'searchContacts' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createOpportunity') {
      inputs.push(
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true },
        { name: 'pipelineId', label: 'Pipeline ID', type: 'text' as const, required: true },
        { name: 'stageId', label: 'Stage ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Opportunity Name', type: 'text' as const, required: false },
        { name: 'value', label: 'Value (cents)', type: 'number' as const, required: false }
      );
    } else if (action === 'applyTagToContact') {
      inputs.push(
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true },
        { name: 'tagId', label: 'Tag ID', type: 'text' as const, required: true }
      );
    } else if (action === 'removeTagFromContact') {
      inputs.push(
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true },
        { name: 'appliedTagId', label: 'Applied Tag ID', type: 'text' as const, required: true, description: 'The ID of the applied tag (not the tag itself)' }
      );
    } else if (action === 'enrollContactIntoCourse') {
      inputs.push(
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: true },
        { name: 'courseId', label: 'Course ID', type: 'text' as const, required: true }
      );
    } else if (action === 'updateOrCreateContact') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text' as const, required: false }
      );
    } else if (action === 'searchContacts') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 20 },
        { name: 'page', label: 'Page', type: 'number' as const, required: false, default: 1 }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /contacts)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clickfunnels-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
