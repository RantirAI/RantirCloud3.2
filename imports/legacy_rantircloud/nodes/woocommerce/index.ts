import { NodePlugin } from '@/types/node-plugin';

export const woocommerceNode: NodePlugin = {
  type: 'woocommerce',
  name: 'WooCommerce',
  description: 'Manage WooCommerce products and orders',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/woocommerce.png',
  color: '#96588A',
  inputs: [
    {
      name: 'storeUrl',
      label: 'Store URL',
      type: 'text',
      required: true,
      placeholder: 'https://yourstore.com',
      description: 'Your WooCommerce store URL',
    },
    {
      name: 'consumerKey',
      label: 'Consumer Key',
      type: 'text',
      required: true,
      placeholder: 'ck_xxxxxxxxxxxx',
      description: 'WooCommerce Consumer Key',
      isApiKey: true,
    },
    {
      name: 'consumerSecret',
      label: 'Consumer Secret',
      type: 'text',
      required: true,
      placeholder: 'cs_xxxxxxxxxxxx',
      description: 'WooCommerce Consumer Secret',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Customer', value: 'wooCreateCustomer' },
        { label: 'Create Coupon', value: 'wooCreateCoupon' },
        { label: 'Create Product', value: 'wooCreateProduct' },
        { label: 'Find Customer', value: 'wooFindCustomer' },
        { label: 'Find Product', value: 'wooFindProduct' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Select the WooCommerce action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'wooCreateCustomer') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'customer@example.com' },
        { name: 'firstName', label: 'First Name', type: 'text', required: false, placeholder: 'John' },
        { name: 'lastName', label: 'Last Name', type: 'text', required: false, placeholder: 'Doe' }
      );
    } else if (action === 'wooCreateCoupon') {
      inputs.push(
        { name: 'code', label: 'Coupon Code', type: 'text', required: true, placeholder: 'SAVE10' },
        { name: 'discountType', label: 'Discount Type', type: 'select', required: true, options: [
          { label: 'Percentage', value: 'percent' },
          { label: 'Fixed Amount', value: 'fixed_cart' },
        ]},
        { name: 'amount', label: 'Amount', type: 'text', required: true, placeholder: '10' }
      );
    } else if (action === 'wooCreateProduct') {
      inputs.push(
        { name: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'Amazing Product' },
        { name: 'price', label: 'Price', type: 'text', required: true, placeholder: '29.99' },
        { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Product description' },
        { name: 'sku', label: 'SKU', type: 'text', required: false, placeholder: 'PROD-001' }
      );
    } else if (action === 'wooFindCustomer') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'customer@example.com' }
      );
    } else if (action === 'wooFindProduct') {
      inputs.push(
        { name: 'search', label: 'Search Term', type: 'text', required: true, placeholder: 'Product name or SKU' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/wc/v3/products' },
        { name: 'method', label: 'Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body', type: 'textarea', required: false, placeholder: 'JSON body' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from WooCommerce API',
    },
    {
      name: 'productUrl',
      type: 'string',
      description: 'URL of the product',
    },
  ],
  async execute(inputs, context) {
    const { storeUrl, consumerKey, consumerSecret, action, ...params } = inputs;
    
    if (!storeUrl || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials are required');
    }
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('woocommerce-action', {
        body: { storeUrl, consumerKey, consumerSecret, action, ...params },
      });

      if (error) throw error;

      return {
        result: data,
        productUrl: data?.permalink || '',
      };
    } catch (error) {
      throw new Error(`WooCommerce API error: ${error.message}`);
    }
  },
};
