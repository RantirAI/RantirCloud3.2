import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      action, 
      templateId, 
      recipientName, 
      recipientEmail, 
      customFields,
      method, 
      endpoint, 
      body 
    } = await req.json();

    console.log("Certopus proxy called with:", { action, hasApiKey: !!apiKey });

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = "https://api.certopus.com/v1";
    let apiEndpoint = "";
    let httpMethod = "GET";
    let requestBody: any = null;

    switch (action) {
      case "createCredential":
        if (!templateId) throw new Error("Template ID is required");
        apiEndpoint = "/credentials";
        httpMethod = "POST";
        requestBody = {
          template_id: templateId,
          recipient: {
            name: recipientName,
            email: recipientEmail,
          },
          custom_fields: customFields ? JSON.parse(customFields) : {},
        };
        break;

      case "createCustomApiCall":
        if (!endpoint) throw new Error("Endpoint is required for custom API call");
        apiEndpoint = endpoint;
        httpMethod = method || "GET";
        if (body && (httpMethod === "POST" || httpMethod === "PUT")) {
          requestBody = JSON.parse(body);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${baseUrl}${apiEndpoint}`;
    console.log(`Making ${httpMethod} request to ${fullUrl}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    console.error("Error in certopus-proxy:", error);
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
