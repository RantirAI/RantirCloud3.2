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
      address, 
      method, 
      endpoint, 
      body 
    } = await req.json();

    console.log("Chainalysis proxy called with:", { action, hasApiKey: !!apiKey });

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    // Chainalysis Sanctions Screening API
    const baseUrl = "https://public.chainalysis.com/api/v1";
    let apiEndpoint = "";
    let httpMethod = "GET";
    let requestBody: any = null;

    switch (action) {
      case "checkAddressSanction":
        if (!address) throw new Error("Blockchain address is required");
        apiEndpoint = `/address/${address}`;
        httpMethod = "GET";
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${baseUrl}${apiEndpoint}`;
    console.log(`Making ${httpMethod} request to ${fullUrl}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json",
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
    console.error("Error in chainalysis-api-proxy:", error);
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
