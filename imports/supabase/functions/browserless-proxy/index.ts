import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, url, waitForSelector, viewport, selector, bqlQuery, waitTimeoutMs, bestAttempt, waitUntil } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = `https://production-sfo.browserless.io`;
    let endpoint = "";
    let method = "POST";
    let body: any = {};

    const parsedViewport = viewport ? (typeof viewport === 'string' ? JSON.parse(viewport) : viewport) : { width: 1920, height: 1080 };

    switch (action) {
      case "captureScreenshot":
        if (!url) {
          throw new Error("URL is required");
        }
        endpoint = "/screenshot";
        body = {
          url,
          options: {
            fullPage: true,
            type: "png",
          },
        };
        if (waitForSelector) {
          body.waitForSelector = typeof waitForSelector === 'string' 
            ? { selector: waitForSelector, timeout: waitTimeoutMs || 15000 }
            : waitForSelector;
        }
        if (parsedViewport) {
          body.viewport = parsedViewport;
        }
        if (bestAttempt !== undefined) {
          body.bestAttempt = bestAttempt;
        }
        if (waitUntil) {
          body.gotoOptions = { waitUntil };
        }
        break;

      case "generatePdf":
        if (!url) {
          throw new Error("URL is required");
        }
        endpoint = "/pdf";
        body = {
          url,
          options: {
            printBackground: true,
            format: "A4",
          },
        };
        if (waitForSelector) {
          body.waitForSelector = typeof waitForSelector === 'string' 
            ? { selector: waitForSelector, timeout: waitTimeoutMs || 15000 }
            : waitForSelector;
        }
        if (parsedViewport) {
          body.viewport = parsedViewport;
        }
        if (bestAttempt !== undefined) {
          body.bestAttempt = bestAttempt;
        }
        if (waitUntil) {
          body.gotoOptions = { waitUntil };
        }
        break;

      case "scrapeUrl":
        if (!url) {
          throw new Error("URL is required");
        }
        endpoint = "/scrape";
        body = {
          url,
        };
        if (selector) {
          body.elements = [{ selector }];
        }
        if (waitForSelector) {
          body.waitForSelector = typeof waitForSelector === 'string' 
            ? { selector: waitForSelector, timeout: waitTimeoutMs || 15000 }
            : waitForSelector;
        }
        if (bestAttempt !== undefined) {
          body.bestAttempt = bestAttempt;
        }
        if (waitUntil) {
          body.gotoOptions = { waitUntil };
        }
        break;

      case "runBqlQuery":
        if (!bqlQuery) {
          throw new Error("BQL query is required");
        }
        endpoint = "/function";
        body = {
          code: bqlQuery,
        };
        break;

      case "getWebsitePerformance":
        if (!url) {
          throw new Error("URL is required");
        }
        endpoint = "/performance";
        body = {
          url,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${baseUrl}${endpoint}?token=${apiKey}`;
    console.log(`Making request to ${endpoint}`);

    // Browserless operations can take time, so use a longer timeout (120 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any;
      const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      responseData = await response.json();
    } else if (contentType?.includes("image") || contentType?.includes("pdf")) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Convert to base64 in chunks to avoid stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      
      responseData = {
        content: base64,
        contentType: contentType,
      };
    } else {
      responseData = await response.text();
    }

      if (!response.ok) {
        console.error("Browserless API error:", responseData);
        const errorMessage = typeof responseData === 'object' 
          ? (responseData.error || responseData.message || `API request failed with status ${response.status}`)
          : `API request failed with status ${response.status}`;
        
        // Return 200 with success: false so UI can read the error
        return new Response(
          JSON.stringify({
            success: false,
            status: response.status,
            error: errorMessage,
            details: responseData,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: responseData,
          contentType: contentType || "application/json",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        const timeoutError = 'Request timed out after 120 seconds. The operation may be taking too long or the target URL may be slow to load.';
        console.error("Timeout error:", timeoutError);
        // Return 200 with success: false so UI can read the error
        return new Response(
          JSON.stringify({
            success: false,
            error: timeoutError,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Error in browserless-proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
