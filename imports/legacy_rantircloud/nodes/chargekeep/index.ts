import { NodePlugin } from '@/types/node-plugin';

export const chargekeepNode: NodePlugin = {
  type: 'chargekeep',
  name: 'ChargeKeep',
  description: 'Payment management and subscription billing platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chargekeep.png',
  color: '#4F46E5',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your ChargeKeep API key',
      isApiKey: true,
    },
    {
      name: 'baseUrl',
      label: 'CRM Base URL',
      type: 'text',
      required: false,
      default: 'https://crm.chargekeep.com',
      description: 'Your ChargeKeep CRM URL (e.g., https://yourcompany.chargekeep.com)',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add or Update Contact', value: 'addOrUpdateContact' },
        { label: 'Add or Update Contact Extended', value: 'addOrUpdateContactExtended' },
        { label: 'Add or Update Subscription', value: 'addOrUpdateSubscription' },
        { label: 'Create Invoice', value: 'createInvoice' },
        { label: 'Create Product', value: 'createProduct' },
        { label: 'Get Contact Details', value: 'getContactDetails' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'addOrUpdateContact') {
      inputs.push(
        { name: 'importType', label: 'Contact Type', type: 'select' as const, required: false, default: 'Lead', options: [
          { label: 'Lead', value: 'Lead' },
          { label: 'Client', value: 'Client' },
          { label: 'Partner', value: 'Partner' },
        ], description: 'Type of contact to create' },
        { name: 'matchExisting', label: 'Match Existing Contact', type: 'boolean' as const, required: false, default: true, description: 'Update if contact already exists' },
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
        { name: 'phone', label: 'Mobile Phone', type: 'text' as const, required: false },
        { name: 'contactId', label: 'Contact ID (for update)', type: 'text' as const, required: false, description: 'Existing contact ID to update' }
      );
    } else if (action === 'addOrUpdateContactExtended') {
      inputs.push(
        { name: 'importType', label: 'Contact Type', type: 'select' as const, required: false, default: 'Lead', options: [
          { label: 'Lead', value: 'Lead' },
          { label: 'Client', value: 'Client' },
          { label: 'Partner', value: 'Partner' },
        ], description: 'Type of contact to create' },
        { name: 'matchExisting', label: 'Match Existing Contact', type: 'boolean' as const, required: false, default: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: true },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
        { name: 'phone', label: 'Mobile Phone', type: 'text' as const, required: false },
        { name: 'company', label: 'Company Name', type: 'text' as const, required: false },
        { name: 'address', label: 'Address', type: 'text' as const, required: false },
        { name: 'city', label: 'City', type: 'text' as const, required: false },
        { name: 'state', label: 'State', type: 'text' as const, required: false },
        { name: 'country', label: 'Country', type: 'text' as const, required: false },
        { name: 'postalCode', label: 'Postal Code', type: 'text' as const, required: false },
        { name: 'contactId', label: 'Contact ID (for update)', type: 'text' as const, required: false },
        { name: 'customFields', label: 'Custom Fields (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'addOrUpdateSubscription') {
      inputs.push(
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: false, description: 'ChargeKeep Contact ID' },
        { name: 'contactXref', label: 'Contact Email/Reference', type: 'text' as const, required: true, description: 'Contact email or external reference' },
        { name: 'productCode', label: 'Product Code', type: 'text' as const, required: true, description: 'Product/Plan code in ChargeKeep' },
        { name: 'paymentPeriodType', label: 'Payment Period', type: 'select' as const, required: false, default: 'Monthly', options: [
          { label: 'Monthly', value: 'Monthly' },
          { label: 'Yearly', value: 'Yearly' },
          { label: 'Weekly', value: 'Weekly' },
          { label: 'One Time', value: 'OneTime' },
        ]},
        { name: 'hasRecurringBilling', label: 'Has Recurring Billing', type: 'boolean' as const, required: false, default: false },
        { name: 'status', label: 'Status', type: 'select' as const, required: false, options: [
          { label: 'Active', value: 'Active' },
          { label: 'Cancelled', value: 'Cancelled' },
          { label: 'Paused', value: 'Paused' },
          { label: 'Trial', value: 'Trial' },
        ]},
        { name: 'startDate', label: 'Start Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'End Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' }
      );
    } else if (action === 'createInvoice') {
      inputs.push(
        { name: 'contactEmail', label: 'Contact Email', type: 'text' as const, required: true },
        { name: 'amount', label: 'Amount (cents)', type: 'number' as const, required: true },
        { name: 'currency', label: 'Currency', type: 'text' as const, required: false, default: 'USD' },
        { name: 'description', label: 'Description', type: 'text' as const, required: false },
        { name: 'dueDate', label: 'Due Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'lineItems', label: 'Line Items (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'createProduct') {
      inputs.push(
        { name: 'name', label: 'Product Name', type: 'text' as const, required: true },
        { name: 'productCode', label: 'Product Code', type: 'text' as const, required: false, description: 'Unique product identifier (defaults to name)' },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false },
        { name: 'price', label: 'Price (cents)', type: 'number' as const, required: true },
        { name: 'currency', label: 'Currency', type: 'text' as const, required: false, default: 'USD' },
        { name: 'recurring', label: 'Is Recurring', type: 'boolean' as const, required: false },
        { name: 'interval', label: 'Billing Interval', type: 'select' as const, required: false, options: [
          { label: 'Monthly', value: 'Monthly' },
          { label: 'Yearly', value: 'Yearly' },
          { label: 'Weekly', value: 'Weekly' },
        ]}
      );
    } else if (action === 'getContactDetails') {
      inputs.push(
        { name: 'email', label: 'Contact Email', type: 'text' as const, required: false, description: 'Email address to look up' },
        { name: 'contactId', label: 'Contact ID', type: 'text' as const, required: false, description: 'ChargeKeep Contact ID' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, placeholder: '/api/services/CRM/Contact/GetContactData' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'POST', options: [
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
    { name: 'data', type: 'object', description: 'Response data from ChargeKeep' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('chargekeep-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
