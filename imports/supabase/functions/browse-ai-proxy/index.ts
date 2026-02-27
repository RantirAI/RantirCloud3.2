import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, robotId, taskId, inputParameters, method, endpoint, body } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = "https://api.browse.ai/v2";
    let url = baseUrl;
    let httpMethod = "GET";
    let requestBody: any = null;

    switch (action) {
      case "runRobot":
        if (!robotId) {
          throw new Error("Robot ID is required");
        }
        url = `${baseUrl}/robots/${robotId}/tasks`;
        httpMethod = "POST";
        requestBody = {
          inputParameters: inputParameters ? (typeof inputParameters === 'string' ? JSON.parse(inputParameters) : inputParameters) : {},
        };
        break;

      case "getTaskDetails":
        if (!robotId || !taskId) {
          throw new Error("Robot ID and Task ID are required");
        }
        url = `${baseUrl}/robots/${robotId}/tasks/${taskId}`;
        httpMethod = "GET";
        break;

      case "listRobots":
        url = `${baseUrl}/robots`;
        httpMethod = "GET";
        break;

      case "createCustomApiCall":
        if (!endpoint) {
          throw new Error("Endpoint is required for custom API call");
        }
        url = `${baseUrl}${endpoint}`;
        httpMethod = method || "GET";
        requestBody = body ? (typeof body === 'string' ? JSON.parse(body) : body) : null;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Making ${httpMethod} request to ${url}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (requestBody && ["POST", "PUT", "PATCH"].includes(httpMethod)) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Browse AI API error:", responseData);
      throw new Error(responseData.error?.message || `API request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData.result || responseData,
        taskId: responseData.result?.id,
        status: responseData.result?.status || "success",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in browse-ai-proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
