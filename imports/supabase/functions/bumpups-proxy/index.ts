import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, videoUrl, message, conversationId, numberOfItems } = await req.json();

    console.log("BumpUps proxy called with:", { action, hasApiKey: !!apiKey, hasVideoUrl: !!videoUrl, hasMessage: !!message });

    if (!apiKey) {
      throw new Error("API key is required. Please add your BumpUps API key in the node properties.");
    }

    if (!action) {
      throw new Error("Action is required. Please select an action from the dropdown.");
    }

    // Validate required fields based on action
    const requiresVideoUrl = [
      "generateCreatorDescription",
      "generateCreatorHashtags", 
      "generateCreatorTakeaways",
      "generateCreatorTitles",
      "generateTimestamps"
    ];

    if (requiresVideoUrl.includes(action) && !videoUrl) {
      throw new Error(`Video URL is required for ${action}. Please provide a YouTube video URL.`);
    }

    if (action === "sendChat" && !message) {
      throw new Error("Message is required for sendChat action.");
    }

    const baseUrl = "https://api.bumpups.com";
    let endpoint = "";
    let method = "POST";
    let body: any = {};

    // BumpUps API uses standardized body structure: { url, model, language }
    const model = "bump-1.0"; // Default model
    const language = "en"; // Default language

    switch (action) {
      case "generateCreatorDescription":
        endpoint = "/creator/description";
        body = { url: videoUrl, model, language };
        break;

      case "generateCreatorHashtags":
        endpoint = "/creator/hashtags";
        body = { url: videoUrl, model, language };
        break;

      case "generateCreatorTakeaways":
        endpoint = "/creator/takeaways";
        body = { url: videoUrl, model, language };
        break;

      case "generateCreatorTitles":
        endpoint = "/creator/titles";
        body = { url: videoUrl, model, language };
        break;

      case "generateTimestamps":
        endpoint = "/creator/timestamps";
        body = { url: videoUrl, model, language };
        break;

      case "sendChat":
        endpoint = "/chat";
        body = { 
          url: videoUrl,
          model,
          prompt: message || "summary",
          language,
          output_format: "text"
        };
        break;

      case "createCustomApiCall":
        throw new Error("Custom API call not yet implemented for BumpUps");

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${baseUrl}${endpoint}`;
    console.log(`Making ${method} request to ${fullUrl}`);
    console.log("Request body:", JSON.stringify(body, null, 2));

    const response = await fetch(fullUrl, {
      method,
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Check if response has content before parsing
    const contentType = response.headers.get("content-type");
    let responseData: any;

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      if (text) {
        try {
          responseData = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse JSON response:", text);
          throw new Error(`Invalid JSON response from BumpUps API: ${text.substring(0, 200)}`);
        }
      } else {
        responseData = {};
      }
    } else {
      const text = await response.text();
      console.error("Non-JSON response from BumpUps API:", text);
      throw new Error(`BumpUps API returned non-JSON response (${response.status}): ${text.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error("BumpUps API error:", responseData);
      throw new Error(responseData.error || responseData.message || `API request failed with status ${response.status}`);
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
    console.error("Error in bumpups-proxy:", error);
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
