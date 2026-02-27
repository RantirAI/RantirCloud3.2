import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Generate 5-digit sequential numeric ID
function generateRecordId(existingRecords?: any[]): string {
  if (existingRecords && existingRecords.length > 0) {
    const numericIds = existingRecords
      .map(r => parseInt(r.id, 10))
      .filter(id => !isNaN(id) && id >= 10000 && id <= 99999);
    
    if (numericIds.length > 0) {
      return String(Math.max(...numericIds) + 1);
    }
  }
  // Random start between 10000-89999 for first record
  return String(Math.floor(Math.random() * 80000) + 10000);
}

interface ApiKeyValidation {
  key_id: string;
  user_id: string;
  database_id: string | null;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_valid: boolean;
}

interface QueryParams {
  filter?: Record<string, any>;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  cursor?: string;
  fields?: string[];
  expand?: string[];
}

// Parse query parameters for filtering and pagination
function parseQueryParams(url: URL): QueryParams {
  const params: QueryParams = {};
  
  // Parse filter parameters (e.g., filter[status]=active or filter[price][$gt]=100)
  const filter: Record<string, any> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("filter[")) {
      const match = key.match(/filter\[(\w+)\](?:\[(\$\w+)\])?/);
      if (match) {
        const field = match[1];
        const operator = match[2] || "$eq";
        if (!filter[field]) filter[field] = {};
        if (operator === "$eq" && typeof filter[field] !== "object") {
          filter[field] = value;
        } else {
          if (typeof filter[field] !== "object") filter[field] = {};
          filter[field][operator] = value;
        }
      }
    }
  }
  if (Object.keys(filter).length > 0) params.filter = filter;
  
  // Parse sort and order
  params.sort = url.searchParams.get("sort") || undefined;
  params.order = (url.searchParams.get("order") as "asc" | "desc") || "asc";
  
  // Parse pagination
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const cursor = url.searchParams.get("cursor");
  if (limit) params.limit = parseInt(limit);
  if (offset) params.offset = parseInt(offset);
  if (cursor) params.cursor = cursor;
  
  // Parse field selection
  const fields = url.searchParams.get("fields");
  if (fields) params.fields = fields.split(",").map(f => f.trim());
  
  // Parse expand (for related data)
  const expand = url.searchParams.get("expand");
  if (expand) params.expand = expand.split(",").map(e => e.trim());
  
  return params;
}

// Apply filters to records
function applyFilters(records: any[], filter: Record<string, any>): any[] {
  return records.filter(record => {
    for (const [field, condition] of Object.entries(filter)) {
      const value = record[field];
      
      if (typeof condition === "object" && condition !== null) {
        for (const [op, compareValue] of Object.entries(condition)) {
          switch (op) {
            case "$eq":
              if (value !== compareValue) return false;
              break;
            case "$ne":
              if (value === compareValue) return false;
              break;
            case "$gt":
              if (!(value > parseFloat(compareValue as string))) return false;
              break;
            case "$gte":
              if (!(value >= parseFloat(compareValue as string))) return false;
              break;
            case "$lt":
              if (!(value < parseFloat(compareValue as string))) return false;
              break;
            case "$lte":
              if (!(value <= parseFloat(compareValue as string))) return false;
              break;
            case "$contains":
              if (!String(value).toLowerCase().includes(String(compareValue).toLowerCase())) return false;
              break;
            case "$startsWith":
              if (!String(value).toLowerCase().startsWith(String(compareValue).toLowerCase())) return false;
              break;
            case "$endsWith":
              if (!String(value).toLowerCase().endsWith(String(compareValue).toLowerCase())) return false;
              break;
            case "$in":
              const inValues = Array.isArray(compareValue) ? compareValue : String(compareValue).split(",");
              if (!inValues.includes(value)) return false;
              break;
            case "$nin":
              const ninValues = Array.isArray(compareValue) ? compareValue : String(compareValue).split(",");
              if (ninValues.includes(value)) return false;
              break;
            case "$exists":
              const exists = value !== null && value !== undefined;
              if (compareValue === "true" && !exists) return false;
              if (compareValue === "false" && exists) return false;
              break;
          }
        }
      } else {
        // Simple equality check
        if (value !== condition) return false;
      }
    }
    return true;
  });
}

