// Chat Widget Edge Function v2025.02.24 — Tool Calling Orchestrator
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildToolsFromNodes, toAnthropicTools } from "./tool-builder.ts";

// Fire-and-forget error logger — persists chat errors to flow_monitoring_logs
async function logChatError(
  supabase: any,
  flowId: string,
  nodeId: string | null,
  message: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('flow_monitoring_logs').insert({
      flow_id: flowId,
      execution_id: null,
      node_id: nodeId,
      level: 'error',
      message: `[Chat Widget] ${message}`,
      metadata: { source: 'chat-widget', ...metadata },
    });
  } catch (e) {
    console.error('[chat-widget] Failed to persist error log:', e);
  }
}

// Inline resolveNodeInputs (can't import across edge function boundaries)
function resolveVariables(value: any, context: Record<string, any>): any {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
    const parts = path.trim().split(".");
    let result: any = context;
    for (const part of parts) {
      if (result && typeof result === "object") {
        if (part in result) { result = result[part]; }
        else {
          const lowerPart = part.toLowerCase();
          const matchedKey = Object.keys(result).find(k => k.toLowerCase() === lowerPart);
          if (matchedKey) { result = result[matchedKey]; } else { return ""; }
        }
      } else { return ""; }
    }
    return typeof result === "object" ? JSON.stringify(result) : String(result);
  });
}

function resolveNodeInputs(inputs: Record<string, any>, context: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(inputs || {})) {
    if (typeof value === "string") { resolved[key] = resolveVariables(value, context); }
    else if (typeof value === "object" && value !== null) {
      resolved[key] = JSON.parse(resolveVariables(JSON.stringify(value), context));
    } else { resolved[key] = value; }
  }
  return resolved;
}

// Compose data from fieldMap.* inputs for data-table nodes
function composeFieldMapData(resolved: Record<string, any>, nodeType: string): void {
  if (nodeType === 'data-table') {
    const fieldMapData: Record<string, any> = {};
    let hasFieldMap = false;
    for (const [key, value] of Object.entries(resolved)) {
      if (key.startsWith('fieldMap.') && value !== undefined && value !== '') {
        fieldMapData[key.substring('fieldMap.'.length)] = value;
        hasFieldMap = true;
      }
    }
    if (hasFieldMap) {
      resolved.data = JSON.stringify(fieldMapData);
    }
  }
}

