import { resolveNodeInputs, executeTransformCode, deepClone } from "./utils.ts";

// Execute a single node based on its type
export async function executeNode(
  node: any, 
  context: Record<string, any>,
  supabase: any
): Promise<{ success: boolean; output?: any; error?: string }> {
  const nodeType = node.data?.type;
  const inputs = resolveNodeInputs(node.data?.inputs || {}, context);
  
  try {
    switch (nodeType) {
      case "webhook-trigger": {
        const requestData = {
          headers: context.request?.headers || {},
          body: context.request?.body || {},
          query: context.request?.query || {},
          method: context.request?.method || "POST",
        };
        
        let transformed = null;
        if (inputs.transformPayload && inputs.transformCode) {
          transformed = executeTransformCode(inputs.transformCode, requestData);
        }
        
        return {
          success: true,
          output: {
            success: true, // Include in output for variable binding
            body: requestData.body,
            payload: requestData.body,
            headers: requestData.headers,
            query: requestData.query,
            method: requestData.method,
            transformed,
          },
        };
      }
      
      case "http-request": {
        const requestUrl = inputs.url?.trim();
        if (!requestUrl) {
          return {
            success: false,
            error: "HTTP Request failed: URL is empty or not configured.",
          };
        }
        
        try {
          new URL(requestUrl);
        } catch {
          return {
            success: false,
            error: `HTTP Request failed: Invalid URL format "${requestUrl}".`,
          };
        }
        
        let requestHeaders: Record<string, string> = {};
        if (inputs.headers) {
          try {
            requestHeaders = JSON.parse(inputs.headers);
          } catch {
            requestHeaders = {};
          }
        }
        
        if (inputs.apiKey) {
          requestHeaders["Authorization"] = `Bearer ${inputs.apiKey}`;
        }
        
        const response = await fetch(requestUrl, {
          method: inputs.method || "GET",
          headers: requestHeaders,
          body: inputs.method !== "GET" && inputs.body ? inputs.body : undefined,
        });
        
        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
        
        // Determine success based on HTTP status (2xx = success)
        const isSuccess = response.status >= 200 && response.status < 300;
        
        return {
          success: isSuccess,
          output: {
            success: isSuccess, // Also include in output for variable binding
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries()),
            error: isSuccess ? null : response.statusText || `HTTP ${response.status}`,
          },
        };
      }
      
      case "condition": {
        const { sourceNodeId, outputField, operation, compareValue } = inputs;
        const data = context[sourceNodeId]?.[outputField];
        
        let result = false;
        switch (operation) {
          case "eq": result = data == compareValue; break;
          case "neq": result = data != compareValue; break;
          case "gt": result = Number(data) > Number(compareValue); break;
          case "lt": result = Number(data) < Number(compareValue); break;
          case "gte": result = Number(data) >= Number(compareValue); break;
          case "lte": result = Number(data) <= Number(compareValue); break;
          case "contains": result = String(data).includes(String(compareValue)); break;
          case "not_contains": result = !String(data).includes(String(compareValue)); break;
          case "exists": result = data !== undefined && data !== null; break;
          case "not_exists": result = data === undefined || data === null; break;
        }
        
        return { success: true, output: { success: true, result, data } };
      }
      
      case "set-variable": {
        return {
          success: true,
          output: { success: true, [inputs.variableName || "value"]: inputs.value },
        };
      }
      
      case "data-filter": {
        const data = context[inputs.sourceNodeId]?.[inputs.outputField];
        
        if (!Array.isArray(data)) {
          return { success: true, output: { success: true, filtered: data, error: null } };
        }
        
        let filtered = [...data];
        
        if (inputs.filterField && inputs.filterValue) {
          filtered = filtered.filter(item => {
            const fieldValue = item[inputs.filterField];
            switch (inputs.filterOperation) {
              case "eq": return fieldValue == inputs.filterValue;
              case "neq": return fieldValue != inputs.filterValue;
              case "contains": return String(fieldValue).includes(inputs.filterValue);
              default: return true;
            }
          });
        }
        
        return { success: true, output: { success: true, filtered, count: filtered.length, error: null } };
      }
      
      case "code-execution": {
        try {
          const fn = new Function("inputs", "context", inputs.code);
          const result = fn(inputs, context);
          return { success: true, output: { success: true, result, error: null } };
        } catch (err: any) {
          return { success: false, error: `Code execution error: ${err.message}` };
        }
      }

      case "ai-agent": {
        try {
          const { data, error } = await supabase.functions.invoke("ai-agent-proxy", {
            body: {
              apiKey: inputs.apiKey,
              model: inputs.model,
              instructions: inputs.instructions,
              inputData: inputs.inputData,
              temperature: inputs.temperature,
              knowledgeFiles: inputs.knowledgeFiles,
              flowProjectId: context._flowProjectId,
              messages: inputs.messages,
            },
          });

          if (error) {
            const errMsg = error.message || "AI Agent proxy call failed";
            return { success: false, error: `ai-agent: ${errMsg}` };
          }
          if (data?.error) {
            return { success: false, error: `ai-agent: ${data.error}` };
          }
          return { success: true, output: { success: true, ...data } };
        } catch (err: any) {
          return { success: false, error: `ai-agent: ${err.message}` };
        }
      }
      
      case "response": {
        let parsedBody = {};
        if (inputs.body) {
          try {
            parsedBody = typeof inputs.body === 'string' ? JSON.parse(inputs.body) : inputs.body;
          } catch {
            parsedBody = inputs.body;
          }
        }
        
        let customHeaders = {};
        if (inputs.customHeaders) {
          try {
            customHeaders = typeof inputs.customHeaders === 'string' 
              ? JSON.parse(inputs.customHeaders) 
              : inputs.customHeaders;
          } catch {
            customHeaders = {};
          }
        }
        
        return {
          success: true,
          output: {
            success: true, // Include in output for variable binding
            statusCode: parseInt(inputs.statusCode) || 200,
            body: parsedBody,
            contentType: inputs.contentType || 'application/json',
            headers: customHeaders,
          },
        };
      }
      
      case "logger": {
        // Get raw inputs before resolution to access the dataSource template
        const rawInputs = node.data?.inputs || {};
        const rawDataSource = rawInputs.dataSource;
        
        const { enabled, destination, logLevel, message, customData } = inputs;
        
        if (enabled === false || enabled === "false") {
          return {
            success: true,
            output: { success: true, logged: false, logId: null, message: "Logging disabled" },
          };
        }
        
        // Resolve data from the raw dataSource template (before resolveNodeInputs stringifies it)
        let resolvedData: any = null;
        if (rawDataSource && rawDataSource !== "__none__" && typeof rawDataSource === "string" && 
            rawDataSource.startsWith("{{") && rawDataSource.endsWith("}}")) {
          const variablePath = rawDataSource.slice(2, -2).trim();
          const parts = variablePath.split(".");
          let result: any = context;
          for (const part of parts) {
            // Handle array index access like items[0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
              const [, fieldName, index] = arrayMatch;
              if (result && typeof result === "object" && fieldName in result) {
                result = result[fieldName];
                if (Array.isArray(result)) {
                  result = result[parseInt(index, 10)];
                }
              } else {
                result = null;
                break;
              }
            } else if (result && typeof result === "object" && part in result) {
              result = result[part];
            } else {
              result = null;
              break;
            }
          }
          resolvedData = result;
        }
        
        let parsedCustomData: any = null;
        if (customData) {
          try {
            // Try to parse as JSON, handling already-resolved variable bindings
            const customDataStr = typeof customData === "string" ? customData : JSON.stringify(customData);
            parsedCustomData = JSON.parse(customDataStr);
          } catch {
            parsedCustomData = { raw: customData };
          }
        }
        
        const metadata: Record<string, any> = {
          nodeId: node.id,
          timestamp: new Date().toISOString(),
        };
        
        // Include the resolved data if available
        if (resolvedData !== null && resolvedData !== undefined) {
          metadata.data = deepClone(resolvedData);
        }
        if (parsedCustomData !== null) {
          metadata.customData = parsedCustomData;
        }
        
        const flowId = context._flowProjectId;
        const executionId = context._executionId;
        const logDestination = destination || 'dashboard';
        
        let logId = null;
        
        // Only insert to DB if destination includes dashboard
        if ((logDestination === 'dashboard' || logDestination === 'both') && flowId && executionId) {
          const { data: logEntry, error: logError } = await supabase
            .from("flow_monitoring_logs")
            .insert({
              flow_id: flowId,
              execution_id: executionId,
              node_id: node.id,
              level: logLevel || "info",
              message: message || "Logger node executed",
              metadata,
            })
            .select("id")
            .single();
          
          if (logError) {
            console.error("Failed to insert log:", logError);
          } else {
            logId = logEntry?.id;
          }
        }
        
        return {
          success: true,
          output: { 
            success: true,
            logged: true, 
            logId, 
            message: message || "Logger node executed",
            destination: logDestination,
            data: resolvedData !== null && resolvedData !== undefined ? deepClone(resolvedData) : null,
            _debugLog: logDestination === 'debugger' || logDestination === 'both' ? {
              level: logLevel || 'info',
              message: message || 'Logger node executed',
              metadata
            } : null
          },
        };
      }
      
      case "data-table": {
        const operation = inputs.operation || 'get';
        const tableId = inputs.tableId;
        
        if (!tableId) return { success: false, error: "Data Table: tableId is required" };
        
        // Compose fieldMap.* into data — always prefer fieldMap over data
        {
          const fieldMapData: Record<string, any> = {};
          let hasFieldMap = false;
          for (const [key, value] of Object.entries(inputs)) {
            if (key.startsWith('fieldMap.') && value !== undefined && value !== '') {
              fieldMapData[key.substring('fieldMap.'.length)] = value;
              hasFieldMap = true;
            }
          }
          if (hasFieldMap) {
            inputs.data = JSON.stringify(fieldMapData);
          }
        }
        
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
        // Try to invoke a proxy edge function for this node type
        const proxyName = nodeType.includes("-") 
          ? `${nodeType.split("-")[0]}-proxy` 
          : `${nodeType}-proxy`;
        
        try {
          const { data, error } = await supabase.functions.invoke(proxyName, {
            body: { ...inputs, action: inputs.action || "execute" },
          });
          
          if (error) {
            const status = (error as any)?.context?.status ?? (error as any)?.status;
            if (status === 404) {
              return {
                success: false,
                error: `Proxy function "${proxyName}" not found. Node type "${nodeType}" is not implemented server-side.`,
              };
            }
            // Try to extract the actual error from the response body
            let actualError = error.message;
            try {
              const ctx = (error as any)?.context;
              if (ctx && typeof ctx.json === 'function') {
                const body = await ctx.json();
                if (body?.error) actualError = body.error;
              }
            } catch { /* use original message */ }

            // Clean up internal/technical prefixes for user-facing messages
            actualError = actualError
              .replace(/Edge Function returned a non-2xx status code/i, 'Request failed')
              .replace(/Mailchimp API error:\s*/i, '')
              .replace(/proxy error:\s*/i, '');

            return { success: false, error: `${nodeType}: ${actualError}` };
          }
          
          // Check if proxy returned an error in the response body
          if (data?.error) {
            return { success: false, error: `${nodeType}: ${data.error}` };
          }
          
          return { success: true, output: { ...data, success: true } };
        } catch (proxyErr: any) {
          return {
            success: false,
            error: `Failed to invoke ${proxyName}: ${proxyErr.message}`,
          };
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
