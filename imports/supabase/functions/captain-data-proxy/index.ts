import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, projectId, action, workflowId, inputData, jobId, method, endpoint, body } = await req.json();

    console.log("Captain Data proxy called with:", { action, hasApiKey: !!apiKey, hasProjectId: !!projectId });

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required. Find it in your Captain Data project settings.");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    // Captain Data API v2 uses project UID in the path
    const baseUrl = `https://api.captaindata.co/v2/${projectId}`;
    let apiEndpoint = "";
    let httpMethod = "GET";
    let requestBody: any = null;

    switch (action) {
      case "launchWorkflow":
        if (!workflowId) throw new Error("Workflow ID is required");
        apiEndpoint = `/workflows/${workflowId}/jobs`;
        httpMethod = "POST";
        requestBody = inputData ? JSON.parse(inputData) : {};
        break;

      case "getJobResults":
        if (!jobId) throw new Error("Job ID is required");
        apiEndpoint = `/jobs/${jobId}/results`;
        httpMethod = "GET";
        break;

      case "listWorkflows":
        apiEndpoint = `/workflows`;
        httpMethod = "GET";
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

    // Captain Data uses x-api-key header for authentication
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "x-api-key": apiKey,
        "x-project-id": projectId,
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
    console.error("Error in captain-data-proxy:", error);
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