// Inline executeNode for tool calls (simplified version for chat-widget tool execution)
async function executeToolNode(
  node: any, context: Record<string, any>, supabase: any
): Promise<{ success: boolean; output?: any; error?: string }> {
  const nodeType = node.data?.type;
  const inputs = resolveNodeInputs(node.data?.inputs || {}, context);
  
  try {
    switch (nodeType) {
      case "http-request": {
        const requestUrl = inputs.url?.trim();
        if (!requestUrl) return { success: false, error: "URL is empty" };
        let requestHeaders: Record<string, string> = {};
        if (inputs.headers) { try { requestHeaders = JSON.parse(inputs.headers); } catch {} }
        if (inputs.apiKey) requestHeaders["Authorization"] = `Bearer ${inputs.apiKey}`;
        const response = await fetch(requestUrl, {
          method: inputs.method || "GET",
          headers: requestHeaders,
          body: inputs.method !== "GET" && inputs.body ? inputs.body : undefined,
        });
        const responseText = await response.text();
        let responseData; try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }
        const isSuccess = response.status >= 200 && response.status < 300;
        return { success: isSuccess, output: { success: isSuccess, status: response.status, data: responseData } };
      }
      case "slack": {
        const connectionMethod = inputs.connectionMethod || 'webhook';
        let slackBody: Record<string, any>;
        
        if (connectionMethod === 'webhook') {
          slackBody = {
            action: 'sendViaWebhook',
            webhookUrl: inputs.webhookUrl,
            text: inputs.text || inputs.message || '',
            username: inputs.username || undefined,
            icon_emoji: inputs.icon_emoji || undefined,
            blocks: inputs.blocks || undefined,
          };
        } else {
          slackBody = {
            action: inputs.action || 'slackSendMessage',
            apiKey: inputs.apiKey,
            channel: inputs.channel,
            text: inputs.text || inputs.message || '',
            thread_ts: inputs.thread_ts || undefined,
            blocks: inputs.blocks || undefined,
          };
        }
        
        const { data, error } = await supabase.functions.invoke('slack-action', { body: slackBody });
        if (error) {
          let actualError = error.message;
          try { const ctx = (error as any)?.context; if (ctx && typeof ctx.json === 'function') { const body = await ctx.json(); if (body?.error) actualError = body.error; } } catch {}
          return { success: false, error: `Slack: ${actualError}` };
        }
        if (data?.error) return { success: false, error: `Slack: ${data.error}` };
        return { success: true, output: { ...data, success: true } };
      }
      case "data-table": {
        const operation = inputs.operation || 'get';
        const tableId = inputs.tableId;
        
        if (!tableId) return { success: false, error: "Data Table: tableId is required" };
        
        // Compose fieldMap.* into data if not already set
        composeFieldMapData(inputs, "data-table");
        
        // Fetch the table project
        const { data: tableProject, error: tpError } = await supabase
          .from("table_projects")
          .select("records, schema")
          .eq("id", tableId)
          .single();
        
        if (tpError || !tableProject) {
          return { success: false, error: `Data Table: Table ${tableId} not found: ${tpError?.message}` };
        }
        
        let records: any[] = (tableProject.records as any[]) || [];
        
        switch (operation) {
          case "create": {
            let recordData: Record<string, any> = {};
            if (inputs.data) {
              try { recordData = typeof inputs.data === "string" ? JSON.parse(inputs.data) : inputs.data; } catch { recordData = {}; }
            }
            // Auto-populate timestamp fields from schema
            if (tableProject.schema?.fields) {
              for (const field of (tableProject.schema as any).fields) {
                if (field.type === 'timestamp') {
                  const key = field.id || field.name;
                  if (!recordData[key] && !recordData[field.name]) {
                    recordData[field.name] = new Date().toISOString();
                  }
                }
              }
            }
            const newRecord = { id: crypto.randomUUID(), ...recordData };
            records = [...records, newRecord];
            const { error: updateErr } = await supabase
              .from("table_projects")
              .update({ records })
              .eq("id", tableId);
            if (updateErr) return { success: false, error: `Data Table create failed: ${updateErr.message}` };
            return { success: true, output: { result: newRecord, count: records.length, success: true } };
          }
          case "get": {
            // Simple filtering/sorting/limiting
            let filtered = records;
            if (inputs.filter) {
              try {
                const filterCriteria = typeof inputs.filter === "string" ? JSON.parse(inputs.filter) : inputs.filter;
                if (Array.isArray(filterCriteria)) {
                  filtered = filtered.filter((r: any) => filterCriteria.every((f: any) => {
                    const v = r[f.field];
                    switch (f.operator) {
                      case "equals": return v === f.value;
                      case "notEquals": return v !== f.value;
                      case "contains": return String(v || "").toLowerCase().includes(String(f.value).toLowerCase());
                      default: return true;
                    }
                  }));
                }
              } catch {}
            }
            if (inputs.sort) {
              try {
                const s = typeof inputs.sort === "string" ? JSON.parse(inputs.sort) : inputs.sort;
                if (s?.field) {
                  const dir = s.direction === "desc" ? -1 : 1;
                  filtered = [...filtered].sort((a: any, b: any) => (a[s.field] < b[s.field] ? -1 : a[s.field] > b[s.field] ? 1 : 0) * dir);
                }
              } catch {}
            }
            if (inputs.limit && !isNaN(Number(inputs.limit))) {
              filtered = filtered.slice(0, Number(inputs.limit));
            }
            return { success: true, output: { result: filtered, count: filtered.length, success: true } };
          }
          case "update": {
            const rid = inputs.recordId;
            if (!rid) return { success: false, error: "Data Table update: recordId is required" };
            let updateData: Record<string, any> = {};
            if (inputs.data) {
              try { updateData = typeof inputs.data === "string" ? JSON.parse(inputs.data) : inputs.data; } catch { updateData = {}; }
            }
            const idx = records.findIndex((r: any) => r.id === rid);
            if (idx === -1) return { success: false, error: `Data Table: Record ${rid} not found` };
            records[idx] = { ...records[idx], ...updateData };
            const { error: upErr } = await supabase.from("table_projects").update({ records }).eq("id", tableId);
            if (upErr) return { success: false, error: `Data Table update failed: ${upErr.message}` };
            return { success: true, output: { result: records[idx], count: 1, success: true } };
          }
          case "delete": {
            const delId = inputs.recordId;
            if (!delId) return { success: false, error: "Data Table delete: recordId is required" };
            records = records.filter((r: any) => r.id !== delId);
            const { error: delErr } = await supabase.from("table_projects").update({ records }).eq("id", tableId);
            if (delErr) return { success: false, error: `Data Table delete failed: ${delErr.message}` };
            return { success: true, output: { result: null, count: records.length, success: true } };
          }
          default:
            return { success: false, error: `Data Table: Unknown operation "${operation}"` };
        }
      }
      default: {
        // Comprehensive edge function name mapping for all integrations
        const EDGE_FUNCTION_MAP: Record<string, string> = {
          // Email
          'gmail': 'gmail-proxy',
          'gmail-action': 'gmail-proxy',
          'resend': 'resend-proxy',
          'resend-action': 'resend-proxy',
          'brevo': 'brevo-proxy',
          'mailchimp': 'mailchimp-proxy',
          // Messaging
          'slack-action': 'slack-action',
          'slack-webhook': 'slack-action',
          // Productivity
          'notion': 'notion-action',
          'notion-action': 'notion-action',
          'google-sheets': 'google-sheets-proxy',
          'google-calendar': 'google-calendar-action',
          'google-docs': 'google-docs-proxy',
          'trello': 'trello-proxy',
          'clickup': 'clickup-proxy',
          'asana': 'asana-proxy',
          'confluence': 'confluence-proxy',
          // CRM & Sales
          'hubspot': 'hubspot-proxy',
          'salesforce': 'salesforce-proxy',
          'attio': 'attio-action',
          // E-commerce
          'shopify': 'shopify-proxy',
          'stripe': 'stripe-proxy',
          'woocommerce': 'woocommerce-action',
          // Social & Marketing
          'twitter': 'twitter-action',
          'wordpress': 'wordpress-proxy',
          'webflow': 'webflow-proxy',
          'typeform': 'typeform-proxy',
          'contentful': 'contentful-proxy',
          // Data & Analytics
          'airtable': 'airtable-proxy',
          'amplitude': 'amplitude-action',
          // AI & Media
          'elevenlabs': 'elevenlabs-proxy',
          'deepgram': 'deepgram-proxy',
          'assemblyai': 'assemblyai-action',
          // Support & HR
          'zendesk': 'zendesk-proxy',
          'assembled': 'assembled-action',
          'calendly': 'calendly-action',
          // Video
          'zoom': 'zoom-proxy',
        };
        const proxyName = EDGE_FUNCTION_MAP[nodeType] || `${nodeType}-proxy`;
        
        try {
          const { data, error } = await supabase.functions.invoke(proxyName, {
            body: { ...inputs, action: inputs.action || "execute" },
          });
          if (error) {
            let actualError = error.message;
            try {
              const ctx = (error as any)?.context;
              if (ctx && typeof ctx.json === 'function') { const body = await ctx.json(); if (body?.error) actualError = body.error; }
            } catch {}
            
            // If first attempt failed, try alternate suffix (-action vs -proxy)
            if (!EDGE_FUNCTION_MAP[nodeType]) {
              const altName = proxyName.endsWith('-proxy') 
                ? proxyName.replace(/-proxy$/, '-action')
                : proxyName.replace(/-action$/, '-proxy');
              try {
                const { data: altData, error: altError } = await supabase.functions.invoke(altName, {
                  body: { ...inputs, action: inputs.action || "execute" },
                });
                if (!altError && !altData?.error) {
                  return { success: true, output: { ...altData, success: true } };
                }
              } catch {}
            }
            
            return { success: false, error: `${nodeType}: ${actualError}` };
          }
          if (data?.error) return { success: false, error: `${nodeType}: ${data.error}` };
          return { success: true, output: { ...data, success: true } };
        } catch (proxyErr: any) {
          return { success: false, error: `Failed to invoke ${proxyName}: ${proxyErr.message}` };
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Support both query param (?flow=xxx) and path-based (/chat-widget/xxx) routing
    const pathParts = url.pathname.split('/');
    const pathIdentifier = pathParts[pathParts.length - 1];
    const flowIdentifier = url.searchParams.get('flow') || 
      (pathIdentifier && pathIdentifier !== 'chat-widget' ? pathIdentifier : '');

    // For POST, flowIdentifier can be empty — we'll get it from body
    // For GET, if missing we still serve the widget (JS will show error)
    if (!flowIdentifier && req.method !== 'GET' && req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Flow slug or project ID is required. Use ?flow=your-slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET request — serve the standalone HTML chat widget
    if (req.method === 'GET') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Check if flow is active before serving widget
      if (flowIdentifier) {
        const { data: flowStatus } = await supabase
          .from('flows')
          .select('status')
          .eq('flow_project_id', flowIdentifier)
          .maybeSingle();
        
        // If flow exists but is inactive, return empty page (widget vanishes)
        if (flowStatus && flowStatus.status === 'inactive') {
          return new Response('<!DOCTYPE html><html><head></head><body></body></html>', {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      }

      // Load config from flow_projects
      let config: any = {};
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flowIdentifier);
      
      if (isUUID) {
        const { data } = await supabase
          .from('flow_projects')
          .select('chat_widget_config, name')
          .eq('id', flowIdentifier)
          .single();
        if (data) config = data.chat_widget_config || {};
      } else {
        const { data } = await supabase
          .from('flow_projects')
          .select('chat_widget_config, name')
          .eq('endpoint_slug', flowIdentifier)
          .eq('is_deployed', true)
          .single();
        if (data) config = data.chat_widget_config || {};
      }

      const mode = url.searchParams.get('mode') || config.mode || 'widget';
      const theme = url.searchParams.get('theme') || config.theme || 'light';
      const accent = config.accent || '4A9BD9';
      const title = config.title || 'Chat with us';
      const welcome = config.welcomeMessage || 'Hi there! How can I help?';
      const position = config.position || 'bottom-right';
      const showWS = config.showWelcomeScreen !== false;
      const avatar = config.avatarUrl || '';
      const brand = config.brandName || '';
      const status = config.statusText || 'Online now';
      const gradientColors = config.gradientColors || ['#4A9BD9', '#74b9ff', '#a29bfe'];
      const quickLinks = config.quickLinks || [];
      const aqTitle = config.askQuestionTitle || 'Ask a question';
      const aqSub = config.askQuestionSubtitle || 'The AI agent will answer it with blazing speed';
      const startBtn = config.startChatButtonText || 'Start Chat';

      const chatApiUrl = `${supabaseUrl}/functions/v1/chat-widget`;

      const html = generateWidgetHTML({
        mode, theme, accent, title, welcome, position, showWS,
        avatar, brand, status, gradientColors, quickLinks,
        aqTitle, aqSub, startBtn, chatApiUrl,
      });

      return new Response(html, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // POST request — handle chat messages (existing logic)
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // empty or invalid body
    }

    // Parse flow from body (takes precedence) then URL
    const bodyFlow = body.flow || body.flowProjectId;
    const resolvedFlow = bodyFlow || flowIdentifier;
    const mode = body.mode || url.searchParams.get('mode') || 'widget';

    const { message, history } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!resolvedFlow) {
      return new Response(JSON.stringify({ error: 'Flow ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validate flow against flows table (active status + domain allowlist)
    const { data: flowRow, error: flowRowError } = await supabase
      .from('flows')
      .select('id, flow_project_id, status, allowed_domains')
      .eq('flow_project_id', resolvedFlow)
      .eq('status', 'active')
      .maybeSingle();

    if (!flowRow) {
      console.log('Flow validation failed for:', resolvedFlow, flowRowError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or inactive flow', error_code: 'FLOW_NOT_ACTIVE' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Enforce domain allowlist
    const allowedDomains: string[] | null = flowRow.allowed_domains;
    if (allowedDomains && allowedDomains.length > 0) {
      const originHeader = req.headers.get('origin') || req.headers.get('referer') || '';
      let requestHostname = '';
      try {
        requestHostname = new URL(originHeader).hostname;
      } catch {
        // invalid URL
      }
      if (!requestHostname) {
        return new Response(JSON.stringify({ error: 'Origin required for domain-restricted flow', error_code: 'ORIGIN_REQUIRED' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const domainAllowed = allowedDomains.some(d => {
        const allowed = d.toLowerCase();
        const host = requestHostname.toLowerCase();
        return host === allowed || host.endsWith('.' + allowed);
      });
      if (!domainAllowed) {
        return new Response(JSON.stringify({ error: 'Domain not allowed for this flow', error_code: 'DOMAIN_NOT_ALLOWED' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Look up flow project
    let flowProject: any = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedFlow);
    
    if (isUUID) {
      const { data, error } = await supabase
        .from('flow_projects')
        .select('id, is_deployed, endpoint_slug')
        .eq('id', resolvedFlow)
        .single();
      if (!error && data) flowProject = data;
    }
    
    if (!flowProject) {
      const { data, error } = await supabase
        .from('flow_projects')
        .select('id, is_deployed, endpoint_slug')
        .eq('endpoint_slug', resolvedFlow)
        .eq('is_deployed', true)
        .single();
      if (!error && data) flowProject = data;
    }

    if (!flowProject) {
      return new Response(JSON.stringify({ error: 'Flow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate API key if provided
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader) {
      const { data: keyData } = await supabase
        .from('flow_variables')
        .select('value')
        .eq('flow_project_id', flowProject.id)
        .eq('name', 'API_KEY')
        .eq('is_secret', true)
        .maybeSingle();
      if (keyData && keyData.value !== apiKeyHeader) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Load flow data
    // When accessed via UUID (emulator), always use the latest version so the user
    // can test their latest changes. When accessed via slug (production widget),
    // prefer the published version.
    let flowData: any = null;
    const isEmulatorAccess = isUUID;

    if (!isEmulatorAccess && flowProject.is_deployed) {
      // Production: prefer published version
      const { data } = await supabase
        .from('flow_data')
        .select('nodes, edges')
        .eq('flow_project_id', flowProject.id)
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      flowData = data;
    }
    if (!flowData) {
      // Emulator or fallback: always use latest version
      const { data } = await supabase
        .from('flow_data')
        .select('nodes, edges')
        .eq('flow_project_id', flowProject.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      flowData = data;
    }

    if (!flowData) {
      return new Response(JSON.stringify({ error: 'No flow data found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nodes = flowData.nodes as any[];
    const edges = (flowData.edges || []) as any[];
    const aiAgentNode = nodes.find((n: any) => n.data?.type === 'ai-agent');

    if (!aiAgentNode) {
      return new Response(JSON.stringify({ error: 'No AI Agent node found in this flow' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nodeInputs = aiAgentNode.data?.inputs || {};
    const rawModel = nodeInputs.model || 'gpt-4o';
    const instructions = nodeInputs.instructions || 'You are a helpful assistant.';
    const temperature = parseFloat(nodeInputs.temperature) || 0.7;
    // Default to true (tool calling enabled) unless explicitly set to false
    const chatToolCalling = !(nodeInputs.chatToolCalling === false || nodeInputs.chatToolCalling === 'false');
    console.log(`[chat-widget] chatToolCalling raw=${JSON.stringify(nodeInputs.chatToolCalling)} type=${typeof nodeInputs.chatToolCalling} resolved=${chatToolCalling}`);

    // 4b. Find downstream nodes connected from AI Agent and build tools
    const downstreamNodeIds = edges
      .filter((e: any) => e.source === aiAgentNode.id)
      .map((e: any) => e.target);
    const downstreamNodes = nodes.filter((n: any) => downstreamNodeIds.includes(n.id));

    // 4c. Identify post-response hook node IDs (excluded from AI tools)
    const postResponseHookIds: string[] = Array.isArray(nodeInputs.postResponseHooks) 
      ? nodeInputs.postResponseHooks 
      : [];
    const hookNodeIdSet = new Set(postResponseHookIds);
    console.log(`[chat-widget] Post-response hooks: ${postResponseHookIds.length} configured`);

    let toolDefs: any[] = [];
    let nodeMap = new Map<string, any>();
    if (chatToolCalling && downstreamNodes.length > 0) {
      const built = buildToolsFromNodes(downstreamNodes, hookNodeIdSet);
      toolDefs = built.tools;
      nodeMap = built.nodeMap;
      console.log(`[chat-widget] Built ${toolDefs.length} tools from ${downstreamNodes.length} downstream nodes (excluded ${postResponseHookIds.length} hooks)`);
    }

    // 5. Load knowledge files
    let knowledgeContext = '';
    const knowledgeFiles = nodeInputs.knowledgeFiles;
    
    if (knowledgeFiles && Array.isArray(knowledgeFiles) && knowledgeFiles.length > 0) {
      const fileContents: string[] = [];
      for (const file of knowledgeFiles) {
        try {
          const storagePath = file.path || file.storagePath;
          if (!storagePath) continue;
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('flow-node-files')
            .download(storagePath);
          if (downloadError || !fileData) continue;
          const text = await fileData.text();
          try {
            const parsed = JSON.parse(text);
            fileContents.push(`--- Knowledge File: ${file.name} ---\n${JSON.stringify(parsed, null, 2)}`);
          } catch {
            fileContents.push(`--- Knowledge File: ${file.name} ---\n${text}`);
          }
        } catch (err) {
          console.error(`Failed to load knowledge file ${file.name}:`, err);
        }
      }
      if (fileContents.length > 0) {
        knowledgeContext = '\n\n=== KNOWLEDGE BASE ===\nUse the following knowledge base to answer user questions accurately.\n\n' + fileContents.join('\n\n');
      }
    }

    // 6. Resolve API key
    let openaiApiKey = '';
    const apiKeyInput = nodeInputs.apiKey || '';

    const envMatch = apiKeyInput.match(/\{\{env\.(.+?)\}\}/);
    if (envMatch) {
      const { data: secretsData } = await supabase.rpc('get_all_flow_secrets', { p_flow_project_id: flowProject.id });
      if (secretsData && typeof secretsData === 'object') {
        openaiApiKey = (secretsData as Record<string, string>)[envMatch[1]] || '';
      }
    }

    if (!openaiApiKey && apiKeyInput) {
      let varName = apiKeyInput;
      if (varName.startsWith('FLOW: ')) varName = varName.substring(6).trim();
      const { data: varData } = await supabase
        .from('flow_variables').select('value')
        .eq('flow_project_id', flowProject.id).eq('name', varName).maybeSingle();
      if (varData?.value) openaiApiKey = varData.value;
    }

    if (!openaiApiKey) {
      const { data: secretsData } = await supabase.rpc('get_all_flow_secrets', { p_flow_project_id: flowProject.id });
      if (secretsData && typeof secretsData === 'object') {
        const secrets = secretsData as Record<string, string>;
        for (const key of ['OPENAI_API_KEY', 'openai_api_key', 'API_KEY', 'ANTHROPIC_API_KEY']) {
          if (secrets[key]) { openaiApiKey = secrets[key]; break; }
        }
      }
    }

    if (!openaiApiKey) {
      const { data: vars } = await supabase.from('flow_variables').select('name, value').eq('flow_project_id', flowProject.id);
      if (vars) {
        for (const v of vars) {
          if (v.value && (v.value.startsWith('sk-') || v.value.startsWith('sk-proj-') || v.value.startsWith('sk-ant-'))) {
            openaiApiKey = v.value; break;
          }
        }
      }
    }

    if (!openaiApiKey && apiKeyInput && !apiKeyInput.includes('{{') && (apiKeyInput.startsWith('sk-') || apiKeyInput.length > 30)) {
      openaiApiKey = apiKeyInput;
    }
    if (!openaiApiKey) {
      openaiApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || '';
    }
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'No API key configured for the AI Agent node.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6b. Resolve model
    let model = rawModel;
    const modelEnvMatch = model.match(/\{\{env\.(.+?)\}\}/);
    if (modelEnvMatch) {
      console.warn(`[chat-widget] Model field contains env variable — using default model.`);
      if (!openaiApiKey) {
        const { data: secretsData } = await supabase.rpc('get_all_flow_secrets', { p_flow_project_id: flowProject.id });
        if (secretsData && typeof secretsData === 'object') {
          const resolvedKey = (secretsData as Record<string, string>)[modelEnvMatch[1]] || '';
          if (resolvedKey) openaiApiKey = resolvedKey;
        }
      }
      // Detect provider from the resolved API key
      if (openaiApiKey.startsWith('sk-ant-')) {
        model = 'claude-sonnet-4-20250514';
      } else if (openaiApiKey.startsWith('lov_')) {
        model = 'google/gemini-2.5-flash';
      } else if (model.startsWith('minimax') || model.includes('MiniMax')) {
        model = 'minimax-m2.5';
      } else {
        model = 'gpt-4o';
      }
    }

    // Log the resolved model for debugging
    console.log(`[chat-widget] Resolved model: ${model}, rawModel: ${rawModel}, keyPrefix: ${openaiApiKey.substring(0, 8)}...`);

    // 7. Build messages
    let toolAwareness = '';
    if (toolDefs.length > 0) {
      const toolDescriptions = toolDefs.map(t => 
        `- ${t.function.description}`
      ).join('\n');
      toolAwareness = `\n\nCRITICAL HONESTY RULE: You must NEVER claim you performed an action unless you actually called a tool and received a successful result. If you do not have a tool/action available for what the user is asking, honestly tell them: "I don't have the ability to do that yet." Do NOT fabricate or hallucinate that you sent a message, made a call, or performed any action. Only report success when a tool call actually returned a successful result.\n\n=== AVAILABLE ACTIONS ===\nYou have the following actions/tools available. Use them proactively when the user's request matches, even if they don't explicitly mention the tool name. The user may not know these capabilities are available — offer to use them when relevant.\n\n${toolDescriptions}\n\nIMPORTANT: When the user asks you to perform an action that matches one of your available tools, ALWAYS use the tool. Do NOT say you cannot do it. Do NOT ask the user to do it manually. Just execute the tool directly.\nIf the user asks for something that is NOT in the list above, tell them honestly that you don't have that capability yet. Never pretend you did something you didn't do.\n`;
    } else {
      toolAwareness = `\n\nCRITICAL: You are a conversational AI assistant ONLY. You have NO tools, NO actions, and NO ability to perform any external operations. You CANNOT send messages, emails, Slack messages, make API calls, write to databases, or perform ANY action outside of this conversation. If a user asks you to do any of these things, you MUST honestly tell them: "I don't have the ability to do that." NEVER claim or imply that you performed an action. NEVER say "I've sent", "I've done", "I've completed", or anything similar. You can ONLY respond with text in this conversation.\n`;
    }
    const systemPrompt = instructions + knowledgeContext + toolAwareness;
    const messages_payload: any[] = [{ role: 'system', content: systemPrompt }];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) messages_payload.push({ role: msg.role, content: msg.content });
      }
    }
    messages_payload.push({ role: 'user', content: message });

    // 8. Call AI with tool-calling loop
    const isAnthropic = openaiApiKey.startsWith('sk-ant-') || model.startsWith('claude');
    const isLovable = openaiApiKey.startsWith('lov_');
    const isMinimax = model.startsWith('minimax') || model.includes('MiniMax');
    const hasTools = toolDefs.length > 0;
    let reply = '';

    // Pre-load secrets for tool execution
    let flowSecrets: Record<string, string> = {};
    if (hasTools) {
      const { data: sd } = await supabase.rpc('get_all_flow_secrets', { p_flow_project_id: flowProject.id });
      if (sd && typeof sd === 'object') flowSecrets = sd as Record<string, string>;
    }

    const MAX_TOOL_ITERATIONS = 5;

    if (isAnthropic) {
      const anthropicModel = model.startsWith('gpt') ? 'claude-sonnet-4-20250514' : model;
      console.log('Calling Anthropic:', anthropicModel, 'tools:', toolDefs.length);

      const systemMsg = messages_payload.find(m => m.role === 'system')?.content || '';
      const nonSystemMsgs = messages_payload.filter(m => m.role !== 'system');
      const anthropicBody: any = {
        model: anthropicModel, max_tokens: 4096, system: systemMsg,
        messages: [...nonSystemMsgs], temperature,
      };
      if (hasTools) anthropicBody.tools = toAnthropicTools(toolDefs);

      let iteration = 0;
      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': openaiApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify(anthropicBody),
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          logChatError(supabase, flowProject.id, aiAgentNode?.id || null,
            `AI service returned ${resp.status}: ${errorText.substring(0, 500)}`,
            { model, statusCode: resp.status, errorBody: errorText.substring(0, 1000), userMessage: message?.substring(0, 200) }
          );
          return new Response(JSON.stringify({ error: 'AI service error', details: errorText }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const data = await resp.json();

        if (data.stop_reason === 'tool_use' && hasTools) {
          const toolUses = (data.content || []).filter((b: any) => b.type === 'tool_use');
          if (toolUses.length === 0) break;

          anthropicBody.messages.push({ role: 'assistant', content: data.content });
          const toolResults: any[] = [];
          
          for (const tu of toolUses) {
            const node = nodeMap.get(tu.name);
            if (!node) {
              toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: `Unknown tool: ${tu.name}` }) });
              continue;
            }
            console.log(`[chat-widget] Executing tool: ${tu.name}`);
            const mergedInputs = { ...(node.data?.inputs || {}), ...tu.input };
            const execCtx: Record<string, any> = { _flowProjectId: flowProject.id, _executionId: `chat-${Date.now()}`, env: flowSecrets };
            const resolved = resolveNodeInputs(mergedInputs, execCtx);
            composeFieldMapData(resolved, node.data?.type);
            const execNode = { ...node, data: { ...node.data, inputs: resolved } };
            try {
              const result = await executeToolNode(execNode, execCtx, supabase);
              toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result.success ? result.output : { error: result.error }) });
            } catch (err: any) {
              logChatError(supabase, flowProject.id, node?.id || null,
                `Tool "${tu.name}" execution failed: ${err.message}`,
                { toolName: tu.name, error: err.message, model }
              );
              toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: err.message }) });
            }
          }
          anthropicBody.messages.push({ role: 'user', content: toolResults });
          continue;
        }

        reply = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || 'No response generated.';
        break;
      }

    } else {
      // OpenAI / MiniMax / Lovable gateway (all OpenAI-compatible)
      const apiUrl = isMinimax
        ? 'https://api.minimax.io/v1/chat/completions'
        : isLovable
          ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
      console.log('Calling AI:', model, 'url:', apiUrl, 'tools:', toolDefs.length);

      const openaiBody: any = { model, messages: [...messages_payload], temperature };
      if (hasTools) openaiBody.tools = toolDefs;

      let iteration = 0;
      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(openaiBody),
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          logChatError(supabase, flowProject.id, aiAgentNode?.id || null,
            `AI service returned ${resp.status}: ${errorText.substring(0, 500)}`,
            { model, statusCode: resp.status, errorBody: errorText.substring(0, 1000), userMessage: message?.substring(0, 200) }
          );
          return new Response(JSON.stringify({ error: 'AI service error', details: errorText }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const aiData = await resp.json();
        const choice = aiData.choices?.[0];
        const assistantMsg = choice?.message;

        if (choice?.finish_reason === 'tool_calls' && assistantMsg?.tool_calls && hasTools) {
          openaiBody.messages.push(assistantMsg);

          for (const tc of assistantMsg.tool_calls) {
            const fnName = tc.function?.name;
            const node = nodeMap.get(fnName);
            let args: Record<string, any> = {};
            try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}

            if (!node) {
              openaiBody.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: `Unknown tool: ${fnName}` }) });
              continue;
            }
            console.log(`[chat-widget] Executing tool: ${fnName}`);
            const mergedInputs = { ...(node.data?.inputs || {}), ...args };
            const execCtx: Record<string, any> = { _flowProjectId: flowProject.id, _executionId: `chat-${Date.now()}`, env: flowSecrets };
            const resolved = resolveNodeInputs(mergedInputs, execCtx);
            composeFieldMapData(resolved, node.data?.type);
            const execNode = { ...node, data: { ...node.data, inputs: resolved } };
            try {
              const result = await executeToolNode(execNode, execCtx, supabase);
              openaiBody.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result.success ? result.output : { error: result.error }) });
            } catch (err: any) {
              logChatError(supabase, flowProject.id, node?.id || null,
                `Tool "${fnName}" execution failed: ${err.message}`,
                { toolName: fnName, error: err.message, model }
              );
              openaiBody.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
            }
          }
          continue;
        }

        reply = assistantMsg?.content || 'No response generated.';
        break;
      }
    }

    // 9. Execute post-response hooks (fire-and-forget, non-blocking)
    if (postResponseHookIds.length > 0) {
      const hookNodes = nodes.filter((n: any) => 
        hookNodeIdSet.has(n.id) && !n.data?.disabled
      );
      
      if (hookNodes.length > 0) {
        console.log(`[chat-widget] Executing ${hookNodes.length} post-response hooks`);
        
        // Load secrets if not already loaded
        let hookSecrets = flowSecrets;
        if (Object.keys(hookSecrets).length === 0) {
          const { data: sd } = await supabase.rpc('get_all_flow_secrets', { p_flow_project_id: flowProject.id });
          if (sd && typeof sd === 'object') hookSecrets = sd as Record<string, string>;
        }
        
        // Build chat context for hooks
        const chatContext = {
          userMessage: message,
          aiResponse: reply,
          sessionId: body.sessionId || `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          history: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: reply }],
        };
        
        // Execute all hooks asynchronously — don't block the response
        Promise.allSettled(
          hookNodes.map(async (hookNode: any) => {
            try {
              const execCtx: Record<string, any> = {
                _flowProjectId: flowProject.id,
                _executionId: `hook-${Date.now()}`,
                env: hookSecrets,
                chatContext,
                // Inject AI Agent node outputs so {{nodeId.field}} bindings resolve
                [aiAgentNode.id]: {
                  response: reply,
                  userMessage: message,
                  sessionId: body.sessionId || chatContext.sessionId,
                  conversationHistory: chatContext.history,
                  metadata: { model: nodeInputs.model, timestamp: chatContext.timestamp },
                },
              };
              const resolved = resolveNodeInputs(hookNode.data?.inputs || {}, execCtx);
              composeFieldMapData(resolved, hookNode.data?.type);
              
              const execNode = { ...hookNode, data: { ...hookNode.data, inputs: resolved } };
              const result = await executeToolNode(execNode, execCtx, supabase);
              console.log(`[chat-widget] Hook ${hookNode.data?.label || hookNode.id} completed:`, result.success);
              return result;
            } catch (err: any) {
              console.error(`[chat-widget] Hook ${hookNode.data?.label || hookNode.id} failed:`, err.message);
              logChatError(supabase, flowProject.id, hookNode.id,
                `Hook "${hookNode.data?.label || hookNode.id}" failed: ${err.message}`,
                { hookName: hookNode.data?.label, error: err.message }
              );
              return { success: false, error: err.message };
            }
          })
        ).catch(err => console.error('[chat-widget] Hook execution error:', err));
      }
    }

    return new Response(JSON.stringify({ reply, conversation_id: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('chat-widget error:', error);
    // Best-effort logging — flowProject may not be available if error happened early
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const errSupabase = createClient(supabaseUrl, serviceKey);
      const reqBody = await new Request(error?._request?.url || 'http://x', { method: 'POST' }).json().catch(() => ({}));
      const flowId = (error as any)?._flowId || reqBody?.flow || 'unknown';
      if (flowId && flowId !== 'unknown') {
        logChatError(errSupabase, flowId, null,
          `Unhandled error: ${error.message || String(error)}`,
          { error: error.message, stack: error.stack?.substring(0, 500) }
        );
      }
    } catch (_) { /* swallow — don't let logging break the error response */ }
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateWidgetHTML(opts: {
  mode: string; theme: string; accent: string; title: string;
  welcome: string; position: string; showWS: boolean; avatar: string;
  brand: string; status: string; gradientColors: string[];
  quickLinks: any[]; aqTitle: string; aqSub: string;
  startBtn: string; chatApiUrl: string;
}): string {
  const { mode, theme, accent, title, welcome, position, showWS, avatar, brand, status, gradientColors, quickLinks, aqTitle, aqSub, startBtn, chatApiUrl } = opts;
  const gradient = `linear-gradient(135deg, ${gradientColors.join(', ')})`;
  const isWidget = mode === 'widget';
  const posRight = position !== 'bottom-left';
  const accentColor = `#${accent}`;

  const linksHTML = quickLinks.map(l =>
    `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(255,255,255,0.15);border-radius:8px;color:#fff;text-decoration:none;font-size:11px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${escapeHtml(l.label)}</a>`
  ).join('');

  const avatarHTML = avatar
    ? `<img src="${escapeHtml(avatar)}" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;border:2px solid rgba(255,255,255,0.3)">`
    : `<div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;overflow:hidden;background:transparent}
.dark{--bg:#1a1a2e;--text:#e0e0e0;--msg-bg:#2a2a3e;--border:#333355;--muted:#9ca3af}
.light{--bg:#fff;--text:#1a1a1a;--msg-bg:#f3f4f6;--border:#e5e7eb;--muted:#6b7280}
#bubble{position:fixed;${posRight?'right:16px':'left:16px'};bottom:16px;width:48px;height:48px;border-radius:50%;background:${accentColor};cursor:pointer;display:${isWidget?'flex':'none'};align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:10000;transition:transform 0.2s}
#bubble:hover{transform:scale(1.08)}
#bubble svg{width:22px;height:22px;color:#fff}
#panel{position:${isWidget?'fixed':'relative'};${posRight?'right:16px':'left:16px'};${isWidget?'bottom:72px':'top:0;left:0;right:0'};width:${isWidget?'340px':'100%'};height:${isWidget?'480px':'100vh'};border-radius:${isWidget?'14px':'0'};overflow:hidden;display:${isWidget?'none':'flex'};flex-direction:column;z-index:10001;box-shadow:${isWidget?'0 8px 32px rgba(0,0,0,0.18)':'none'};border:${isWidget?'1px solid var(--border)':'none'};background:var(--bg);color:var(--text);transition:width 0.3s ease,height 0.3s ease}
#panel.expanded{width:min(600px,90vw)!important;height:min(750px,85vh)!important}
#panel.open{display:flex}
.welcome-hero{background:${gradient};padding:18px 14px 20px;flex:0 0 auto;position:relative}
.welcome-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.icon-btn{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff}
.icon-btn:hover{background:rgba(255,255,255,0.35)}
.welcome-body{color:#fff}
.welcome-body h2{font-size:15px;font-weight:700;margin-bottom:2px}
.welcome-body p{font-size:11px;opacity:0.85}
.welcome-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.aq-section{padding:14px;flex:1;display:flex;flex-direction:column}
.aq-card{background:var(--msg-bg);border:1px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;transition:border-color 0.2s}
.aq-card:hover{border-color:${accentColor}}
.aq-card h3{font-size:12px;font-weight:600;margin-bottom:2px}
.aq-card p{font-size:10px;color:var(--muted)}
.start-btn{margin-top:auto;padding:10px;background:${accentColor};color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity 0.2s}
.start-btn:hover{opacity:0.9}
.chat-header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);flex:0 0 auto}
.chat-header .title{font-size:12px;font-weight:600;flex:1}
.chat-header .status{font-size:9px;color:var(--muted)}
.messages{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.msg{max-width:85%;padding:8px 10px;border-radius:10px;font-size:12px;line-height:1.5;word-wrap:break-word}
.msg.bot{align-self:flex-start;background:var(--msg-bg);border-bottom-left-radius:4px}
.msg.user{align-self:flex-end;background:${accentColor};color:#fff;border-bottom-right-radius:4px}
.msg p{margin:0 0 4px}
.msg p:last-child{margin:0}
.msg code{background:rgba(0,0,0,0.1);padding:1px 4px;border-radius:3px;font-size:11px}
.msg pre{background:rgba(0,0,0,0.1);padding:6px;border-radius:4px;overflow-x:auto;margin:4px 0}
.msg pre code{background:none;padding:0}
.typing{display:flex;gap:3px;padding:8px 10px;align-self:flex-start;background:var(--msg-bg);border-radius:10px;border-bottom-left-radius:4px}
.typing span{width:5px;height:5px;border-radius:50%;background:var(--muted);animation:blink 1.4s infinite both}
.typing span:nth-child(2){animation-delay:0.2s}
.typing span:nth-child(3){animation-delay:0.4s}
@keyframes blink{0%,80%,100%{opacity:0.3}40%{opacity:1}}
.input-row{display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--border);flex:0 0 auto}
.input-row input{flex:1;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:8px;padding:8px 10px;font-size:12px;outline:none}
.input-row input:focus{border-color:${accentColor}}
.input-row button{width:34px;height:34px;border-radius:8px;background:${accentColor};color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.input-row button:disabled{opacity:0.5;cursor:not-allowed}
.home-btn{background:none;border:none;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center;padding:2px}
</style>
</head>
<body class="${theme === 'dark' ? 'dark' : 'light'}">

<div id="bubble" onclick="togglePanel()">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</div>

<div id="panel">
<!-- Welcome Screen -->
<div id="welcome" style="display:flex;flex-direction:column;height:100%">
<div class="welcome-hero">
<div class="welcome-top">
<div>${avatarHTML}</div>
<div style="display:flex;gap:4px">
<button class="icon-btn" onclick="toggleTheme()" id="themeBtn" title="Toggle theme"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
${isWidget ? `<button class="icon-btn" onclick="togglePanel()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
</div>
</div>
<div class="welcome-body">
${brand ? `<h2>${escapeHtml(brand)}</h2>` : ''}
<p>${escapeHtml(welcome)}</p>
${status ? `<p style="margin-top:4px;font-size:10px;opacity:0.7">● ${escapeHtml(status)}</p>` : ''}
</div>
${linksHTML ? `<div class="welcome-links">${linksHTML}</div>` : ''}
</div>
<div class="aq-section">
<div class="aq-card" onclick="startChat()">
<h3>${escapeHtml(aqTitle)}</h3>
<p>${escapeHtml(aqSub)}</p>
</div>
<button class="start-btn" onclick="startChat()" style="margin-top:12px">${escapeHtml(startBtn)}</button>
</div>
</div>

<!-- Chat Screen -->
<div id="chat" style="display:none;flex-direction:column;height:100%">
<div class="chat-header">
${showWS ? `<button class="home-btn" onclick="showWelcomeScreen()" title="Home"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button>` : ''}
<div>
<div class="title">${escapeHtml(title)}</div>
<div class="status">● ${escapeHtml(status)}</div>
</div>
<div style="margin-left:auto;display:flex;gap:4px">
<button class="icon-btn" onclick="toggleTheme()" style="background:var(--msg-bg);color:var(--text)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
${isWidget ? `<button class="icon-btn" onclick="toggleExpand()" id="expandBtn" style="background:var(--msg-bg);color:var(--text)" title="Expand"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>` : ''}
${isWidget ? `<button class="icon-btn" onclick="togglePanel()" style="background:var(--msg-bg);color:var(--text)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
</div>
</div>
<div class="messages" id="messages"></div>
<div class="input-row">
<input id="input" type="text" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMsg()">
<button onclick="sendMsg()" id="sendBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
</div>
</div>
</div>

<script>
var urlP=new URLSearchParams(window.location.search);
var FLOW=urlP.get('flow')||'';
var MODE=urlP.get('mode')||'widget';
var API='${chatApiUrl}';
var messages=[];
var isLoading=false;
var isDark=${theme === 'dark'};
var hasWelcome=${showWS};
var welcomeMsg=${JSON.stringify(welcome)};
var isExpanded=false;

function friendlyError(msg){
  if(msg.indexOf('Invalid or inactive flow')!==-1)return'This chat service is currently unavailable. Please try again later.';
  if(msg.indexOf('Domain not allowed')!==-1)return'This chat service is not available on this website.';
  if(msg.indexOf('Message is required')!==-1)return'Please enter a message.';
  return'Something went wrong. Please try again.';
}

function saveMessages(){try{sessionStorage.setItem('chat-'+FLOW,JSON.stringify(messages))}catch(e){}}
function loadMessages(){try{var s=sessionStorage.getItem('chat-'+FLOW);if(s){messages=JSON.parse(s);return true}}catch(e){}return false}
function toggleExpand(){
  var p=document.getElementById('panel');
  isExpanded=!isExpanded;
  if(isExpanded){p.classList.add('expanded')}else{p.classList.remove('expanded')}
  try{sessionStorage.setItem('chat-expand-'+FLOW,isExpanded?'1':'0')}catch(e){}
}
// Restore expand state
try{if(sessionStorage.getItem('chat-expand-'+FLOW)==='1'){isExpanded=true;document.addEventListener('DOMContentLoaded',function(){var p=document.getElementById('panel');if(p)p.classList.add('expanded')})}}catch(e){}

if(!FLOW){
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.getElementById('messages');
    if(el) el.innerHTML='<div class="msg bot"><p>Configuration error: missing flow ID.</p></div>';
    var wel=document.getElementById('welcome');
    if(wel) wel.style.display='none';
    var ch=document.getElementById('chat');
    if(ch) ch.style.display='flex';
  });
}

function togglePanel(){
  var p=document.getElementById('panel');
  var b=document.getElementById('bubble');
  if(p.classList.contains('open')){p.classList.remove('open');b.style.display='flex'}
  else{p.classList.add('open');b.style.display='none';document.getElementById('input')?.focus()}
}

function toggleTheme(){
  isDark=!isDark;
  document.body.className=isDark?'dark':'light';
}

function showWelcomeScreen(){
  document.getElementById('welcome').style.display='flex';
  document.getElementById('chat').style.display='none';
}

function startChat(){
  document.getElementById('welcome').style.display='none';
  document.getElementById('chat').style.display='flex';
  if(messages.length===0){
    if(!loadMessages()){
      messages.push({text:welcomeMsg,sender:'bot'});
    }
    renderMessages();
  }
  document.getElementById('input')?.focus();
}

${!showWS ? `
// No welcome screen — go straight to chat
document.getElementById('welcome').style.display='none';
document.getElementById('chat').style.display='flex';
if(!loadMessages()){messages.push({text:welcomeMsg,sender:'bot'});}
renderMessages();
` : ''}

function renderMessages(){
  var c=document.getElementById('messages');
  var h='';
  for(var i=0;i<messages.length;i++){
    var m=messages[i];
    h+='<div class="msg '+m.sender+'">'+formatMd(m.text)+'</div>';
  }
  if(isLoading) h+='<div class="typing"><span></span><span></span><span></span></div>';
  c.innerHTML=h;
  c.scrollTop=c.scrollHeight;
  saveMessages();
}

function formatMd(t){
  var BT=String.fromCharCode(96);
  t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var cbr=new RegExp(BT+BT+BT+'([\\\\s\\\\S]*?)'+BT+BT+BT,'g');
  t=t.replace(cbr,'<pre><code>$1</code></pre>');
  var inl=new RegExp(BT+'([^'+BT+']+)'+BT,'g');
  t=t.replace(inl,'<code>$1</code>');
  t=t.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
  t=t.replace(/\\*(.+?)\\*/g,'<em>$1</em>');
  t=t.replace(/\\n/g,'<br>');
  var lines=t.split('<br>');
  var out='';
  for(var i=0;i<lines.length;i++){
    var l=lines[i].trim();
    if(l) out+='<p>'+l+'</p>';
  }
  return out||'<p>'+t+'</p>';
}

async function sendMsg(){
  var inp=document.getElementById('input');
  var txt=inp.value.trim();
  if(!txt||isLoading)return;
  messages.push({text:txt,sender:'user'});
  inp.value='';
  isLoading=true;
  renderMessages();
  try{
    var hist=[];
    for(var i=0;i<messages.length-1;i++){
      var m=messages[i];
      if(i===0&&m.sender==='bot')continue;
      hist.push({role:m.sender==='user'?'user':'assistant',content:m.text});
    }
    var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({flow:FLOW,mode:MODE,message:txt,history:hist})});
    var d=await r.json();
    if(!r.ok)throw new Error(d.error||'Failed');
    messages.push({text:d.reply,sender:'bot'});
  }catch(e){
    messages.push({text:friendlyError(e.message),sender:'bot'});
  }
  isLoading=false;
  renderMessages();
}

${isWidget ? '' : `
// Full page mode — open immediately
document.getElementById('panel').classList.add('open');
`}
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