// Apply sorting to records
function applySorting(records: any[], sort?: string, order?: "asc" | "desc"): any[] {
  if (!sort) return records;
  
  return [...records].sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return order === "desc" ? -comparison : comparison;
  });
}

// Apply pagination
function applyPagination(records: any[], limit?: number, offset?: number): { data: any[]; hasMore: boolean } {
  const startIndex = offset || 0;
  const endIndex = limit ? startIndex + limit : records.length;
  const data = records.slice(startIndex, endIndex);
  const hasMore = endIndex < records.length;
  
  return { data, hasMore };
}

// Select specific fields
function selectFields(records: any[], fields?: string[]): any[] {
  if (!fields || fields.length === 0) return records;
  
  return records.map(record => {
    const selected: Record<string, any> = {};
    for (const field of fields) {
      if (record.hasOwnProperty(field)) {
        selected[field] = record[field];
      }
    }
    return selected;
  });
}

// Validate API key
async function validateApiKey(supabase: any, apiKey: string): Promise<ApiKeyValidation | null> {
  const { data, error } = await supabase.rpc("validate_api_key", { p_key: apiKey });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  const keyData = data[0];
  if (!keyData.is_valid) {
    return null;
  }
  
  return keyData;
}

// Check rate limit
async function checkRateLimit(
  supabase: any,
  keyId: string,
  limitPerMinute: number,
  limitPerDay: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const dayAgo = new Date(now.getTime() - 86400000);
  
  // Count requests in the last minute
  const { count: minuteCount } = await supabase
    .from("api_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyId)
    .gte("created_at", minuteAgo.toISOString());
  
  if ((minuteCount || 0) >= limitPerMinute) {
    return { allowed: false, retryAfter: 60 };
  }
  
  // Count requests in the last day
  const { count: dayCount } = await supabase
    .from("api_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyId)
    .gte("created_at", dayAgo.toISOString());
  
  if ((dayCount || 0) >= limitPerDay) {
    return { allowed: false, retryAfter: 3600 };
  }
  
  return { allowed: true };
}

// Log API usage
async function logApiUsage(
  supabase: any,
  keyId: string | null,
  userId: string | null,
  databaseId: string | null,
  tableId: string | null,
  method: string,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  requestBody: any,
  responseSizeBytes: number,
  ipAddress: string | null,
  userAgent: string | null,
  errorMessage: string | null
) {
  await supabase.from("api_usage_logs").insert({
    api_key_id: keyId,
    user_id: userId,
    database_id: databaseId,
    table_id: tableId,
    method,
    endpoint,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    request_body: requestBody,
    response_size_bytes: responseSizeBytes,
    ip_address: ipAddress,
    user_agent: userAgent,
    error_message: errorMessage,
  });
  
  // Update API key usage stats
  if (keyId) {
    await supabase.rpc("increment_api_key_usage", { p_key_id: keyId });
  }
}

// Trigger webhooks
async function triggerWebhooks(
  supabase: any,
  databaseId: string,
  tableId: string,
  eventType: string,
  payload: any
) {
  // Get active webhooks for this table/database
  const { data: webhooks } = await supabase
    .from("database_webhooks")
    .select("*")
    .eq("is_active", true)
    .or(`table_id.eq.${tableId},and(database_id.eq.${databaseId},table_id.is.null)`)
    .contains("events", [eventType]);
  
  if (!webhooks || webhooks.length === 0) return;
  
  for (const webhook of webhooks) {
    const startTime = Date.now();
    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    
    try {
      // Create signature if secret is set
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(webhook.headers || {}),
      };
      
      if (webhook.secret) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(webhook.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, data);
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
        headers["X-Webhook-Signature"] = `sha256=${signatureHex}`;
      }
      
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });
      
      responseStatus = response.status;
      responseBody = await response.text();
      success = response.ok;
    } catch (error) {
      errorMessage = error.message;
    }
    
    const responseTimeMs = Date.now() - startTime;
    
    // Log webhook delivery
    await supabase.from("webhook_delivery_logs").insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: responseStatus,
      response_body: responseBody,
      response_time_ms: responseTimeMs,
      success,
      error_message: errorMessage,
    });
    
    // Update webhook stats
    await supabase
      .from("database_webhooks")
      .update({
        last_triggered_at: new Date().toISOString(),
        total_deliveries: webhook.total_deliveries + 1,
        failed_deliveries: success ? webhook.failed_deliveries : webhook.failed_deliveries + 1,
      })
      .eq("id", webhook.id);
  }
}

