import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { storeUrl, consumerKey, consumerSecret, action, ...params } = requestBody;
    
    if (!storeUrl || !consumerKey || !consumerSecret) {
      throw new Error("WooCommerce credentials are required");
    }

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    let url = '';
    let method = 'GET';
    let body: string | null = null;

    switch (action) {
      // === PRODUCT ACTIONS ===
      case 'create_product':
      case 'wooCreateProduct':
        url = `${storeUrl}/wp-json/wc/v3/products`;
        method = 'POST';
        body = JSON.stringify({
          name: params.productName || params.name,
          regular_price: params.price || params.regular_price,
          description: params.description,
          type: params.type || 'simple',
          status: params.status || 'publish',
          sku: params.sku,
          categories: params.categories,
          images: params.images,
        });
        break;

      case 'update_product':
      case 'wooUpdateProduct':
        url = `${storeUrl}/wp-json/wc/v3/products/${params.productId}`;
        method = 'PUT';
        body = JSON.stringify({
          name: params.productName || params.name,
          regular_price: params.price || params.regular_price,
          description: params.description,
          status: params.status,
          sku: params.sku,
        });
        break;

      case 'wooFindProduct':
        url = `${storeUrl}/wp-json/wc/v3/products`;
        const productSearchParams = new URLSearchParams();
        if (params.search) productSearchParams.append('search', params.search);
        if (params.sku) productSearchParams.append('sku', params.sku);
        if (params.status) productSearchParams.append('status', params.status);
        if (params.category) productSearchParams.append('category', params.category);
        if (productSearchParams.toString()) url += `?${productSearchParams.toString()}`;
        break;

      case 'wooGetProduct':
        url = `${storeUrl}/wp-json/wc/v3/products/${params.productId}`;
        break;

      case 'wooListProducts':
        url = `${storeUrl}/wp-json/wc/v3/products`;
        const listProductParams = new URLSearchParams();
        if (params.per_page) listProductParams.append('per_page', params.per_page);
        if (params.page) listProductParams.append('page', params.page);
        if (params.status) listProductParams.append('status', params.status);
        if (listProductParams.toString()) url += `?${listProductParams.toString()}`;
        break;

      // === ORDER ACTIONS ===
      case 'get_order':
      case 'wooGetOrder':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}`;
        break;

      case 'list_orders':
      case 'wooListOrders':
        url = `${storeUrl}/wp-json/wc/v3/orders`;
        const orderParams = new URLSearchParams();
        if (params.per_page) orderParams.append('per_page', params.per_page);
        if (params.page) orderParams.append('page', params.page);
        if (params.status) orderParams.append('status', params.status);
        if (orderParams.toString()) url += `?${orderParams.toString()}`;
        break;

      case 'wooCreateOrder':
        url = `${storeUrl}/wp-json/wc/v3/orders`;
        method = 'POST';
        body = JSON.stringify({
          payment_method: params.paymentMethod,
          payment_method_title: params.paymentMethodTitle,
          set_paid: params.setPaid || false,
          billing: params.billing,
          shipping: params.shipping,
          line_items: params.lineItems,
          shipping_lines: params.shippingLines,
        });
        break;

      case 'wooUpdateOrder':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}`;
        method = 'PUT';
        body = JSON.stringify({
          status: params.status,
          note: params.note,
        });
        break;

      // === CUSTOMER ACTIONS ===
      case 'wooCreateCustomer':
        url = `${storeUrl}/wp-json/wc/v3/customers`;
        method = 'POST';
        body = JSON.stringify({
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          username: params.username,
          billing: params.billing || {
            first_name: params.firstName,
            last_name: params.lastName,
            email: params.email,
            phone: params.phone,
            address_1: params.address1,
            city: params.city,
            state: params.state,
            postcode: params.postcode,
            country: params.country,
          },
          shipping: params.shipping,
        });
        break;

      case 'wooFindCustomer':
        url = `${storeUrl}/wp-json/wc/v3/customers`;
        const customerSearchParams = new URLSearchParams();
        if (params.email) customerSearchParams.append('email', params.email);
        if (params.search) customerSearchParams.append('search', params.search);
        if (customerSearchParams.toString()) url += `?${customerSearchParams.toString()}`;
        break;

      case 'wooGetCustomer':
        url = `${storeUrl}/wp-json/wc/v3/customers/${params.customerId}`;
        break;

      case 'wooUpdateCustomer':
        url = `${storeUrl}/wp-json/wc/v3/customers/${params.customerId}`;
        method = 'PUT';
        body = JSON.stringify({
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          billing: params.billing,
          shipping: params.shipping,
        });
        break;

      case 'wooListCustomers':
        url = `${storeUrl}/wp-json/wc/v3/customers`;
        const listCustomerParams = new URLSearchParams();
        if (params.per_page) listCustomerParams.append('per_page', params.per_page);
        if (params.page) listCustomerParams.append('page', params.page);
        if (params.role) listCustomerParams.append('role', params.role);
        if (listCustomerParams.toString()) url += `?${listCustomerParams.toString()}`;
        break;

      // === COUPON ACTIONS ===
      case 'wooCreateCoupon':
        url = `${storeUrl}/wp-json/wc/v3/coupons`;
        method = 'POST';
        body = JSON.stringify({
          code: params.code,
          discount_type: params.discountType || 'percent',
          amount: params.amount,
          description: params.description,
          date_expires: params.dateExpires,
          individual_use: params.individualUse || false,
          product_ids: params.productIds,
          excluded_product_ids: params.excludedProductIds,
          usage_limit: params.usageLimit,
          usage_limit_per_user: params.usageLimitPerUser,
          free_shipping: params.freeShipping || false,
          minimum_amount: params.minimumAmount,
          maximum_amount: params.maximumAmount,
        });
        break;

      case 'wooGetCoupon':
        url = `${storeUrl}/wp-json/wc/v3/coupons/${params.couponId}`;
        break;

      case 'wooListCoupons':
        url = `${storeUrl}/wp-json/wc/v3/coupons`;
        const couponParams = new URLSearchParams();
        if (params.code) couponParams.append('code', params.code);
        if (params.per_page) couponParams.append('per_page', params.per_page);
        if (couponParams.toString()) url += `?${couponParams.toString()}`;
        break;

      case 'wooUpdateCoupon':
        url = `${storeUrl}/wp-json/wc/v3/coupons/${params.couponId}`;
        method = 'PUT';
        body = JSON.stringify({
          code: params.code,
          discount_type: params.discountType,
          amount: params.amount,
          description: params.description,
          date_expires: params.dateExpires,
        });
        break;

      case 'wooDeleteCoupon':
        url = `${storeUrl}/wp-json/wc/v3/coupons/${params.couponId}?force=true`;
        method = 'DELETE';
        break;

      // === CATEGORY ACTIONS ===
      case 'wooCreateCategory':
        url = `${storeUrl}/wp-json/wc/v3/products/categories`;
        method = 'POST';
        body = JSON.stringify({
          name: params.name,
          slug: params.slug,
          parent: params.parent,
          description: params.description,
          image: params.image,
        });
        break;

      case 'wooListCategories':
        url = `${storeUrl}/wp-json/wc/v3/products/categories`;
        const categoryParams = new URLSearchParams();
        if (params.per_page) categoryParams.append('per_page', params.per_page);
        if (params.hide_empty) categoryParams.append('hide_empty', params.hide_empty);
        if (categoryParams.toString()) url += `?${categoryParams.toString()}`;
        break;

      // === SHIPPING ACTIONS ===
      case 'wooListShippingZones':
        url = `${storeUrl}/wp-json/wc/v3/shipping/zones`;
        break;

      case 'wooGetShippingZoneMethods':
        url = `${storeUrl}/wp-json/wc/v3/shipping/zones/${params.zoneId}/methods`;
        break;

      // === REFUND ACTIONS ===
      case 'wooCreateRefund':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}/refunds`;
        method = 'POST';
        body = JSON.stringify({
          amount: params.amount,
          reason: params.reason,
          refunded_by: params.refundedBy,
          meta_data: params.metaData,
          line_items: params.lineItems,
          api_refund: params.apiRefund !== false,
        });
        break;

      case 'wooListRefunds':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}/refunds`;
        break;

      // === NOTE ACTIONS ===
      case 'wooCreateOrderNote':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}/notes`;
        method = 'POST';
        body = JSON.stringify({
          note: params.note,
          customer_note: params.customerNote || false,
        });
        break;

      case 'wooListOrderNotes':
        url = `${storeUrl}/wp-json/wc/v3/orders/${params.orderId}/notes`;
        break;

      // === CUSTOM API CALL ===
      case 'createCustomApiCall':
      case 'wooCustomApiCall':
        url = `${storeUrl}/wp-json/wc/v3${params.endpoint}`;
        method = params.method || 'GET';
        if (params.body) {
          body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }
        break;

      // === REPORT ACTIONS ===
      case 'wooGetSalesReport':
        url = `${storeUrl}/wp-json/wc/v3/reports/sales`;
        const salesParams = new URLSearchParams();
        if (params.date_min) salesParams.append('date_min', params.date_min);
        if (params.date_max) salesParams.append('date_max', params.date_max);
        if (salesParams.toString()) url += `?${salesParams.toString()}`;
        break;

      case 'wooGetTopSellers':
        url = `${storeUrl}/wp-json/wc/v3/reports/top_sellers`;
        const topSellersParams = new URLSearchParams();
        if (params.period) topSellersParams.append('period', params.period);
        if (topSellersParams.toString()) url += `?${topSellersParams.toString()}`;
        break;

      default:
        throw new Error(`Unsupported WooCommerce action: ${action}`);
    }

    console.log(`WooCommerce: Making ${method} request to ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    
    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = { message: 'Invalid JSON response', raw: await response.text() };
    }

    if (!response.ok) {
      console.error('WooCommerce API Error:', result);
      throw new Error(result.message || result.code || 'WooCommerce API request failed');
    }

    console.log(`WooCommerce: Successfully processed ${action}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('WooCommerce error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
