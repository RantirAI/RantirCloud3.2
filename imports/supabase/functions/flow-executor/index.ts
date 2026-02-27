import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyHmacSignature, verifyProviderSignature } from "./signature.ts";
import { safeStringify, deepClone, buildExecutionOrder, getNextNodes } from "./utils.ts";
import { executeNode } from "./node-executor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webflow-signature, x-webflow-timestamp, stripe-signature, x-hub-signature-256, x-shopify-hmac-sha256",
  "Access-Control-Allow-Methods": "POST, GET, PUT, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const endpointSlug = pathParts[pathParts.length - 1];
    
    if (!endpointSlug || endpointSlug === "flow-executor") {
      return new Response(
        JSON.stringify({ error: "Missing endpoint slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: flowProject, error: flowError } = await supabase
      .from("flow_projects")
      .select(`
        id, name, is_deployed, webhook_secret, deployment_status,
        signature_provider, signature_header_name, signature_algorithm,
        external_webhook_secret, signature_timestamp_tolerance, user_id
      `)
      .eq("endpoint_slug", endpointSlug)
      .single();
    
    if (flowError || !flowProject) {
      return new Response(
        JSON.stringify({ error: "Flow not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!flowProject.is_deployed || flowProject.deployment_status !== "deployed") {
      return new Response(
        JSON.stringify({ error: "Flow is not deployed" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const bodyText = await req.text();
    const headersObj = Object.fromEntries(
      Array.from(req.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
    );
    
    // Verify external provider signature if configured
    if (flowProject.signature_provider && flowProject.signature_provider !== "none") {
      const sigResult = await verifyProviderSignature(
        flowProject.signature_provider,
        bodyText,
        headersObj,
        {
          secret: flowProject.external_webhook_secret || "",
          headerName: flowProject.signature_header_name,
          algorithm: flowProject.signature_algorithm,
          timestampTolerance: flowProject.signature_timestamp_tolerance || 300,
        }
      );
      
      if (!sigResult.valid && !sigResult.skipped) {
        return new Response(
          JSON.stringify({ 
            error: "Signature verification failed", 
            details: sigResult.error,
            provider: flowProject.signature_provider,
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Verify internal webhook signature if present
    const internalSignature = headersObj["x-webhook-signature"];
    if (flowProject.webhook_secret && internalSignature) {
      const isValid = await verifyHmacSignature(bodyText, internalSignature, flowProject.webhook_secret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid internal webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Validate API key if configured
    const apiKeyHeader = headersObj["x-api-key"];
    const { data: flowApiKey } = await supabase
      .from("flow_variables")
      .select("value")
      .eq("flow_project_id", flowProject.id)
      .eq("name", "API_KEY")
      .eq("is_secret", true)
      .single();
    
    if (flowApiKey?.value) {
      if (!apiKeyHeader) {
        return new Response(
          JSON.stringify({ error: "Missing API key", details: "Include X-API-Key header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (apiKeyHeader !== flowApiKey.value) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    let requestBody = {};
    try {
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      requestBody = { raw: bodyText };
    }
    
    const { data: flowData, error: dataError } = await supabase
      .from("flow_data")
      .select("id, nodes, edges, version")
      .eq("flow_project_id", flowProject.id)
      .eq("is_published", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    
    if (dataError || !flowData) {
      return new Response(
        JSON.stringify({ error: "No published flow version found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const nodes = flowData.nodes as any[];
    const edges = flowData.edges as any[];
    
    const { data: execution, error: execError } = await supabase
      .from("flow_executions")
      .insert({
        flow_data_id: flowData.id,
        status: "running",
        started_at: new Date().toISOString(),
        logs: [],
      })
      .select()
      .single();
    
    if (execError) {
      console.error("Failed to create execution record:", execError);
    }
    
    // Load encrypted secrets from Supabase Vault with ownership validation
    let vaultSecrets: Record<string, string> = {};
    try {
      // Validate flow ownership before loading secrets
      if (!flowProject.user_id) {
        console.error("Flow project missing user_id, skipping secret loading");
      } else {
        const { data: secrets, error: secretsError } = await supabase.rpc("get_all_flow_secrets", {
          p_flow_project_id: flowProject.id,
        });
        
        if (!secretsError && secrets) {
          vaultSecrets = secrets as Record<string, string>;
        }
      }
    } catch (secretsErr) {
      console.error("Failed to load vault secrets:", secretsErr);
    }
    
    // Also load legacy flow_variables for backwards compatibility
    let legacyEnvVars: Record<string, string> = {};
    try {
      const { data: legacyVars } = await supabase
        .from("flow_variables")
        .select("name, value")
        .eq("flow_project_id", flowProject.id);
      
      if (legacyVars) {
        for (const v of legacyVars) {
          legacyEnvVars[v.name] = v.value;
        }
      }
    } catch (legacyErr) {
      console.error("Failed to load legacy variables:", legacyErr);
    }
    
    const context: Record<string, any> = {
      request: {
        method: req.method,
        headers: headersObj,
        body: requestBody,
        query: Object.fromEntries(url.searchParams.entries()),
      },
      env: { ...legacyEnvVars, ...vaultSecrets }, // Vault secrets override legacy
      variables: {},
      _flowProjectId: flowProject.id,
      _executionId: execution?.id,
    };
    
    const logs: any[] = [];
    let finalOutput: any = null;
    let hasError = false;
    let errorMessage = "";
    const partialErrors: { nodeId: string; nodeName: string; error: string }[] = [];
    
    const executionOrder = buildExecutionOrder(nodes, edges);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const executed = new Set<string>();
    
    const queue = executionOrder.filter(id => {
      const incomingEdges = edges.filter(e => e.target === id);
      return incomingEdges.length === 0;
    });
    
    while (queue.length > 0 && !hasError) {
      const nodeId = queue.shift()!;
      
      if (executed.has(nodeId)) continue;
      executed.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node || node.data?.disabled) {
        const nextNodes = getNextNodes(nodeId, edges);
        queue.push(...nextNodes);
        continue;
      }
      
      logs.push({
        nodeId,
        nodeName: node.data?.label || nodeId,
        type: "info",
        message: `Executing ${node.data?.label || node.data?.type}`,
        timestamp: Date.now(),
      });
      
      const result = await executeNode(node, context, supabase);
      
      if (!result.success) {
        const shouldContinue = node.data?.errorBehavior === 'continue';
        
        logs.push({
          nodeId,
          nodeName: node.data?.label || nodeId,
          type: "error",
          message: result.error,
          timestamp: Date.now(),
        });
        
        if (!shouldContinue) {
          hasError = true;
          errorMessage = result.error || "Unknown error";
          break;
        } else {
          partialErrors.push({
            nodeId,
            nodeName: node.data?.label || nodeId,
            error: result.error || "Unknown error",
          });
          
          context[nodeId] = deepClone({
            error: result.error,
            success: false,
            _failedNode: true,
          });
          
          const nextNodes = getNextNodes(nodeId, edges);
          for (const nextId of nextNodes) {
            if (!executed.has(nextId)) queue.push(nextId);
          }
          continue;
        }
      }
      
      if (result.output) {
        context[nodeId] = deepClone({
          ...result.output,
          success: true,  // Always inject success status for every node
        });
        
        if (node.data?.type === "response") {
          finalOutput = deepClone(result.output);
        }
      } else {
        // Even if no output, store success status
        context[nodeId] = { success: true };
      }
      
      logs.push({
        nodeId,
        nodeName: node.data?.label || nodeId,
        type: "success",
        message: "Execution completed",
        data: deepClone(result.output),
        timestamp: Date.now(),
      });
      
      const isCondition = node.data?.type === "condition";
      const conditionResult = isCondition ? result.output?.result : undefined;
      const nextNodes = getNextNodes(nodeId, edges, conditionResult);
      
      for (const nextId of nextNodes) {
        if (!executed.has(nextId)) queue.push(nextId);
      }
    }
    
    const executionTime = Date.now() - startTime;
    const statusCode = hasError ? 500 : (finalOutput?.statusCode || 200);
    
    if (execution) {
      try {
        await supabase
          .from("flow_executions")
          .update({
            status: hasError ? "error" : "success",
            completed_at: new Date().toISOString(),
            execution_time_ms: executionTime,
            error_message: errorMessage || null,
            logs,
          })
          .eq("id", execution.id);
      } catch (updateErr) {
        console.error("Exception updating execution record:", updateErr);
      }
    }
    
    // Log errors and warnings to flow_monitoring_logs for the monitoring dashboard
    try {
      const monitoringRows: any[] = [];
      
      // 1. Log all explicit error logs
      const errorLogs = logs.filter((l: any) => l.type === 'error');
      for (const l of errorLogs) {
        monitoringRows.push({
          flow_id: flowProject.id,
          execution_id: execution?.id || 'unknown',
          node_id: l.nodeId || null,
          level: 'error',
          message: `[${l.nodeName || l.nodeId}] ${l.message}`,
          metadata: { nodeType: nodeMap.get(l.nodeId)?.data?.type, timestamp: l.timestamp, data: l.data },
        });
      }
      
      // 2. Log warnings for nodes that returned suspicious results (not implemented, proxy skipped, etc.)
      const successLogs = logs.filter((l: any) => l.type === 'success' && l.data);
      for (const l of successLogs) {
        const msg = l.data?.message || '';
        const isUnimplemented = msg.includes('not implemented') || msg.includes('not deployed') || msg.includes('skipped');
        const hasNestedError = l.data?.error || l.data?.success === false;
        
        if (isUnimplemented || hasNestedError) {
          monitoringRows.push({
            flow_id: flowProject.id,
            execution_id: execution?.id || 'unknown',
            node_id: l.nodeId || null,
            level: hasNestedError ? 'error' : 'warning',
            message: `[${l.nodeName || l.nodeId}] ${hasNestedError ? (l.data?.error || 'Node returned failure') : msg}`,
            metadata: { nodeType: nodeMap.get(l.nodeId)?.data?.type, timestamp: l.timestamp, output: l.data },
          });
        }
      }
      
      // 3. If the overall flow failed, log a summary error
      if (hasError && errorMessage) {
        monitoringRows.push({
          flow_id: flowProject.id,
          execution_id: execution?.id || 'unknown',
          node_id: null,
          level: 'error',
          message: `[Flow Execution] ${errorMessage}`,
          metadata: { executionTime, partialErrors },
        });
      }
      
      if (monitoringRows.length > 0) {
        const { error: monInsertErr } = await supabase.from('flow_monitoring_logs').insert(monitoringRows);
        if (monInsertErr) console.error('Failed to insert monitoring logs:', monInsertErr);
      }
    } catch (monitoringErr) {
      console.error('Failed to write monitoring logs:', monitoringErr);
    }

    // Log analytics
    try {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                       req.headers.get("x-real-ip") || "0.0.0.0";
      const userAgent = req.headers.get("user-agent") || "";
      
      const responseBody = finalOutput?.body || {
        success: !hasError,
        executionId: execution?.id,
        executionTime,
        output: deepClone(context),
      };
      const responseJson = safeStringify(responseBody);
      const responseSizeBytes = new TextEncoder().encode(responseJson).length;
      const requestSizeBytes = new TextEncoder().encode(bodyText).length;
      
      await supabase
        .from("flow_endpoint_analytics")
        .insert({
          flow_project_id: flowProject.id,
          method: req.method,
          status_code: statusCode,
          response_time_ms: executionTime,
          ip_address: clientIp,
          user_agent: userAgent,
          request_params: {
            body: requestBody,
            query: Object.fromEntries(url.searchParams.entries()),
            headers: Object.keys(headersObj),
          },
          request_size_bytes: requestSizeBytes,
          response_size_bytes: responseSizeBytes,
          error_message: errorMessage || null,
        });
    } catch (analyticsError) {
      console.error("Failed to log analytics:", analyticsError);
    }
    
    const hasResponseNode = finalOutput !== null;
    
    let finalResponseBody: any;
    let responseStatusCode = statusCode;
    
    if (hasResponseNode) {
      finalResponseBody = finalOutput.body || finalOutput;
      responseStatusCode = finalOutput.statusCode || statusCode;
    } else {
      const hasPartialErrors = partialErrors.length > 0;
      finalResponseBody = {
        success: !hasError,
        message: hasError 
          ? errorMessage 
          : hasPartialErrors 
            ? `Flow completed with ${partialErrors.length} node error(s)`
            : "Flow executed successfully",
        executionId: execution?.id,
        executionTime,
        ...(hasPartialErrors && { partialErrors }),
      };
    }
    
    return new Response(
      safeStringify(finalResponseBody),
      {
        status: responseStatusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Execution-Id": execution?.id || "",
          "X-Execution-Time": String(executionTime),
        },
      }
    );
    
  } catch (err: any) {
    console.error("Flow executor error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
