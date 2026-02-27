import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      domain, 
      action, 
      orderId, 
      discountId,
      discountCode,
      discountType,
      discountValue,
      discountTitle,
      discountEnabled,
      discountAuto,
      discountUnlimited,
      discountSelfDestruct,
      discountApplyOnce,
      discountTarget,
      discountStartDate,
      discountStopDate,
      discountTargetProducts,
      discountTargetAmount,
      discountTargetQuantity,
      discountAllowance,
      startDate,
      endDate,
      email,
      method, 
      endpoint, 
      body 
    } = await req.json();

    console.log("Cartloom proxy called with:", { action, hasApiKey: !!apiKey, domain });

    // Validate API key
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key is required. Get your API key from Cartloom dashboard > Settings > API Keys.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Domain with helpful message
    if (!domain) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Store Domain is required. This is your Cartloom subdomain (e.g., 'my-store' from 'my-store.cartloom.com').",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Action is required. Select an action from the dropdown.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cartloom API uses subdomain-based URLs
    const baseUrl = `https://${domain}.cartloom.com/api`;
    let apiEndpoint = "";
    let requestBody: Record<string, string | number | boolean> = {};

    switch (action) {
      case "getProducts":
        apiEndpoint = "/products/list";
        break;

      case "getOrder":
        if (!orderId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invoice ID is required for getOrder action.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = "/orders/get";
        requestBody = { invoice: orderId };
        break;

      case "getOrdersByDate":
        if (!startDate) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Start Date is required for getOrdersByDate action.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = "/orders/list";
        requestBody = { start: startDate };
        if (endDate) requestBody.end = endDate;
        break;

      case "getOrdersByEmail":
        if (!startDate || !email) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Start Date and Email are required for getOrdersByEmail action.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = "/orders/list";
        requestBody = { start: startDate, email };
        if (endDate) requestBody.end = endDate;
        break;

      case "createDiscount":
        if (!discountTitle || !discountType || discountValue === undefined) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Title, Type of Discount, and Amount are required for createDiscount action.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = "/discounts/add";
        requestBody = {
          title: discountTitle,
          enabled: discountEnabled ?? true,
          auto: discountAuto ?? false,
          unlimited: discountUnlimited ?? true,
          self_destruct: discountSelfDestruct ?? false,
          apply_once: discountApplyOnce ?? false,
          type: discountType,
          amount: discountValue,
          target: discountTarget || 'order',
          start: discountStartDate || new Date().toISOString().split('T')[0],
          stop: discountStopDate || '',
        };
        if (discountCode) requestBody.code = discountCode;
        if (discountTargetProducts) requestBody.target_products = discountTargetProducts;
        if (discountTargetAmount) requestBody.target_amount = discountTargetAmount;
        if (discountTargetQuantity) requestBody.target_quantity = discountTargetQuantity;
        if (discountAllowance) requestBody.allowance = discountAllowance;
        break;

      case "getDiscount":
        if (!discountId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Discount ID is required for getDiscount action.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = "/discounts/get";
        requestBody = { id: discountId };
        break;

      case "getAllDiscounts":
        apiEndpoint = "/discounts/list";
        break;

      case "createCustomApiCall":
        if (!endpoint) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Endpoint is required for custom API call. Example: /products/list or /orders/get",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        apiEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        if (body) {
          try {
            const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
            requestBody = parsedBody;
          } catch (parseError) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Invalid JSON in request body: ${parseError.message}`,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Valid actions: getProducts, getOrder, getOrdersByDate, getOrdersByEmail, createDiscount, getDiscount, getAllDiscounts, createCustomApiCall`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const fullUrl = `${baseUrl}${apiEndpoint}`;
    console.log(`Making POST request to ${fullUrl}`);

    // Cartloom API uses application/x-www-form-urlencoded
    const formBody = new URLSearchParams();
    Object.entries(requestBody).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formBody.append(key, String(value));
      }
    });

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-KEY': apiKey,
      },
      body: formBody.toString(),
    };

    const response = await fetch(fullUrl, fetchOptions);
    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { raw: responseText };
    }

    // Handle different error status codes with helpful messages
    if (!response.ok) {
      let errorMessage = "";
      
      switch (response.status) {
        case 401:
          errorMessage = `Authentication failed. Please verify your API key is correct. Get your key from Cartloom Dashboard > Settings > API Keys.`;
          break;
        case 403:
          errorMessage = `Access forbidden. Your API key may not have permission for this action.`;
          break;
        case 404:
          errorMessage = `Resource not found (404). This could mean:\n• Domain "${domain}" doesn't exist (check your Cartloom subdomain)\n• The requested resource doesn't exist\nAttempted URL: ${fullUrl}`;
          break;
        case 429:
          errorMessage = `Rate limit exceeded. Please wait before making more requests.`;
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = `Cartloom server error (${response.status}). Please try again later.`;
          break;
        default:
          errorMessage = `API request failed with status ${response.status}.`;
      }

      if (responseData.message) errorMessage += `\nAPI message: ${responseData.message}`;
      if (responseData.error) errorMessage += `\nAPI error: ${responseData.error}`;

      console.error("Cartloom API error:", { status: response.status, url: fullUrl, responseData });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          status: response.status,
          attemptedUrl: fullUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cartloom returns data as indexed object, convert to array
    let data = responseData;
    if (typeof responseData === 'object' && responseData !== null) {
      const keys = Object.keys(responseData);
      const isArrayLike = keys.every(key => !isNaN(Number(key)));
      if (isArrayLike && keys.length > 0) {
        data = keys.map(key => responseData[key]);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        status: "success",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in cartloom-proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${error.message}. Please check your inputs and try again.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
