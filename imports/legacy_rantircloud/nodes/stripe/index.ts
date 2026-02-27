import { NodePlugin } from '@/types/node-plugin';
import { CreditCard } from 'lucide-react';

export const stripeNode: NodePlugin = {
  type: 'stripe',
  name: 'Stripe',
  description: 'Manage customers, payments, products, and subscriptions using Stripe API',
  category: 'action',
  icon: CreditCard,
  color: '#635bff',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Stripe secret API key'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Customer', value: 'CreateCustomer' },
        { label: 'Update Customer', value: 'UpdateCustomer' },
        { label: 'Retrieve Customer', value: 'RetrieveCustomer' },
        { label: 'Search Customers', value: 'SearchCustomer' },
        { label: 'Create Payment Intent', value: 'CreatePaymentIntent' },
        { label: 'Create Product', value: 'CreateProduct' },
        { label: 'Create Price', value: 'CreatePrice' },
        { label: 'Create Subscription', value: 'CreateSubscription' },
        { label: 'Create Invoice', value: 'CreateInvoice' },
        { label: 'Create Refund', value: 'CreateRefund' },
        { label: 'Create Payment Link', value: 'CreatePaymentLink' },
        { label: 'Search Subscriptions', value: 'SearchSubscriptions' },
        { label: 'Custom API Call', value: 'customApiCall' }
      ],
      description: 'Choose the Stripe operation to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const dynamicInputs = [];
    const action = currentInputs.action;

    switch (action) {
      case 'CreateCustomer':
        dynamicInputs.push(
          { name: 'email', label: 'Email', type: 'text', required: true },
          { name: 'name', label: 'Name', type: 'text' },
          { name: 'description', label: 'Description', type: 'text' }
        );
        break;
      case 'customApiCall':
        dynamicInputs.push(
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'endpoint', label: 'Endpoint', type: 'text', required: true },
          { name: 'body', label: 'Request Body (JSON)', type: 'textarea' },
          { name: 'queryParams', label: 'Query Parameters (JSON)', type: 'textarea' }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The result of the Stripe operation'
    },
    {
      name: 'id',
      type: 'string',
      description: 'ID of the created/retrieved resource'
    }
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Sanitize and validate API key
    let apiKey = inputs.apiKey?.trim();
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }
    if (!apiKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe API key format. Secret keys must start with "sk_"');
    }

    // Map PascalCase action names to camelCase for the edge function
    const actionMap: Record<string, string> = {
      'CreateCustomer': 'createCustomer',
      'UpdateCustomer': 'updateCustomer',
      'RetrieveCustomer': 'retrieveCustomer',
      'SearchCustomer': 'searchCustomer',
      'CreatePaymentIntent': 'createPaymentIntent',
      'CreateProduct': 'createProduct',
      'CreatePrice': 'createPrice',
      'CreateSubscription': 'createSubscription',
      'CreateInvoice': 'createInvoice',
      'CreateRefund': 'createRefund',
      'CreatePaymentLink': 'createPaymentLink',
      'SearchSubscriptions': 'searchSubscriptions',
      'customApiCall': 'customApiCall'
    };
    
    const mappedAction = actionMap[inputs.action] || inputs.action;
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-proxy', {
        body: {
          ...inputs,
          apiKey,
          action: mappedAction
        }
      });

      if (error) {
        throw new Error(`Stripe proxy error: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`Stripe operation failed: ${error.message}`);
    }
  }
};