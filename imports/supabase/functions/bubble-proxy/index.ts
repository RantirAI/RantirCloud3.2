import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      appName, 
      dataType, 
      action, 
      thingId, 
      data, 
      constraintField,
      constraintType,
      constraintValue,
      startFrom,
      cursor, 
      limit 
    } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!appName) {
      throw new Error("App name is required");
    }

    if (!dataType) {
      throw new Error("Data type is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = `https://${appName}.bubbleapps.io/api/1.1/obj/${dataType}`;
    let url = baseUrl;
    let method = "GET";
    let body: any = null;

    switch (action) {
      case "bubbleCreateThing":
        url = baseUrl;
        method = "POST";
        body = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};
        break;

      case "bubbleDeleteThing":
        if (!thingId) {
          throw new Error("Thing ID is required for delete");
        }
        url = `${baseUrl}/${thingId}`;
        method = "DELETE";
        break;

      case "bubbleUpdateThing":
        if (!thingId) {
          throw new Error("Thing ID is required for update");
        }
        url = `${baseUrl}/${thingId}`;
        method = "PATCH";
        body = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};
        break;

      case "bubbleGetThing":
        if (!thingId) {
          throw new Error("Thing ID is required for get");
        }
        url = `${baseUrl}/${thingId}`;
        method = "GET";
        break;

      case "bubbleListThings":
        url = baseUrl;
        method = "GET";
        
        // Add query parameters
        const params = new URLSearchParams();
        
        // Build constraints from individual fields
        if (constraintField && constraintType) {
          const constraint = {
            key: constraintField,
            constraint_type: constraintType,
          };
          
          // Add value if needed (not needed for empty/not_empty)
          if (constraintValue && !['empty', 'not_empty'].includes(constraintType)) {
            constraint.value = constraintValue;
          }
          
          params.append("constraints", JSON.stringify([constraint]));
        }
        
        if (startFrom) {
          params.append("cursor", startFrom.toString());
        } else if (cursor) {
          params.append("cursor", cursor.toString());
        }
        
        if (limit) {
          params.append("limit", limit.toString());
        }
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Making ${method} request to ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body && ["POST", "PATCH"].includes(method)) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Bubble API error:", responseData);
      throw new Error(responseData.message || `API request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData.response || responseData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in bubble-proxy:", error);
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
