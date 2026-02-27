import { NodePlugin } from '@/types/node-plugin';

export const checkoutNode: NodePlugin = {
  type: 'checkout',
  name: 'Checkout.com',
  description: 'Payment processing platform by Checkout.com',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/checkout.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'Secret Key',
      type: 'text',
      required: true,
      description: 'Your Checkout.com secret key (sk_xxx)',
      isApiKey: true,
    },
    {
      name: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      default: 'sandbox',
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Production', value: 'production' },
      ],
      description: 'API environment',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Customer', value: 'createCustomer' },
        { label: 'Update Customer', value: 'updateCustomer' },
        { label: 'Create Payment Link', value: 'createPaymentLink' },
        { label: 'Create Payout', value: 'createPayout' },
        { label: 'Refund Payment', value: 'refundPayment' },
        { label: 'Get Payment Details', value: 'getPaymentDetails' },
        { label: 'Get Payment', value: 'getPayment' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createCustomer') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true, description: 'Customer email address' },
        { name: 'name', label: 'Name', type: 'text' as const, required: false, description: 'Customer full name' },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false, description: 'Customer phone number' },
        { name: 'metadata', label: 'Metadata (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Additional metadata' }
      );
    } else if (action === 'updateCustomer') {
      inputs.push(
        { name: 'customerId', label: 'Customer ID', type: 'text' as const, required: true, description: 'The customer ID to update' },
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'name', label: 'Name', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
        { name: 'metadata', label: 'Metadata (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    } else if (action === 'createPaymentLink') {
      inputs.push(
        { name: 'amount', label: 'Amount (minor units)', type: 'number' as const, required: true, description: 'Payment amount in minor units (e.g., cents for USD)' },
        { name: 'currency', label: 'Currency', type: 'text' as const, required: true, default: 'USD', description: 'Three-letter ISO currency code' },
        { name: 'reference', label: 'Reference', type: 'text' as const, required: false, description: 'Your reference for the payment' },
        { name: 'description', label: 'Description', type: 'text' as const, required: false },
        { name: 'successUrl', label: 'Success URL', type: 'text' as const, required: false },
        { name: 'cancelUrl', label: 'Cancel URL', type: 'text' as const, required: false }
      );
    } else if (action === 'createPayout') {
      inputs.push(
        { name: 'sourceEntityId', label: 'Source Entity ID', type: 'text' as const, required: true, description: 'Source entity/sub-account ID for the transfer' },
        { name: 'destinationEntityId', label: 'Destination Entity ID', type: 'text' as const, required: true, description: 'Destination entity/sub-account ID' },
        { name: 'amount', label: 'Amount (minor units)', type: 'number' as const, required: true },
        { name: 'currency', label: 'Currency', type: 'text' as const, required: true, default: 'USD' },
        { name: 'reference', label: 'Reference', type: 'text' as const, required: false }
      );
    } else if (action === 'refundPayment') {
      inputs.push(
        { name: 'paymentId', label: 'Payment ID', type: 'text' as const, required: true, description: 'The payment ID to refund' },
        { name: 'amount', label: 'Amount (minor units)', type: 'number' as const, required: false, description: 'Refund amount (leave empty for full refund)' },
        { name: 'reference', label: 'Reference', type: 'text' as const, required: false }
      );
    } else if (action === 'getPaymentDetails' || action === 'getPayment') {
      inputs.push(
        { name: 'paymentId', label: 'Payment ID', type: 'text' as const, required: true }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint (e.g., /payments)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
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

    const { data, error } = await supabase.functions.invoke('checkout-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
