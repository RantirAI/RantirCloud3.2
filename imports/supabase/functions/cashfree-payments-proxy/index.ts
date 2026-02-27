import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientId, 
      clientSecret, 
      environment, 
      action, 
      orderId, 
      orderAmount, 
      customerEmail, 
      customerPhone,
      customerName,
      linkAmount,
      linkId,
      linkPurpose,
      refundAmount,
      refundNote,
      cashgramAmount,
      cashgramId,
      method, 
      endpoint, 
      body 
    } = await req.json();

    console.log("Cashfree proxy called with:", { action, hasClientId: !!clientId, environment });

    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = environment === "production" 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";
    
    let apiEndpoint = "";
    let httpMethod = "GET";
    let requestBody: any = null;

    switch (action) {
      case "createOrder":
        apiEndpoint = "/orders";
        httpMethod = "POST";
        requestBody = {
          order_id: `order_${Date.now()}`,
          order_amount: orderAmount,
          order_currency: "INR",
          customer_details: {
            customer_id: `cust_${Date.now()}`,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
          },
        };
        break;

      case "createPaymentLink":
        apiEndpoint = "/links";
        httpMethod = "POST";
        requestBody = {
          link_id: `link_${Date.now()}`,
          link_amount: linkAmount,
          link_currency: "INR",
          link_purpose: linkPurpose || "Payment",
          customer_details: {
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
          },
        };
        break;

      case "createRefund":
        if (!orderId) throw new Error("Order ID is required");
        apiEndpoint = `/orders/${orderId}/refunds`;
        httpMethod = "POST";
        requestBody = {
          refund_amount: refundAmount,
          refund_id: `refund_${Date.now()}`,
          refund_note: refundNote,
        };
        break;

      case "cancelPaymentLink":
        if (!linkId) throw new Error("Link ID is required");
        apiEndpoint = `/links/${linkId}/cancel`;
        httpMethod = "POST";
        break;

      case "fetchPaymentLinkDetails":
        if (!linkId) throw new Error("Link ID is required");
        apiEndpoint = `/links/${linkId}`;
        httpMethod = "GET";
        break;

      case "createCashgram":
        apiEndpoint = "/cashgram";
        httpMethod = "POST";
        requestBody = {
          cashgram_id: `cashgram_${Date.now()}`,
          cashgram_amount: cashgramAmount,
          cashgram_currency: "INR",
          beneficiary_details: {
            beneficiary_name: customerName,
            beneficiary_email: customerEmail,
            beneficiary_phone: customerPhone,
          },
        };
        break;

      case "getOrdersForPaymentLink":
        if (!linkId) throw new Error("Link ID is required");
        apiEndpoint = `/links/${linkId}/orders`;
        httpMethod = "GET";
        break;

      case "getAllRefundsForOrder":
        if (!orderId) throw new Error("Order ID is required");
        apiEndpoint = `/orders/${orderId}/refunds`;
        httpMethod = "GET";
        break;

      case "deactivateCashgram":
        if (!cashgramId) throw new Error("Cashgram ID is required");
        apiEndpoint = `/cashgram/${cashgramId}/deactivate`;
        httpMethod = "POST";
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${baseUrl}${apiEndpoint}`;
    console.log(`Making ${httpMethod} request to ${fullUrl}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
      },
    };

    if (requestBody && (httpMethod === "POST" || httpMethod === "PUT")) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(fullUrl, fetchOptions);
    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || `API request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        status: "success",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in cashfree-payments-proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
