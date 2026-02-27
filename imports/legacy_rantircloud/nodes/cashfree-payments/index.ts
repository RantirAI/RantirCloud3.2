import { NodePlugin } from '@/types/node-plugin';

export const cashfreePaymentsNode: NodePlugin = {
  type: 'cashfree-payments',
  name: 'Cashfree Payments',
  description: 'Payment gateway for India - process payments, refunds, and payouts',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cashfree-payments.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      description: 'Cashfree Client ID',
      placeholder: 'your-client-id',
      isApiKey: true,
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'text',
      required: true,
      description: 'Cashfree Client Secret',
      placeholder: 'your-client-secret',
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
        { label: 'Create Order', value: 'createOrder' },
        { label: 'Create Payment Link', value: 'createPaymentLink' },
        { label: 'Create Refund', value: 'createRefund' },
        { label: 'Cancel Payment Link', value: 'cancelPaymentLink' },
        { label: 'Fetch Payment Link Details', value: 'fetchPaymentLinkDetails' },
        { label: 'Create Cashgram', value: 'createCashgram' },
        { label: 'Get Orders For Payment Link', value: 'getOrdersForPaymentLink' },
        { label: 'Get All Refunds For Order', value: 'getAllRefundsForOrder' },
        { label: 'Deactivate Cashgram', value: 'deactivateCashgram' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'orderId',
      label: 'Order ID',
      type: 'text',
      required: false,
      description: 'Cashfree Order ID',
      placeholder: 'order-id',
      showWhen: {
        field: 'action',
        values: ['createRefund', 'getAllRefundsForOrder']
      }
    },
    {
      name: 'orderAmount',
      label: 'Order Amount',
      type: 'number',
      required: false,
      description: 'Amount in INR',
      placeholder: '100.00',
      showWhen: {
        field: 'action',
        values: ['createOrder']
      }
    },
    {
      name: 'customerEmail',
      label: 'Customer Email',
      type: 'text',
      required: false,
      description: 'Customer email address',
      placeholder: 'customer@example.com',
      showWhen: {
        field: 'action',
        values: ['createOrder', 'createPaymentLink', 'createCashgram']
      }
    },
    {
      name: 'customerPhone',
      label: 'Customer Phone',
      type: 'text',
      required: false,
      description: 'Customer phone number',
      placeholder: '9999999999',
      showWhen: {
        field: 'action',
        values: ['createOrder', 'createPaymentLink', 'createCashgram']
      }
    },
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: false,
      description: 'Customer name',
      placeholder: 'John Doe',
      showWhen: {
        field: 'action',
        values: ['createOrder', 'createPaymentLink', 'createCashgram']
      }
    },
    {
      name: 'linkAmount',
      label: 'Link Amount',
      type: 'number',
      required: false,
      description: 'Payment link amount in INR',
      placeholder: '100.00',
      showWhen: {
        field: 'action',
        values: ['createPaymentLink']
      }
    },
    {
      name: 'linkId',
      label: 'Link ID',
      type: 'text',
      required: false,
      description: 'Payment link ID',
      placeholder: 'link-id',
      showWhen: {
        field: 'action',
        values: ['cancelPaymentLink', 'fetchPaymentLinkDetails', 'getOrdersForPaymentLink']
      }
    },
    {
      name: 'linkPurpose',
      label: 'Link Purpose',
      type: 'text',
      required: false,
      description: 'Purpose of the payment link',
      placeholder: 'Payment for services',
      showWhen: {
        field: 'action',
        values: ['createPaymentLink']
      }
    },
    {
      name: 'refundAmount',
      label: 'Refund Amount',
      type: 'number',
      required: false,
      description: 'Refund amount in INR',
      placeholder: '50.00',
      showWhen: {
        field: 'action',
        values: ['createRefund']
      }
    },
    {
      name: 'refundNote',
      label: 'Refund Note',
      type: 'text',
      required: false,
      description: 'Note for the refund',
      placeholder: 'Refund reason',
      showWhen: {
        field: 'action',
        values: ['createRefund']
      }
    },
    {
      name: 'cashgramAmount',
      label: 'Cashgram Amount',
      type: 'number',
      required: false,
      description: 'Cashgram amount in INR',
      placeholder: '100.00',
      showWhen: {
        field: 'action',
        values: ['createCashgram']
      }
    },
    {
      name: 'cashgramId',
      label: 'Cashgram ID',
      type: 'text',
      required: false,
      description: 'Cashgram ID',
      placeholder: 'cashgram-id',
      showWhen: {
        field: 'action',
        values: ['deactivateCashgram']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Operation result data',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Success indicator',
    }
  ],
  async execute(inputs, context) {
    const { clientId, clientSecret, action, ...otherInputs } = inputs;
    
    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('cashfree-payments-proxy', {
        body: {
          clientId,
          clientSecret,
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Cashfree execution failed: ${error.message}`);
    }
  }
};
