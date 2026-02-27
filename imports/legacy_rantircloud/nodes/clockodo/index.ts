import { NodePlugin } from '@/types/node-plugin';

export const clockodoNode: NodePlugin = {
  type: 'clockodo',
  name: 'Clockodo',
  description: 'Time tracking and project management for businesses',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clockodo.png',
  color: '#00B894',
  inputs: [
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: true,
      description: 'Your Clockodo account email',
      isApiKey: true,
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Clockodo API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Teams', value: 'getTeams' },
        { label: 'Get Users', value: 'getUsers' },
        { label: 'Create User', value: 'createUser' },
        { label: 'Update User', value: 'updateUser' },
        { label: 'Delete User', value: 'deleteUser' },
        { label: 'Create Entry', value: 'createEntry' },
        { label: 'Update Entry', value: 'updateEntry' },
        { label: 'Delete Entry', value: 'deleteEntry' },
        { label: 'Get Entry', value: 'getEntry' },
        { label: 'Get Entries', value: 'getEntries' },
        { label: 'Create Customer', value: 'createCustomer' },
        { label: 'Get Customer', value: 'getCustomer' },
        { label: 'Update Customer', value: 'updateCustomer' },
        { label: 'Get Customers', value: 'getCustomers' },
        { label: 'Delete Customer', value: 'deleteCustomer' },
        { label: 'Create Project', value: 'createProject' },
        { label: 'Get Project', value: 'getProject' },
        { label: 'Get Projects', value: 'getProjects' },
        { label: 'Update Project', value: 'updateProject' },
        { label: 'Delete Project', value: 'deleteProject' },
        { label: 'Create Service', value: 'createService' },
        { label: 'Get Service', value: 'getService' },
        { label: 'Update Service', value: 'updateService' },
        { label: 'Get Services', value: 'getServices' },
        { label: 'Delete Service', value: 'deleteService' },
        { label: 'Get Team', value: 'getTeam' },
        { label: 'Get User', value: 'getUser' },
        { label: 'Create Absence', value: 'createAbsence' },
        { label: 'Get Absence', value: 'getAbsence' },
        { label: 'Update Absence', value: 'updateAbsence' },
        { label: 'Get Absences', value: 'getAbsences' },
        { label: 'Delete Absence', value: 'deleteAbsence' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    // User actions
    if (action === 'createUser') {
      inputs.push(
        { name: 'name', label: 'Name', type: 'text' as const, required: true },
        { name: 'email', label: 'User Email', type: 'text' as const, required: true },
        { name: 'role', label: 'Role', type: 'select' as const, required: false, options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ]},
        { name: 'teamsId', label: 'Team ID', type: 'text' as const, required: false }
      );
    } else if (action === 'updateUser') {
      inputs.push(
        { name: 'usersId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'role', label: 'Role', type: 'select' as const, required: false, options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ]},
        { name: 'teamsId', label: 'Team ID', type: 'text' as const, required: false }
      );
    } else if (action === 'deleteUser' || action === 'getUser') {
      inputs.push(
        { name: 'usersId', label: 'User ID', type: 'text' as const, required: true }
      );
    // Entry actions
    } else if (action === 'createEntry') {
      inputs.push(
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: true },
        { name: 'projectsId', label: 'Project ID', type: 'text' as const, required: false },
        { name: 'servicesId', label: 'Service ID', type: 'text' as const, required: true },
        { name: 'usersId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'timeSince', label: 'Start Time (ISO 8601)', type: 'text' as const, required: true },
        { name: 'timeUntil', label: 'End Time (ISO 8601)', type: 'text' as const, required: true },
        { name: 'text', label: 'Description', type: 'textarea' as const, required: false },
        { name: 'billable', label: 'Billable', type: 'boolean' as const, required: false, default: true }
      );
    } else if (action === 'updateEntry') {
      inputs.push(
        { name: 'entriesId', label: 'Entry ID', type: 'text' as const, required: true },
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: false },
        { name: 'projectsId', label: 'Project ID', type: 'text' as const, required: false },
        { name: 'servicesId', label: 'Service ID', type: 'text' as const, required: false },
        { name: 'timeSince', label: 'Start Time (ISO 8601)', type: 'text' as const, required: false },
        { name: 'timeUntil', label: 'End Time (ISO 8601)', type: 'text' as const, required: false },
        { name: 'text', label: 'Description', type: 'textarea' as const, required: false },
        { name: 'billable', label: 'Billable', type: 'boolean' as const, required: false }
      );
    } else if (action === 'deleteEntry' || action === 'getEntry') {
      inputs.push(
        { name: 'entriesId', label: 'Entry ID', type: 'text' as const, required: true }
      );
    } else if (action === 'getEntries') {
      inputs.push(
        { name: 'timeSince', label: 'Start Date (ISO 8601)', type: 'text' as const, required: true },
        { name: 'timeUntil', label: 'End Date (ISO 8601)', type: 'text' as const, required: true },
        { name: 'filterUsersId', label: 'Filter by User ID', type: 'text' as const, required: false },
        { name: 'filterProjectsId', label: 'Filter by Project ID', type: 'text' as const, required: false },
        { name: 'filterCustomersId', label: 'Filter by Customer ID', type: 'text' as const, required: false }
      );
    // Customer actions
    } else if (action === 'createCustomer') {
      inputs.push(
        { name: 'name', label: 'Customer Name', type: 'text' as const, required: true },
        { name: 'number', label: 'Customer Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false, default: true },
        { name: 'billableDefault', label: 'Billable by Default', type: 'boolean' as const, required: false, default: true }
      );
    } else if (action === 'updateCustomer') {
      inputs.push(
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Customer Name', type: 'text' as const, required: false },
        { name: 'number', label: 'Customer Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false }
      );
    } else if (action === 'deleteCustomer' || action === 'getCustomer') {
      inputs.push(
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: true }
      );
    // Project actions
    } else if (action === 'createProject') {
      inputs.push(
        { name: 'name', label: 'Project Name', type: 'text' as const, required: true },
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: true },
        { name: 'number', label: 'Project Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false, default: true },
        { name: 'billableDefault', label: 'Billable by Default', type: 'boolean' as const, required: false, default: true }
      );
    } else if (action === 'updateProject') {
      inputs.push(
        { name: 'projectsId', label: 'Project ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Project Name', type: 'text' as const, required: false },
        { name: 'customersId', label: 'Customer ID', type: 'text' as const, required: false },
        { name: 'number', label: 'Project Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false }
      );
    } else if (action === 'deleteProject' || action === 'getProject') {
      inputs.push(
        { name: 'projectsId', label: 'Project ID', type: 'text' as const, required: true }
      );
    // Service actions
    } else if (action === 'createService') {
      inputs.push(
        { name: 'name', label: 'Service Name', type: 'text' as const, required: true },
        { name: 'number', label: 'Service Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false, default: true }
      );
    } else if (action === 'updateService') {
      inputs.push(
        { name: 'servicesId', label: 'Service ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Service Name', type: 'text' as const, required: false },
        { name: 'number', label: 'Service Number', type: 'text' as const, required: false },
        { name: 'active', label: 'Active', type: 'boolean' as const, required: false }
      );
    } else if (action === 'deleteService' || action === 'getService') {
      inputs.push(
        { name: 'servicesId', label: 'Service ID', type: 'text' as const, required: true }
      );
    // Team actions
    } else if (action === 'getTeam') {
      inputs.push(
        { name: 'teamsId', label: 'Team ID', type: 'text' as const, required: true }
      );
    // Absence actions
    } else if (action === 'createAbsence') {
      inputs.push(
        { name: 'usersId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'dateSince', label: 'Start Date (YYYY-MM-DD)', type: 'text' as const, required: true },
        { name: 'dateUntil', label: 'End Date (YYYY-MM-DD)', type: 'text' as const, required: true },
        { name: 'type', label: 'Absence Type', type: 'select' as const, required: true, options: [
          { label: 'Vacation', value: 'vacation' },
          { label: 'Sick', value: 'sick' },
          { label: 'Other', value: 'other' },
        ]},
        { name: 'note', label: 'Note', type: 'textarea' as const, required: false }
      );
    } else if (action === 'updateAbsence') {
      inputs.push(
        { name: 'absencesId', label: 'Absence ID', type: 'text' as const, required: true },
        { name: 'dateSince', label: 'Start Date (YYYY-MM-DD)', type: 'text' as const, required: false },
        { name: 'dateUntil', label: 'End Date (YYYY-MM-DD)', type: 'text' as const, required: false },
        { name: 'type', label: 'Absence Type', type: 'select' as const, required: false, options: [
          { label: 'Vacation', value: 'vacation' },
          { label: 'Sick', value: 'sick' },
          { label: 'Other', value: 'other' },
        ]},
        { name: 'note', label: 'Note', type: 'textarea' as const, required: false }
      );
    } else if (action === 'deleteAbsence' || action === 'getAbsence') {
      inputs.push(
        { name: 'absencesId', label: 'Absence ID', type: 'text' as const, required: true }
      );
    } else if (action === 'getAbsences') {
      inputs.push(
        { name: 'year', label: 'Year', type: 'number' as const, required: false },
        { name: 'filterUsersId', label: 'Filter by User ID', type: 'text' as const, required: false }
      );
    // Custom API Call
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /entries)' },
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

    const { data, error } = await supabase.functions.invoke('clockodo-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
