import { NodePlugin } from '@/types/node-plugin';

export const cartloomNode: NodePlugin = {
  type: 'cartloom',
  name: 'Cartloom',
  description: 'E-commerce shopping cart and order management',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cartloom.png',
  color: '#FF6B35',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cartloom API key. Find it in Dashboard > Settings > API Keys.',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'domain',
      label: 'Store Domain',
      type: 'text',
      required: true,
      description: 'Your Cartloom subdomain (e.g., "my-store" from "my-store.cartloom.com").',
      placeholder: 'my-store',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Products', value: 'getProducts', description: 'Get a list of products from your store' },
        { label: 'Get Order', value: 'getOrder', description: 'Get a specific order by invoice ID' },
        { label: 'Get Orders by Date', value: 'getOrdersByDate', description: 'Get orders within a date range' },
        { label: 'Get Orders by Email', value: 'getOrdersByEmail', description: 'Get orders for an email within a date range' },
        { label: 'Create Discount', value: 'createDiscount', description: 'Create a new discount' },
        { label: 'Get Discount', value: 'getDiscount', description: 'Get a specific discount by ID' },
        { label: 'Get All Discounts', value: 'getAllDiscounts', description: 'Get a list of all discounts' },
        { label: 'Custom API Call', value: 'createCustomApiCall', description: 'Make a custom API request' },
      ],
      description: 'Select the action to perform',
      dependsOnApiKey: true,
    },
    // Order fields
    {
      name: 'orderId',
      label: 'Invoice ID',
      type: 'text',
      required: false,
      description: 'The invoice ID of the order',
      placeholder: 'INV-12345',
      showWhen: {
        field: 'action',
        values: ['getOrder']
      }
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'text',
      required: false,
      description: 'Start date for date range (YYYY-MM-DD)',
      placeholder: '2024-01-01',
      showWhen: {
        field: 'action',
        values: ['getOrdersByDate', 'getOrdersByEmail']
      }
    },
    {
      name: 'endDate',
      label: 'End Date',
      type: 'text',
      required: false,
      description: 'End date for date range (YYYY-MM-DD). Optional.',
      placeholder: '2024-12-31',
      showWhen: {
        field: 'action',
        values: ['getOrdersByDate', 'getOrdersByEmail']
      }
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: false,
      description: 'Customer email to filter orders',
      placeholder: 'customer@example.com',
      showWhen: {
        field: 'action',
        values: ['getOrdersByEmail']
      }
    },
    // Discount fields
    {
      name: 'discountId',
      label: 'Discount ID',
      type: 'text',
      required: false,
      description: 'The ID of the discount',
      placeholder: '123',
      showWhen: {
        field: 'action',
        values: ['getDiscount']
      }
    },
    {
      name: 'discountTitle',
      label: 'Title',
      type: 'text',
      required: false,
      description: 'Name/title of the discount',
      placeholder: 'Summer Sale',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountCode',
      label: 'Discount Code',
      type: 'text',
      required: false,
      description: 'Optional code customers enter at checkout',
      placeholder: 'SAVE10',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountType',
      label: 'Type of Discount',
      type: 'select',
      required: false,
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed Amount', value: 'fixed' },
        { label: 'Free Shipping', value: 'shipping' },
      ],
      description: 'Type of discount to apply',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountValue',
      label: 'Amount',
      type: 'number',
      required: false,
      description: 'Discount amount (e.g., 10 for 10% or $10)',
      placeholder: '10',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountEnabled',
      label: 'Enabled',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether the discount is active',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountAuto',
      label: 'Auto Apply',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Automatically apply discount without code',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountUnlimited',
      label: 'Unlimited Uses',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Allow unlimited uses of this discount',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountTarget',
      label: 'Discount Target',
      type: 'select',
      required: false,
      default: 'order',
      options: [
        { label: 'Entire Order', value: 'order' },
        { label: 'Specific Products', value: 'products' },
      ],
      description: 'What the discount applies to',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountStartDate',
      label: 'Start Date',
      type: 'text',
      required: false,
      description: 'When the discount becomes active (YYYY-MM-DD)',
      placeholder: '2024-01-01',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    {
      name: 'discountStopDate',
      label: 'Stop Date',
      type: 'text',
      required: false,
      description: 'When the discount expires (YYYY-MM-DD)',
      placeholder: '2024-12-31',
      showWhen: {
        field: 'action',
        values: ['createDiscount']
      }
    },
    // Custom API Call fields
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'API endpoint path (e.g., /products/list, /orders/get)',
      placeholder: '/products/list',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "invoice": "INV-123"\n}',
      description: 'JSON body parameters for the request',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
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
    const { apiKey, domain, action, ...otherInputs } = inputs;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required. Find it in Cartloom Dashboard > Settings > API Keys.');
    }

    if (!domain || domain.trim() === '') {
      throw new Error('Store Domain is required. This is your subdomain (e.g., "my-store" from "my-store.cartloom.com").');
    }

    if (!action) {
      throw new Error('Please select an action to perform.');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('cartloom-proxy', {
        body: {
          apiKey: apiKey.trim(),
          domain: domain.trim().replace('.cartloom.com', ''),
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Connection error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Cartloom: ${error.message}`);
    }
  }
};
