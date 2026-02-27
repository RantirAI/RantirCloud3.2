import { corsHeaders } from '../_shared/cors.ts';

interface ShopifyRequest {
  shopName: string;
  adminToken: string;
  action: string;
  inputs?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopName, adminToken, action, inputs = {} }: ShopifyRequest = await req.json();

    if (!shopName || !adminToken) {
      throw new Error('Shop name and admin token are required');
    }

    console.log(`Shopify Proxy: Processing action: ${action}`);

    // Ensure shop name is in correct format
    const formattedShopName = shopName.includes('.myshopify.com') 
      ? shopName 
      : `${shopName}.myshopify.com`;

    const baseUrl = `https://${formattedShopName}/admin/api/2023-10`;
    
    const headers = {
      'X-Shopify-Access-Token': adminToken,
      'Content-Type': 'application/json'
    };

    let url = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      // === INVENTORY ACTIONS ===
      case 'adjust_inventory':
        url = `${baseUrl}/inventory_levels/adjust.json`;
        method = 'POST';
        body = JSON.stringify({
          location_id: inputs.location_id,
          inventory_item_id: inputs.inventory_item_id,
          available_adjustment: parseInt(inputs.available_adjustment)
        });
        break;

      case 'get_locations':
        url = `${baseUrl}/locations.json`;
        break;

      // === ORDER ACTIONS ===
      case 'cancel_order':
        url = `${baseUrl}/orders/${inputs.order_id}/cancel.json`;
        method = 'POST';
        body = JSON.stringify({});
        break;

      case 'close_order':
        url = `${baseUrl}/orders/${inputs.order_id}/close.json`;
        method = 'POST';
        body = JSON.stringify({});
        break;

      case 'create_order':
        url = `${baseUrl}/orders.json`;
        method = 'POST';
        const orderData: any = {
          line_items: typeof inputs.line_items === 'string' ? JSON.parse(inputs.line_items) : inputs.line_items || []
        };
        if (inputs.customer_id) orderData.customer = { id: inputs.customer_id };
        if (inputs.financial_status) orderData.financial_status = inputs.financial_status;
        if (inputs.shipping_address) {
          orderData.shipping_address = typeof inputs.shipping_address === 'string' 
            ? JSON.parse(inputs.shipping_address) 
            : inputs.shipping_address;
        }
        body = JSON.stringify({ order: orderData });
        break;

      case 'get_order':
        url = `${baseUrl}/orders/${inputs.order_id}.json`;
        break;

      case 'get_orders':
        url = `${baseUrl}/orders.json`;
        const orderParams = new URLSearchParams();
        if (inputs.status) orderParams.append('status', inputs.status);
        if (inputs.limit) orderParams.append('limit', inputs.limit.toString());
        if (inputs.created_at_min) orderParams.append('created_at_min', inputs.created_at_min);
        if (inputs.created_at_max) orderParams.append('created_at_max', inputs.created_at_max);
        if (orderParams.toString()) url += `?${orderParams.toString()}`;
        break;

      case 'update_order':
        url = `${baseUrl}/orders/${inputs.order_id}.json`;
        method = 'PUT';
        const updateOrderData: any = {};
        if (inputs.note) updateOrderData.note = inputs.note;
        if (inputs.tags) updateOrderData.tags = inputs.tags;
        body = JSON.stringify({ order: updateOrderData });
        break;

      case 'get_order_transactions':
        url = `${baseUrl}/orders/${inputs.order_id}/transactions.json`;
        break;

      // === TRANSACTION ACTIONS ===
      case 'create_transaction':
        url = `${baseUrl}/orders/${inputs.order_id}/transactions.json`;
        method = 'POST';
        const transactionData: any = {
          kind: inputs.kind || 'capture',
          amount: inputs.amount
        };
        if (inputs.currency) transactionData.currency = inputs.currency;
        if (inputs.parent_id) transactionData.parent_id = inputs.parent_id;
        body = JSON.stringify({ transaction: transactionData });
        break;

      case 'get_transaction':
        url = `${baseUrl}/orders/${inputs.order_id}/transactions/${inputs.transaction_id}.json`;
        break;

      // === FULFILLMENT ACTIONS ===
      case 'create_fulfillment':
        url = `${baseUrl}/orders/${inputs.order_id}/fulfillments.json`;
        method = 'POST';
        const fulfillmentData: any = {
          location_id: inputs.location_id,
          tracking_number: inputs.tracking_number,
          tracking_company: inputs.tracking_company,
          notify_customer: inputs.notify_customer !== false
        };
        if (inputs.line_items) {
          fulfillmentData.line_items = typeof inputs.line_items === 'string' 
            ? JSON.parse(inputs.line_items) 
            : inputs.line_items;
        }
        body = JSON.stringify({ fulfillment: fulfillmentData });
        break;

      case 'get_fulfillment':
        url = `${baseUrl}/orders/${inputs.order_id}/fulfillments/${inputs.fulfillment_id}.json`;
        break;

      case 'get_fulfillments':
        url = `${baseUrl}/orders/${inputs.order_id}/fulfillments.json`;
        break;

      case 'update_fulfillment':
        url = `${baseUrl}/orders/${inputs.order_id}/fulfillments/${inputs.fulfillment_id}.json`;
        method = 'PUT';
        const updateFulfillmentData: any = {};
        if (inputs.tracking_number) updateFulfillmentData.tracking_number = inputs.tracking_number;
        if (inputs.tracking_company) updateFulfillmentData.tracking_company = inputs.tracking_company;
        if (inputs.tracking_url) updateFulfillmentData.tracking_url = inputs.tracking_url;
        body = JSON.stringify({ fulfillment: updateFulfillmentData });
        break;

      case 'create_fulfillment_event':
        url = `${baseUrl}/orders/${inputs.order_id}/fulfillments/${inputs.fulfillment_id}/events.json`;
        method = 'POST';
        body = JSON.stringify({
          event: {
            status: inputs.status,
            message: inputs.message
          }
        });
        break;

      // === PRODUCT ACTIONS ===
      case 'create_product':
        url = `${baseUrl}/products.json`;
        method = 'POST';
        const productData: any = {
          title: inputs.title
        };
        if (inputs.body_html) productData.body_html = inputs.body_html;
        if (inputs.vendor) productData.vendor = inputs.vendor;
        if (inputs.product_type) productData.product_type = inputs.product_type;
        if (inputs.tags) productData.tags = inputs.tags;
        if (inputs.variants) {
          productData.variants = typeof inputs.variants === 'string' 
            ? JSON.parse(inputs.variants) 
            : inputs.variants;
        }
        body = JSON.stringify({ product: productData });
        break;

      case 'get_product':
        url = `${baseUrl}/products/${inputs.product_id}.json`;
        break;

      case 'get_products':
        url = `${baseUrl}/products.json`;
        const productParams = new URLSearchParams();
        if (inputs.limit) productParams.append('limit', inputs.limit.toString());
        if (inputs.status) productParams.append('status', inputs.status);
        if (inputs.collection_id) productParams.append('collection_id', inputs.collection_id);
        if (inputs.product_type) productParams.append('product_type', inputs.product_type);
        if (productParams.toString()) url += `?${productParams.toString()}`;
        break;

      case 'update_product':
        url = `${baseUrl}/products/${inputs.product_id}.json`;
        method = 'PUT';
        const updateProductData: any = {};
        if (inputs.title) updateProductData.title = inputs.title;
        if (inputs.body_html) updateProductData.body_html = inputs.body_html;
        if (inputs.vendor) updateProductData.vendor = inputs.vendor;
        if (inputs.tags) updateProductData.tags = inputs.tags;
        body = JSON.stringify({ product: updateProductData });
        break;

      case 'upload_product_image':
        url = `${baseUrl}/products/${inputs.product_id}/images.json`;
        method = 'POST';
        const imageData: any = {
          src: inputs.image_src
        };
        if (inputs.alt_text) imageData.alt = inputs.alt_text;
        body = JSON.stringify({ image: imageData });
        break;

      // === CUSTOMER ACTIONS ===
      case 'create_customer':
        url = `${baseUrl}/customers.json`;
        method = 'POST';
        const customerData: any = {
          first_name: inputs.first_name,
          last_name: inputs.last_name,
          email: inputs.email
        };
        if (inputs.phone) customerData.phone = inputs.phone;
        if (inputs.tags) customerData.tags = inputs.tags;
        if (inputs.accepts_marketing !== undefined) customerData.accepts_marketing = inputs.accepts_marketing;
        body = JSON.stringify({ customer: customerData });
        break;

      case 'get_customer':
        url = `${baseUrl}/customers/${inputs.customer_id}.json`;
        break;

      case 'get_customers':
        url = `${baseUrl}/customers.json`;
        const customerParams = new URLSearchParams();
        if (inputs.limit) customerParams.append('limit', inputs.limit.toString());
        if (inputs.email) customerParams.append('email', inputs.email);
        if (customerParams.toString()) url += `?${customerParams.toString()}`;
        break;

      case 'get_customer_orders':
        url = `${baseUrl}/customers/${inputs.customer_id}/orders.json`;
        const customerOrderParams = new URLSearchParams();
        if (inputs.status) customerOrderParams.append('status', inputs.status);
        if (inputs.limit) customerOrderParams.append('limit', inputs.limit.toString());
        if (customerOrderParams.toString()) url += `?${customerOrderParams.toString()}`;
        break;

      case 'update_customer':
        url = `${baseUrl}/customers/${inputs.customer_id}.json`;
        method = 'PUT';
        const updateCustomerData: any = {};
        if (inputs.first_name) updateCustomerData.first_name = inputs.first_name;
        if (inputs.last_name) updateCustomerData.last_name = inputs.last_name;
        if (inputs.email) updateCustomerData.email = inputs.email;
        if (inputs.phone) updateCustomerData.phone = inputs.phone;
        if (inputs.tags) updateCustomerData.tags = inputs.tags;
        if (inputs.note) updateCustomerData.note = inputs.note;
        if (inputs.accepts_marketing !== undefined) updateCustomerData.accepts_marketing = inputs.accepts_marketing;
        body = JSON.stringify({ customer: updateCustomerData });
        break;

      // === COLLECTION ACTIONS ===
      case 'create_collect':
        url = `${baseUrl}/collects.json`;
        method = 'POST';
        body = JSON.stringify({
          collect: {
            product_id: inputs.product_id,
            collection_id: inputs.collection_id,
            position: inputs.position
          }
        });
        break;

      case 'get_collections':
        url = `${baseUrl}/custom_collections.json`;
        const collectionParams = new URLSearchParams();
        if (inputs.limit) collectionParams.append('limit', inputs.limit.toString());
        if (inputs.title) collectionParams.append('title', inputs.title);
        if (collectionParams.toString()) url += `?${collectionParams.toString()}`;
        break;

      case 'get_smart_collections':
        url = `${baseUrl}/smart_collections.json`;
        break;

      // === DRAFT ORDER ACTIONS ===
      case 'create_draft_order':
        url = `${baseUrl}/draft_orders.json`;
        method = 'POST';
        const draftOrderData: any = {
          line_items: typeof inputs.line_items === 'string' ? JSON.parse(inputs.line_items) : inputs.line_items || []
        };
        if (inputs.customer_id) draftOrderData.customer = { id: inputs.customer_id };
        if (inputs.email) draftOrderData.email = inputs.email;
        if (inputs.note) draftOrderData.note = inputs.note;
        if (inputs.shipping_address) {
          draftOrderData.shipping_address = typeof inputs.shipping_address === 'string'
            ? JSON.parse(inputs.shipping_address)
            : inputs.shipping_address;
        }
        if (inputs.billing_address) {
          draftOrderData.billing_address = typeof inputs.billing_address === 'string'
            ? JSON.parse(inputs.billing_address)
            : inputs.billing_address;
        }
        if (inputs.applied_discount) {
          draftOrderData.applied_discount = typeof inputs.applied_discount === 'string'
            ? JSON.parse(inputs.applied_discount)
            : inputs.applied_discount;
        }
        body = JSON.stringify({ draft_order: draftOrderData });
        break;

      case 'get_draft_order':
        url = `${baseUrl}/draft_orders/${inputs.draft_order_id}.json`;
        break;

      case 'get_draft_orders':
        url = `${baseUrl}/draft_orders.json`;
        const draftOrderParams = new URLSearchParams();
        if (inputs.status) draftOrderParams.append('status', inputs.status);
        if (inputs.limit) draftOrderParams.append('limit', inputs.limit.toString());
        if (draftOrderParams.toString()) url += `?${draftOrderParams.toString()}`;
        break;

      case 'complete_draft_order':
        url = `${baseUrl}/draft_orders/${inputs.draft_order_id}/complete.json`;
        method = 'PUT';
        body = JSON.stringify({
          payment_pending: inputs.payment_pending || false
        });
        break;

      case 'delete_draft_order':
        url = `${baseUrl}/draft_orders/${inputs.draft_order_id}.json`;
        method = 'DELETE';
        break;

      // === THEME/ASSET ACTIONS ===
      case 'get_themes':
        url = `${baseUrl}/themes.json`;
        break;

      case 'get_asset':
        url = `${baseUrl}/themes/${inputs.theme_id}/assets.json`;
        const assetParams = new URLSearchParams();
        assetParams.append('asset[key]', inputs.asset_key);
        url += `?${assetParams.toString()}`;
        break;

      case 'get_assets':
        url = `${baseUrl}/themes/${inputs.theme_id}/assets.json`;
        break;

      case 'update_asset':
        url = `${baseUrl}/themes/${inputs.theme_id}/assets.json`;
        method = 'PUT';
        body = JSON.stringify({
          asset: {
            key: inputs.asset_key,
            value: inputs.value
          }
        });
        break;

      // === DISCOUNT ACTIONS ===
      case 'create_discount':
        url = `${baseUrl}/price_rules.json`;
        method = 'POST';
        const priceRuleData: any = {
          title: inputs.title,
          target_type: inputs.target_type || 'line_item',
          target_selection: inputs.target_selection || 'all',
          allocation_method: inputs.allocation_method || 'across',
          value_type: inputs.value_type || 'percentage',
          value: inputs.value,
          customer_selection: inputs.customer_selection || 'all',
          starts_at: inputs.starts_at || new Date().toISOString()
        };
        if (inputs.ends_at) priceRuleData.ends_at = inputs.ends_at;
        if (inputs.usage_limit) priceRuleData.usage_limit = inputs.usage_limit;
        body = JSON.stringify({ price_rule: priceRuleData });
        break;

      case 'get_discounts':
        url = `${baseUrl}/price_rules.json`;
        break;

      // === CUSTOM API CALL ===
      case 'custom_api_call':
        url = `${baseUrl}${inputs.endpoint}`;
        method = inputs.method || 'GET';
        if (inputs.request_body) {
          body = typeof inputs.request_body === 'string' 
            ? inputs.request_body 
            : JSON.stringify(inputs.request_body);
        }
        break;

      default:
        throw new Error(`Unsupported Shopify action: ${action}`);
    }

    console.log(`Shopify Proxy: Making ${method} request to ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = { message: 'Invalid JSON response' };
    }

    if (!response.ok) {
      console.error(`Shopify API Error:`, responseData);
      throw new Error(responseData.errors || responseData.message || 'Shopify API request failed');
    }

    console.log(`Shopify Proxy: Successfully processed ${action}`);

    return new Response(JSON.stringify({
      data: responseData,
      success: true,
      status_code: response.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Shopify Proxy Error:', error);
    return new Response(JSON.stringify({
      data: null,
      success: false,
      status_code: 500,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
