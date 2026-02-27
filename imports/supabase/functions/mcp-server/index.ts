import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id, x-mcp-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
};

const app = new Hono();

// Handle CORS preflight
app.options("/*", (c) => {
  return new Response(null, { headers: corsHeaders });
});

// Convert flow api_parameters to JSON Schema format
function convertToJsonSchema(params: any[] | null): {
  type: string;
  properties: Record<string, any>;
  required: string[];
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  if (!params || !Array.isArray(params)) {
    return { type: "object", properties, required };
  }

  params.forEach((param) => {
    const prop: any = {
      description: param.description || param.name,
    };

    // Map flow parameter types to JSON Schema types
    switch (param.type) {
      case "number":
      case "integer":
        prop.type = "number";
        break;
      case "boolean":
        prop.type = "boolean";
        break;
      case "array":
        prop.type = "array";
        prop.items = { type: "string" };
        break;
      case "object":
      case "json":
        prop.type = "object";
        break;
      case "select":
        prop.type = "string";
        if (param.options && Array.isArray(param.options)) {
          prop.enum = param.options.map((opt: any) =>
            typeof opt === "string" ? opt : opt.value
          );
        }
        break;
      default:
        prop.type = "string";
    }

    properties[param.name] = prop;

    if (param.required) {
      required.push(param.name);
    }
  });

  return { type: "object", properties, required };
}

// GET endpoint for connection help
app.get("/*", (c) => {
  return c.json({
    name: "rantir-flows",
    version: "1.0.0",
    transport: "Streamable HTTP",
    endpoint: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mcp-server`,
    authentication: {
      type: "API Key",
      header: "X-MCP-Key",
      description: "Generate your MCP API key from the Rantir dashboard (Flows → Deploy → MCP tab)",
    },
    example_config: {
      mcpServers: {
        "rantir-flows": {
          serverUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mcp-server`,
          headers: {
            "Content-Type": "application/json",
            "X-MCP-Key": "<YOUR_MCP_API_KEY>"
          }
        }
      }
    },
    help: "Add X-MCP-Key header with your personal MCP API key. Generate one from the Rantir dashboard.",
  }, { headers: corsHeaders });
});

// Main MCP endpoint handler (POST)
app.post("/*", async (c) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get MCP API key from header
  const mcpApiKey = c.req.header("x-mcp-key") || c.req.header("X-MCP-Key");

  if (!mcpApiKey) {
    return new Response(
      JSON.stringify({ 
        error: "Missing MCP API key",
        help: "Add 'X-MCP-Key' header with your MCP API key. Generate one from the Rantir dashboard."
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate the MCP API key
  const { data: keyData, error: keyError } = await supabase
    .rpc('validate_mcp_key', { p_key: mcpApiKey });

  if (keyError) {
    console.error("Error validating MCP key:", keyError);
    return new Response(
      JSON.stringify({ error: "Failed to validate API key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!keyData || keyData.length === 0 || !keyData[0]?.is_valid) {
    return new Response(
      JSON.stringify({ 
        error: "Invalid or expired MCP API key",
        help: "Generate a new MCP API key from the Rantir dashboard."
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = keyData[0].user_id;

  // Fetch only this user's MCP-enabled deployed flows
  const { data: flows, error: flowsError } = await supabase
    .from("flow_projects")
    .select(
      `
      id, 
      name, 
      endpoint_slug, 
      api_description, 
      api_parameters,
      mcp_tool_name,
      mcp_tool_description
    `
    )
    .eq("user_id", userId)
    .eq("is_deployed", true)
    .eq("mcp_enabled", true);

  if (flowsError) {
    console.error("Error fetching flows:", flowsError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch flows" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create MCP server with Rantir branding
  const mcpServer = new McpServer({
    name: "rantir-flows",
    version: "1.0.0",
    iconUrl: "https://rantir.cloud/lovable-uploads/1acc6216-e17e-466f-a54e-da4c910bc035.png",
  });

  // Register each flow as a tool
  flows?.forEach((flow) => {
    // Sanitize tool name to match MCP requirements: ^[a-zA-Z0-9_-]{1,64}$
    const rawName = flow.mcp_tool_name || flow.endpoint_slug || flow.name;
    const toolName = rawName
      .toLowerCase()
      .replace(/\s+/g, "-")           // Replace spaces with hyphens
      .replace(/[^a-z0-9_-]/g, "")    // Remove invalid characters
      .substring(0, 64);              // Limit to 64 chars
    const toolDescription = flow.mcp_tool_description || flow.api_description || `Execute the ${flow.name} flow`;
    const inputSchema = convertToJsonSchema(flow.api_parameters);

    mcpServer.tool(toolName, {
      description: toolDescription,
      inputSchema,
      handler: async (args: Record<string, any>) => {
        try {
          // Execute the flow via the flow-executor edge function
          const flowExecutorUrl = `${supabaseUrl}/functions/v1/flow-executor/${flow.endpoint_slug}`;
          
          const response = await fetch(flowExecutorUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(args),
          });

          const result = await response.json();

          if (!response.ok) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: true,
                    message: result.error || "Flow execution failed",
                    status: response.status,
                  }),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          console.error(`Error executing flow ${flow.name}:`, error);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: true,
                  message: error.message || "Unknown error occurred",
                }),
              },
            ],
            isError: true,
          };
        }
      },
    });
  });

  // Create HTTP transport and bind to server
  // mcp-lite pattern: transport.bind(server) returns a handler function
  const transport = new StreamableHttpTransport();
  const handler = transport.bind(mcpServer);

  try {
    const response = await handler(c.req.raw);
    
    // Add CORS headers to the response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error: any) {
    console.error("MCP transport error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "MCP server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

Deno.serve(app.fetch);