// Response helpers
function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

function errorResponse(code: string, message: string, status = 400, details?: any) {
  return jsonResponse({ success: false, error: { code, message, details } }, status);
}

function successResponse(data: any, meta?: any) {
  return jsonResponse({ success: true, data, ...(meta && { meta }) });
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/database-api", "").split("/").filter(Boolean);
  const method = req.method;
  const queryParams = parseQueryParams(url);
  
  // Get client info
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
  const userAgent = req.headers.get("user-agent");
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  let keyValidation: ApiKeyValidation | null = null;
  let userId: string | null = null;
  let requestBody: any = null;
  
  try {
    // Parse request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        requestBody = await req.json();
      } catch {
        requestBody = null;
      }
    }
    
    // Authentication
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");
    
    if (apiKey) {
      // API Key authentication
      keyValidation = await validateApiKey(supabase, apiKey);
      if (!keyValidation) {
        return errorResponse("INVALID_API_KEY", "The provided API key is invalid or expired", 401);
      }
      userId = keyValidation.user_id;
      
      // Check rate limit
      const rateLimit = await checkRateLimit(
        supabase,
        keyValidation.key_id,
        keyValidation.rate_limit_per_minute,
        keyValidation.rate_limit_per_day
      );
      
      if (!rateLimit.allowed) {
        return errorResponse(
          "RATE_LIMIT_EXCEEDED",
          "Rate limit exceeded. Please try again later.",
          429,
          { retryAfter: rateLimit.retryAfter }
        );
      }
    } else if (authHeader?.startsWith("Bearer ")) {
      // JWT authentication
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return errorResponse("INVALID_TOKEN", "Invalid or expired authentication token", 401);
      }
      userId = user.id;
    } else {
      return errorResponse("UNAUTHORIZED", "Authentication required. Provide X-API-Key or Authorization header.", 401);
    }
    
    // Route handling
    const resource = pathParts[0];
    const resourceId = pathParts[1];
    const subResource = pathParts[2];
    const subResourceId = pathParts[3];
    
    // Helper to check scope
    const hasScope = (scope: string) => {
      if (!keyValidation) return true; // JWT auth has all scopes
      return keyValidation.scopes.includes(scope) || keyValidation.scopes.includes("admin");
    };
    
    // ===== DATABASES =====
    if (resource === "databases") {
      if (!resourceId) {
        // GET /databases - List user's databases
        if (method === "GET") {
          if (!hasScope("read")) {
            return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
          }
          
          let query = supabase.from("databases").select("*").eq("user_id", userId);
          
          // If API key is database-specific, only return that database
          if (keyValidation?.database_id) {
            query = query.eq("id", keyValidation.database_id);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          return successResponse(data, { total: data.length });
        }
        
        // POST /databases - Create a new database
        if (method === "POST") {
          if (!hasScope("write")) {
            return errorResponse("FORBIDDEN", "API key does not have 'write' scope", 403);
          }
          
          const { name, description, color } = requestBody || {};
          
          if (!name) {
            return errorResponse("VALIDATION_ERROR", "Database name is required", 400);
          }
          
          const { data, error } = await supabase
            .from("databases")
            .insert({ name, description, color, user_id: userId })
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
      } else {
        // GET /databases/:id - Get a specific database
        if (method === "GET" && !subResource) {
          if (!hasScope("read")) {
            return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
          }
          
          // Check database access
          if (keyValidation?.database_id && keyValidation.database_id !== resourceId) {
            return errorResponse("FORBIDDEN", "API key does not have access to this database", 403);
          }
          
          const { data, error } = await supabase
            .from("databases")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            return errorResponse("NOT_FOUND", "Database not found", 404);
          }
          
          return successResponse(data);
        }
        
        // PUT /databases/:id - Update a database
        if (method === "PUT" && !subResource) {
          if (!hasScope("write")) {
            return errorResponse("FORBIDDEN", "API key does not have 'write' scope", 403);
          }
          
          if (keyValidation?.database_id && keyValidation.database_id !== resourceId) {
            return errorResponse("FORBIDDEN", "API key does not have access to this database", 403);
          }
          
          const { name, description, color } = requestBody || {};
          
          const { data, error } = await supabase
            .from("databases")
            .update({ name, description, color })
            .eq("id", resourceId)
            .eq("user_id", userId)
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
        
        // DELETE /databases/:id - Delete a database
        if (method === "DELETE" && !subResource) {
          if (!hasScope("delete")) {
            return errorResponse("FORBIDDEN", "API key does not have 'delete' scope", 403);
          }
          
          if (keyValidation?.database_id && keyValidation.database_id !== resourceId) {
            return errorResponse("FORBIDDEN", "API key does not have access to this database", 403);
          }
          
          const { error } = await supabase
            .from("databases")
            .delete()
            .eq("id", resourceId)
            .eq("user_id", userId);
          
          if (error) throw error;
          
          return successResponse({ deleted: true });
        }
      }
    }
    
    // ===== TABLES =====
    if (resource === "tables") {
      if (!resourceId) {
        // GET /tables - List all tables
        if (method === "GET") {
          if (!hasScope("read")) {
            return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
          }
          
          let query = supabase.from("table_projects").select("*").eq("user_id", userId);
          
          // Filter by database if specified
          const databaseId = url.searchParams.get("database_id");
          if (databaseId) {
            query = query.eq("database_id", databaseId);
          }
          
          // If API key is database-specific
          if (keyValidation?.database_id) {
            query = query.eq("database_id", keyValidation.database_id);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          return successResponse(data, { total: data.length });
        }
        
        // POST /tables - Create a new table
        if (method === "POST") {
          if (!hasScope("schema")) {
            return errorResponse("FORBIDDEN", "API key does not have 'schema' scope", 403);
          }
          
          const { name, description, database_id, schema } = requestBody || {};
          
          if (!name) {
            return errorResponse("VALIDATION_ERROR", "Table name is required", 400);
          }
          
          if (keyValidation?.database_id && database_id && keyValidation.database_id !== database_id) {
            return errorResponse("FORBIDDEN", "API key does not have access to this database", 403);
          }
          
          const { data, error } = await supabase
            .from("table_projects")
            .insert({
              name,
              description,
              database_id: database_id || keyValidation?.database_id,
              user_id: userId,
              schema: schema || { fields: [] },
              records: [],
            })
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
      } else {
        // GET /tables/:id - Get a specific table
        if (method === "GET" && !subResource) {
          if (!hasScope("read")) {
            return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
          }
          
          const { data, error } = await supabase
            .from("table_projects")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            return errorResponse("NOT_FOUND", "Table not found", 404);
          }
          
          if (keyValidation?.database_id && data.database_id !== keyValidation.database_id) {
            return errorResponse("FORBIDDEN", "API key does not have access to this table", 403);
          }
          
          return successResponse(data);
        }
        
        // PUT /tables/:id - Update a table
        if (method === "PUT" && !subResource) {
          if (!hasScope("schema")) {
            return errorResponse("FORBIDDEN", "API key does not have 'schema' scope", 403);
          }
          
          const { name, description, schema } = requestBody || {};
          
          const { data, error } = await supabase
            .from("table_projects")
            .update({ name, description, schema })
            .eq("id", resourceId)
            .eq("user_id", userId)
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
        
        // DELETE /tables/:id - Delete a table
        if (method === "DELETE" && !subResource) {
          if (!hasScope("delete")) {
            return errorResponse("FORBIDDEN", "API key does not have 'delete' scope", 403);
          }
          
          const { error } = await supabase
            .from("table_projects")
            .delete()
            .eq("id", resourceId)
            .eq("user_id", userId);
          
          if (error) throw error;
          
          return successResponse({ deleted: true });
        }
        
        // GET /tables/:id/schema - Get table schema
        if (method === "GET" && subResource === "schema") {
          if (!hasScope("read")) {
            return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
          }
          
          const { data, error } = await supabase
            .from("table_projects")
            .select("schema")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            return errorResponse("NOT_FOUND", "Table not found", 404);
          }
          
          return successResponse(data.schema);
        }
        
        // PUT /tables/:id/schema - Update table schema
        if (method === "PUT" && subResource === "schema") {
          if (!hasScope("schema")) {
            return errorResponse("FORBIDDEN", "API key does not have 'schema' scope", 403);
          }
          
          const { fields } = requestBody || {};
          
          if (!fields || !Array.isArray(fields)) {
            return errorResponse("VALIDATION_ERROR", "Fields array is required", 400);
          }
          
          const { data, error } = await supabase
            .from("table_projects")
            .update({ schema: { fields } })
            .eq("id", resourceId)
            .eq("user_id", userId)
            .select("schema")
            .single();
          
          if (error) throw error;
          
          return successResponse(data.schema);
        }
        
        // ===== RECORDS =====
        if (subResource === "records") {
          // Get table first
          const { data: table, error: tableError } = await supabase
            .from("table_projects")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (tableError) throw tableError;
          if (!table) {
            return errorResponse("NOT_FOUND", "Table not found", 404);
          }
          
          if (keyValidation?.database_id && table.database_id !== keyValidation.database_id) {
            return errorResponse("FORBIDDEN", "API key does not have access to this table", 403);
          }
          
          const records = table.records || [];
          
          if (!subResourceId) {
            // GET /tables/:id/records - List records
            if (method === "GET") {
              if (!hasScope("read")) {
                return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
              }
              
              let filteredRecords = records;
              
              // Apply filters
              if (queryParams.filter) {
                filteredRecords = applyFilters(filteredRecords, queryParams.filter);
              }
              
              // Apply sorting
              filteredRecords = applySorting(filteredRecords, queryParams.sort, queryParams.order);
              
              // Get total before pagination
              const total = filteredRecords.length;
              
              // Apply pagination
              const { data: paginatedData, hasMore } = applyPagination(
                filteredRecords,
                queryParams.limit || 25,
                queryParams.offset || 0
              );
              
              // Select fields
              const selectedData = selectFields(paginatedData, queryParams.fields);
              
              return successResponse(selectedData, {
                total,
                limit: queryParams.limit || 25,
                offset: queryParams.offset || 0,
                hasMore,
              });
            }
            
            // POST /tables/:id/records - Create record(s)
            if (method === "POST") {
              if (!hasScope("write")) {
                return errorResponse("FORBIDDEN", "API key does not have 'write' scope", 403);
              }
              
              const newRecords = Array.isArray(requestBody) ? requestBody : [requestBody];
              const createdRecords: any[] = [];
              
              for (const record of newRecords) {
                const newRecord = {
                  id: generateRecordId(record),
                  ...record,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                // Auto-populate timestamp fields from schema
                if (table.schema?.fields) {
                  for (const field of (table.schema as any).fields) {
                    if (field.type === 'timestamp') {
                      const key = field.id || field.name;
                      if (!newRecord[key] && !newRecord[field.name]) {
                        newRecord[field.name] = new Date().toISOString();
                      }
                    }
                  }
                }
                records.push(newRecord);
                createdRecords.push(newRecord);
              }
              
              const { error: updateError } = await supabase
                .from("table_projects")
                .update({ records })
                .eq("id", resourceId);
              
              if (updateError) throw updateError;
              
              // Trigger webhooks
              for (const record of createdRecords) {
                await triggerWebhooks(supabase, table.database_id, resourceId, "record.created", record);
              }
              
              return successResponse(
                createdRecords.length === 1 ? createdRecords[0] : createdRecords,
                { created: createdRecords.length }
              );
            }
            
            // DELETE /tables/:id/records - Bulk delete
            if (method === "DELETE") {
              if (!hasScope("delete")) {
                return errorResponse("FORBIDDEN", "API key does not have 'delete' scope", 403);
              }
              
              const { ids } = requestBody || {};
              
              if (!ids || !Array.isArray(ids)) {
                return errorResponse("VALIDATION_ERROR", "Array of record IDs is required", 400);
              }
              
              const deletedRecords = records.filter((r: any) => ids.includes(r.id));
              const remainingRecords = records.filter((r: any) => !ids.includes(r.id));
              
              const { error: updateError } = await supabase
                .from("table_projects")
                .update({ records: remainingRecords })
                .eq("id", resourceId);
              
              if (updateError) throw updateError;
              
              // Trigger webhooks
              for (const record of deletedRecords) {
                await triggerWebhooks(supabase, table.database_id, resourceId, "record.deleted", record);
              }
              
              return successResponse({ deleted: deletedRecords.length });
            }
          } else {
            // GET /tables/:id/records/:recordId - Get single record
            if (method === "GET") {
              if (!hasScope("read")) {
                return errorResponse("FORBIDDEN", "API key does not have 'read' scope", 403);
              }
              
              const record = records.find((r: any) => r.id === subResourceId);
              
              if (!record) {
                return errorResponse("NOT_FOUND", "Record not found", 404);
              }
              
              return successResponse(selectFields([record], queryParams.fields)[0]);
            }
            
            // PUT /tables/:id/records/:recordId - Update record
            if (method === "PUT" || method === "PATCH") {
              if (!hasScope("write")) {
                return errorResponse("FORBIDDEN", "API key does not have 'write' scope", 403);
              }
              
              const recordIndex = records.findIndex((r: any) => r.id === subResourceId);
              
              if (recordIndex === -1) {
                return errorResponse("NOT_FOUND", "Record not found", 404);
              }
              
              const oldRecord = records[recordIndex];
              const updatedRecord = {
                ...oldRecord,
                ...requestBody,
                id: subResourceId, // Preserve ID
                updatedAt: new Date().toISOString(),
              };
              
              records[recordIndex] = updatedRecord;
              
              const { error: updateError } = await supabase
                .from("table_projects")
                .update({ records })
                .eq("id", resourceId);
              
              if (updateError) throw updateError;
              
              // Trigger webhooks
              await triggerWebhooks(supabase, table.database_id, resourceId, "record.updated", {
                old: oldRecord,
                new: updatedRecord,
              });
              
              return successResponse(updatedRecord);
            }
            
            // DELETE /tables/:id/records/:recordId - Delete record
            if (method === "DELETE") {
              if (!hasScope("delete")) {
                return errorResponse("FORBIDDEN", "API key does not have 'delete' scope", 403);
              }
              
              const record = records.find((r: any) => r.id === subResourceId);
              
              if (!record) {
                return errorResponse("NOT_FOUND", "Record not found", 404);
              }
              
              const updatedRecords = records.filter((r: any) => r.id !== subResourceId);
              
              const { error: updateError } = await supabase
                .from("table_projects")
                .update({ records: updatedRecords })
                .eq("id", resourceId);
              
              if (updateError) throw updateError;
              
              // Trigger webhooks
              await triggerWebhooks(supabase, table.database_id, resourceId, "record.deleted", record);
              
              return successResponse({ deleted: true });
            }
          }
        }
      }
    }
    
    // ===== API KEYS =====
    if (resource === "api-keys") {
      // Only allow JWT auth for API key management (not API key auth)
      if (keyValidation) {
        return errorResponse("FORBIDDEN", "API key management requires JWT authentication", 403);
      }
      
      if (!resourceId) {
        // GET /api-keys - List API keys
        if (method === "GET") {
          const databaseId = url.searchParams.get("database_id");
          
          let query = supabase.from("database_api_keys").select("*").eq("user_id", userId);
          
          if (databaseId) {
            query = query.eq("database_id", databaseId);
          }
          
          const { data, error } = await query.order("created_at", { ascending: false });
          
          if (error) throw error;
          
          // Remove key_hash from response
          const sanitizedData = data.map(({ key_hash, ...rest }: any) => rest);
          
          return successResponse(sanitizedData);
        }
        
        // POST /api-keys - Create API key
        if (method === "POST") {
          const { name, database_id, scopes, rate_limit_per_minute, rate_limit_per_day, expires_at } = requestBody || {};
          
          if (!name) {
            return errorResponse("VALIDATION_ERROR", "API key name is required", 400);
          }
          
          const { data, error } = await supabase.rpc("generate_api_key", {
            p_user_id: userId,
            p_database_id: database_id || null,
            p_name: name,
            p_scopes: scopes || ["read"],
            p_rate_limit_per_minute: rate_limit_per_minute || 60,
            p_rate_limit_per_day: rate_limit_per_day || 10000,
            p_expires_at: expires_at || null,
          });
          
          if (error) throw error;
          
          return successResponse(data);
        }
      } else {
        // GET /api-keys/:id - Get API key details
        if (method === "GET") {
          const { data, error } = await supabase
            .from("database_api_keys")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            return errorResponse("NOT_FOUND", "API key not found", 404);
          }
          
          const { key_hash, ...sanitized } = data;
          return successResponse(sanitized);
        }
        
        // PUT /api-keys/:id - Update API key
        if (method === "PUT") {
          const { name, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at } = requestBody || {};
          
          const { data, error } = await supabase
            .from("database_api_keys")
            .update({
              name,
              scopes,
              rate_limit_per_minute,
              rate_limit_per_day,
              is_active,
              expires_at,
            })
            .eq("id", resourceId)
            .eq("user_id", userId)
            .select()
            .single();
          
          if (error) throw error;
          
          const { key_hash, ...sanitized } = data;
          return successResponse(sanitized);
        }
        
        // DELETE /api-keys/:id - Delete API key
        if (method === "DELETE") {
          const { error } = await supabase
            .from("database_api_keys")
            .delete()
            .eq("id", resourceId)
            .eq("user_id", userId);
          
          if (error) throw error;
          
          return successResponse({ deleted: true });
        }
      }
    }
    
    // ===== WEBHOOKS =====
    if (resource === "webhooks") {
      if (!resourceId) {
        // GET /webhooks - List webhooks
        if (method === "GET") {
          const databaseId = url.searchParams.get("database_id");
          const tableId = url.searchParams.get("table_id");
          
          let query = supabase.from("database_webhooks").select("*").eq("user_id", userId);
          
          if (databaseId) query = query.eq("database_id", databaseId);
          if (tableId) query = query.eq("table_id", tableId);
          
          const { data, error } = await query.order("created_at", { ascending: false });
          
          if (error) throw error;
          
          return successResponse(data);
        }
        
        // POST /webhooks - Create webhook
        if (method === "POST") {
          const { name, url: webhookUrl, database_id, table_id, events, headers, secret } = requestBody || {};
          
          if (!name || !webhookUrl) {
            return errorResponse("VALIDATION_ERROR", "Webhook name and URL are required", 400);
          }
          
          const { data, error } = await supabase
            .from("database_webhooks")
            .insert({
              user_id: userId,
              name,
              url: webhookUrl,
              database_id,
              table_id,
              events: events || ["record.created"],
              headers: headers || {},
              secret,
            })
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
      } else {
        // GET /webhooks/:id - Get webhook details
        if (method === "GET" && !subResource) {
          const { data, error } = await supabase
            .from("database_webhooks")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            return errorResponse("NOT_FOUND", "Webhook not found", 404);
          }
          
          return successResponse(data);
        }
        
        // PUT /webhooks/:id - Update webhook
        if (method === "PUT") {
          const { name, url: webhookUrl, events, headers, secret, is_active } = requestBody || {};
          
          const { data, error } = await supabase
            .from("database_webhooks")
            .update({ name, url: webhookUrl, events, headers, secret, is_active })
            .eq("id", resourceId)
            .eq("user_id", userId)
            .select()
            .single();
          
          if (error) throw error;
          
          return successResponse(data);
        }
        
        // DELETE /webhooks/:id - Delete webhook
        if (method === "DELETE" && !subResource) {
          const { error } = await supabase
            .from("database_webhooks")
            .delete()
            .eq("id", resourceId)
            .eq("user_id", userId);
          
          if (error) throw error;
          
          return successResponse({ deleted: true });
        }
        
        // POST /webhooks/:id/test - Test webhook
        if (method === "POST" && subResource === "test") {
          const { data: webhook, error: webhookError } = await supabase
            .from("database_webhooks")
            .select("*")
            .eq("id", resourceId)
            .eq("user_id", userId)
            .maybeSingle();
          
          if (webhookError) throw webhookError;
          if (!webhook) {
            return errorResponse("NOT_FOUND", "Webhook not found", 404);
          }
          
          // Send test webhook
          const testPayload = {
            event: "test",
            timestamp: new Date().toISOString(),
            data: { message: "This is a test webhook delivery" },
          };
          
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...(webhook.headers || {}),
            };
            
            const response = await fetch(webhook.url, {
              method: "POST",
              headers,
              body: JSON.stringify(testPayload),
            });
            
            return successResponse({
              success: response.ok,
              status: response.status,
              statusText: response.statusText,
            });
          } catch (error) {
            return successResponse({
              success: false,
              error: error.message,
            });
          }
        }
        
        // GET /webhooks/:id/deliveries - Get delivery history
        if (method === "GET" && subResource === "deliveries") {
          const { data, error } = await supabase
            .from("webhook_delivery_logs")
            .select("*")
            .eq("webhook_id", resourceId)
            .order("created_at", { ascending: false })
            .limit(queryParams.limit || 50);
          
          if (error) throw error;
          
          return successResponse(data);
        }
      }
    }
    
    // ===== USAGE STATS =====
    if (resource === "usage") {
      if (method === "GET") {
        const databaseId = url.searchParams.get("database_id");
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        
        let query = supabase.from("api_usage_logs").select("*").eq("user_id", userId);
        
        if (databaseId) query = query.eq("database_id", databaseId);
        if (startDate) query = query.gte("created_at", startDate);
        if (endDate) query = query.lte("created_at", endDate);
        
        const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);
        
        if (error) throw error;
        
        // Calculate stats
        const totalRequests = data.length;
        const successfulRequests = data.filter((l: any) => l.status_code >= 200 && l.status_code < 300).length;
        const avgResponseTime = data.length > 0
          ? Math.round(data.reduce((sum: number, l: any) => sum + (l.response_time_ms || 0), 0) / data.length)
          : 0;
        
        return successResponse({
          totalRequests,
          successfulRequests,
          errorRequests: totalRequests - successfulRequests,
          avgResponseTimeMs: avgResponseTime,
          logs: data.slice(0, 100),
        });
      }
    }
    
    // Not found
    return errorResponse("NOT_FOUND", `Endpoint not found: ${method} ${url.pathname}`, 404);
    
  } catch (error) {
    console.error("Database API error:", error);
    
    const responseTimeMs = Date.now() - startTime;
    
    // Log error
    await logApiUsage(
      supabase,
      keyValidation?.key_id || null,
      userId,
      null,
      null,
      method,
      url.pathname,
      500,
      responseTimeMs,
      requestBody,
      0,
      ipAddress,
      userAgent,
      error.message
    );
    
    return errorResponse("INTERNAL_ERROR", error.message || "An unexpected error occurred", 500);
  }
});
