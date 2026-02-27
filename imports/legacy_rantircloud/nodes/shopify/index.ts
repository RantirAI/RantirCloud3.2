import { NodePlugin } from '@/types/node-plugin';
import { ShopifyIcon } from '@/components/flow/icons/ShopifyIcon';

export const shopifyNode: NodePlugin = {
  type: 'shopify',
  name: 'Shopify',
  description: 'Integrate with Shopify Admin API for managing products, orders, customers and more',
  category: 'action',
  icon: ShopifyIcon,
  color: '#95BF47',
  inputs: [
    {
      name: 'shopName',
      label: 'Shop Name',
      type: 'text',
      required: true,
      description: 'Your Shopify shop name (e.g., myshop.myshopify.com)',
      placeholder: 'myshop.myshopify.com'
    },
    {
      name: 'adminToken',
      label: 'Admin API Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Shopify Admin API access token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        // Inventory
        { label: 'Adjust Inventory Level', value: 'adjust_inventory' },
        
        // Orders
        { label: 'Cancel Order', value: 'cancel_order' },
        { label: 'Close Order', value: 'close_order' },
        { label: 'Create Order', value: 'create_order' },
        { label: 'Get Order', value: 'get_order' },
        { label: 'Get Order Transactions', value: 'get_order_transactions' },
        { label: 'Update Order', value: 'update_order' },
        
        // Products
        { label: 'Create Product', value: 'create_product' },
        { label: 'Get Product', value: 'get_product' },
        { label: 'Get Products', value: 'get_products' },
        { label: 'Update Product', value: 'update_product' },
        { label: 'Upload Product Image', value: 'upload_product_image' },
        
        // Customers
        { label: 'Create Customer', value: 'create_customer' },
        { label: 'Get Customer', value: 'get_customer' },
        { label: 'Get Customers', value: 'get_customers' },
        { label: 'Get Customer Orders', value: 'get_customer_orders' },
        { label: 'Update Customer', value: 'update_customer' },
        
        // Fulfillments
        { label: 'Create Fulfillment Event', value: 'create_fulfillment_event' },
        { label: 'Get Fulfillment', value: 'get_fulfillment' },
        { label: 'Get Fulfillments', value: 'get_fulfillments' },
        
        // Collections
        { label: 'Create Collect', value: 'create_collect' },
        
        // Draft Orders
        { label: 'Create Draft Order', value: 'create_draft_order' },
        
        // Transactions
        { label: 'Create Transaction', value: 'create_transaction' },
        { label: 'Get Transaction', value: 'get_transaction' },
        
        // Assets
        { label: 'Get Asset', value: 'get_asset' },
        
        // Locations
        { label: 'Get Locations', value: 'get_locations' },
        
        // Custom
        { label: 'Custom API Call', value: 'custom_api_call' }
      ],
      description: 'Select the Shopify action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'adjust_inventory':
        dynamicInputs.push(
          { name: 'inventory_item_id', label: 'Inventory Item ID', type: 'text', required: true },
          { name: 'location_id', label: 'Location ID', type: 'text', required: true },
          { name: 'available_adjustment', label: 'Available Adjustment', type: 'number', required: true }
        );
        break;

      case 'cancel_order':
      case 'close_order':
      case 'get_order':
      case 'get_order_transactions':
        dynamicInputs.push(
          { name: 'order_id', label: 'Order ID', type: 'text', required: true }
        );
        break;

      case 'create_order':
        dynamicInputs.push(
          { name: 'line_items', label: 'Line Items (JSON)', type: 'code', language: 'json', required: true },
          { name: 'customer_id', label: 'Customer ID', type: 'text' },
          { name: 'financial_status', label: 'Financial Status', type: 'select', options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Authorized', value: 'authorized' },
            { label: 'Paid', value: 'paid' }
          ]},
          { name: 'shipping_address', label: 'Shipping Address (JSON)', type: 'code', language: 'json' }
        );
        break;

      case 'create_product':
        dynamicInputs.push(
          { name: 'title', label: 'Product Title', type: 'text', required: true },
          { name: 'body_html', label: 'Description (HTML)', type: 'textarea' },
          { name: 'vendor', label: 'Vendor', type: 'text' },
          { name: 'product_type', label: 'Product Type', type: 'text' },
          { name: 'tags', label: 'Tags', type: 'text' },
          { name: 'variants', label: 'Variants (JSON)', type: 'code', language: 'json' }
        );
        break;

      case 'get_product':
        dynamicInputs.push(
          { name: 'product_id', label: 'Product ID', type: 'text', required: true }
        );
        break;

      case 'create_customer':
        dynamicInputs.push(
          { name: 'first_name', label: 'First Name', type: 'text', required: true },
          { name: 'last_name', label: 'Last Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'tags', label: 'Tags', type: 'text' }
        );
        break;

      case 'custom_api_call':
        dynamicInputs.push(
          { name: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: '/admin/api/2023-10/products.json' },
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'request_body', label: 'Request Body (JSON)', type: 'code', language: 'json' }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Response data from Shopify API'
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'status_code',
      type: 'number',
      description: 'HTTP status code of the response'
    }
  ],
  async execute(inputs, context) {
    const { shopName, adminToken, action, ...operationInputs } = inputs;

    if (!shopName || !adminToken) {
      throw new Error('Shop name and admin token are required');
    }

    try {
      // Use Supabase proxy function for Shopify API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('shopify-proxy', {
        body: {
          shopName,
          adminToken,
          action,
          inputs: operationInputs
        }
      });

      if (error) {
        throw new Error(`Shopify proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Shopify operation failed: ${error.message}`);
    }
  }
};