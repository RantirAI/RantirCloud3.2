import { NodePlugin } from '@/types/node-plugin';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const actualbudgetNode: NodePlugin = {
  type: 'actualbudget',
  name: 'Actual Budget',
  description: 'Connect to Actual Budget for personal finance management, budgeting, and expense tracking',
  category: 'action',
  icon: '/src/assets/actual-budget-logo.svg',
  color: '#5A67D8',
  inputs: [
    {
      name: 'serverUrl',
      label: 'Server URL',
      type: 'text',
      required: true,
      description: 'Your Actual Budget server URL',
      placeholder: 'https://your-actual-server.com',
    },
    {
      name: 'password',
      label: 'Server Password',
      type: 'text',
      required: false,
      description: 'Server password (if required)',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Accounts', value: 'get_accounts' },
        { label: 'Create Account', value: 'create_account' },
        { label: 'Get Categories', value: 'get_categories' },
        { label: 'Create Category', value: 'create_category' },
        { label: 'Get Transactions', value: 'get_transactions' },
        { label: 'Create Transaction', value: 'create_transaction' },
        { label: 'Update Transaction', value: 'update_transaction' },
        { label: 'Delete Transaction', value: 'delete_transaction' },
        { label: 'Get Budgets', value: 'get_budgets' },
        { label: 'Custom API Call', value: 'custom_api_call' },
      ],
      description: 'Choose the Actual Budget action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'create_account':
        dynamicInputs.push(
          {
            name: 'accountName',
            label: 'Account Name',
            type: 'text',
            required: true,
            description: 'Name of the account to create',
          },
          {
            name: 'accountType',
            label: 'Account Type',
            type: 'select',
            required: false,
            options: [
              { label: 'Checking', value: 'checking' },
              { label: 'Savings', value: 'savings' },
              { label: 'Credit Card', value: 'credit' },
              { label: 'Investment', value: 'investment' },
            ],
            description: 'Type of account',
            default: 'checking',
          },
          {
            name: 'offBudget',
            label: 'Off Budget',
            type: 'boolean',
            required: false,
            description: 'Whether this account is off-budget',
            default: false,
          }
        );
        break;

      case 'create_category':
        dynamicInputs.push(
          {
            name: 'categoryName',
            label: 'Category Name',
            type: 'text',
            required: true,
            description: 'Name of the category to create',
          },
          {
            name: 'groupId',
            label: 'Group ID',
            type: 'text',
            required: false,
            description: 'ID of the category group',
          }
        );
        break;

      case 'get_transactions':
        dynamicInputs.push(
          {
            name: 'accountId',
            label: 'Account ID',
            type: 'text',
            required: false,
            description: 'Filter transactions by account ID',
          }
        );
        break;

      case 'create_transaction':
        dynamicInputs.push(
          {
            name: 'accountId',
            label: 'Account ID',
            type: 'text',
            required: true,
            description: 'ID of the account for the transaction',
          },
          {
            name: 'amount',
            label: 'Amount',
            type: 'number',
            required: true,
            description: 'Transaction amount (in dollars)',
          },
          {
            name: 'payee',
            label: 'Payee',
            type: 'text',
            required: true,
            description: 'Transaction payee',
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'text',
            required: false,
            description: 'Transaction notes',
          },
          {
            name: 'date',
            label: 'Date',
            type: 'text',
            required: true,
            description: 'Transaction date (YYYY-MM-DD)',
            placeholder: '2024-01-01',
          },
          {
            name: 'categoryId',
            label: 'Category ID',
            type: 'text',
            required: false,
            description: 'ID of the transaction category',
          }
        );
        break;

      case 'update_transaction':
        dynamicInputs.push(
          {
            name: 'transactionId',
            label: 'Transaction ID',
            type: 'text',
            required: true,
            description: 'ID of the transaction to update',
          },
          {
            name: 'amount',
            label: 'Amount',
            type: 'number',
            required: false,
            description: 'New transaction amount (in dollars)',
          },
          {
            name: 'payee',
            label: 'Payee',
            type: 'text',
            required: false,
            description: 'New transaction payee',
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'text',
            required: false,
            description: 'New transaction notes',
          },
          {
            name: 'date',
            label: 'Date',
            type: 'text',
            required: false,
            description: 'New transaction date (YYYY-MM-DD)',
          },
          {
            name: 'categoryId',
            label: 'Category ID',
            type: 'text',
            required: false,
            description: 'New category ID',
          }
        );
        break;

      case 'delete_transaction':
        dynamicInputs.push(
          {
            name: 'transactionId',
            label: 'Transaction ID',
            type: 'text',
            required: true,
            description: 'ID of the transaction to delete',
          }
        );
        break;

      case 'custom_api_call':
        dynamicInputs.push(
          {
            name: 'endpoint',
            label: 'API Endpoint',
            type: 'text',
            required: true,
            description: 'API endpoint path',
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
              { label: 'DELETE', value: 'DELETE' },
            ],
            description: 'HTTP method for the request',
          },
          {
            name: 'requestBody',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body',
          }
        );
        break;
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
      description: 'The response data from Actual Budget',
    },
    {
      name: 'accounts',
      type: 'array',
      description: 'List of accounts',
    },
    {
      name: 'account',
      type: 'object',
      description: 'Single account data',
    },
    {
      name: 'categories',
      type: 'array',
      description: 'List of categories',
    },
    {
      name: 'category',
      type: 'object',
      description: 'Single category data',
    },
    {
      name: 'transactions',
      type: 'array',
      description: 'List of transactions',
    },
    {
      name: 'transaction',
      type: 'object',
      description: 'Single transaction data',
    },
    {
      name: 'budgets',
      type: 'array',
      description: 'List of budgets',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { serverUrl, password, action, ...actionInputs } = inputs;

    const resolvedServerUrl = resolveVariable(serverUrl);
    const resolvedPassword = resolveVariable(password);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedServerUrl) {
      throw new Error('Actual Budget server URL is required');
    }

    try {
      // Use Supabase proxy function for Actual Budget API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('actualbudget-proxy', {
        body: {
          serverUrl: resolvedServerUrl,
          password: resolvedPassword,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Actual Budget proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        budget: null,
        accounts: null,
        categories: null,
        importedCount: null,
        transactionId: null,
        error: error.message,
      };
    }
  },
};