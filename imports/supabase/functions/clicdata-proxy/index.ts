import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ClicData API base URL
const BASE_URL = 'https://api.clicdata.com';

// Cache for discovered supported versions per API key
const supportedVersionsCache = new Map<string, { 
  versions: string[], 
  recommendedVersion: string | null, 
  timestamp: number 
}>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Extract supported versions from response headers
function extractSupportedVersions(response: Response): string[] {
  const supportedHeader = response.headers.get('api-supported-versions');
  if (supportedHeader) {
    return supportedHeader.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
}

// Parse error response to get version info
async function parseVersionErrorResponse(response: Response): Promise<{ 
  errorCode?: string, 
  message?: string, 
  versions?: string[] 
}> {
  try {
    const text = await response.clone().text();
    try {
      const json = JSON.parse(text);
      return {
        errorCode: json.ErrorCode || json.errorCode || json.code || json.Code,
        message: json.ErrorDescription || json.Message || json.message || json.error,
        versions: json.SupportedVersions || json.supportedVersions || []
      };
    } catch {
      return { message: text.substring(0, 200) };
    }
  } catch {
    return {};
  }
}

// Discover supported versions by probing the API
async function discoverSupportedVersions(apiKey: string): Promise<{
  success: boolean;
  supportedVersions: string[];
  recommendedVersion: string | null;
  diagnostics?: {
    endpoint: string;
    statusCode: number;
    errorCode?: string;
    errorMessage?: string;
    headers: Record<string, string>;
  };
}> {
  const cacheKey = apiKey.substring(0, 16);
  const cached = supportedVersionsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`ClicData: Using cached versions for key ${cacheKey}...`);
    return {
      success: cached.versions.length > 0 || cached.recommendedVersion === null,
      supportedVersions: cached.versions,
      recommendedVersion: cached.recommendedVersion
    };
  }

  const testEndpoint = `${BASE_URL}/data`;
  const diagnostics: any = {
    endpoint: testEndpoint,
    headers: {}
  };

  try {
    console.log(`ClicData: Probing ${testEndpoint} for version discovery...`);
    
    // Call without api_version to trigger version error and get supported versions
    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'CLICDATA-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    diagnostics.statusCode = response.status;
    
    // Capture ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key.toLowerCase()] = value;
    });
    console.log(`ClicData: Response headers:`, JSON.stringify(allHeaders));
    
    // Capture relevant headers
    const relevantHeaders = ['api-supported-versions', 'api-deprecated-versions', 'x-api-version'];
    relevantHeaders.forEach(h => {
      const val = response.headers.get(h);
      if (val) diagnostics.headers[h] = val;
    });

    // Get raw response text for debugging
    const rawText = await response.text();
    console.log(`ClicData: Raw response (first 500 chars):`, rawText.substring(0, 500));

    // Extract supported versions from headers
    let supportedVersions = extractSupportedVersions(response);
    
    // Try to parse JSON response
    let jsonData: any = null;
    try {
      jsonData = JSON.parse(rawText);
    } catch {
      // Not JSON
    }

    // If no header, try to get from error response body
    if (supportedVersions.length === 0 && jsonData) {
      // Check various possible version fields (handle nested error structure too)
      const versionsSource = jsonData.SupportedVersions || jsonData.supportedVersions || 
                            jsonData.error?.SupportedVersions || jsonData.error?.supportedVersions;
      if (versionsSource && Array.isArray(versionsSource)) {
        supportedVersions = versionsSource;
      }
      
      // Handle nested error structure: {"error":{"code":"APIVersionRequired","description":"..."}}
      diagnostics.errorCode = jsonData.ErrorCode || jsonData.errorCode || jsonData.code || 
                              jsonData.error?.code || jsonData.error?.Code;
      diagnostics.errorMessage = jsonData.ErrorDescription || jsonData.Message || jsonData.message || 
                                 jsonData.description || jsonData.error?.description || jsonData.error?.Description;
    }

    // If we found supported versions, cache and return
    if (supportedVersions.length > 0) {
      // Sort versions descending (newest first)
      supportedVersions.sort((a, b) => {
        const parseVersion = (v: string) => {
          const parts = v.split('.');
          return parseFloat(parts[0]) * 100 + parseFloat(parts[1] || '0');
        };
        return parseVersion(b) - parseVersion(a);
      });

      const recommendedVersion = supportedVersions[0];
      
      supportedVersionsCache.set(cacheKey, {
        versions: supportedVersions,
        recommendedVersion,
        timestamp: Date.now()
      });

      console.log(`ClicData: Discovered versions: ${supportedVersions.join(', ')}, recommended: ${recommendedVersion}`);
      
      return {
        success: true,
        supportedVersions,
        recommendedVersion
      };
    }

    // If response is 200 but contains version error info, extract it
    if (response.status === 200 && jsonData) {
      // Handle nested error structure: {"error":{"code":"APIVersionRequired"}}
      const errorCode = jsonData.ErrorCode || jsonData.errorCode || jsonData.error?.code || jsonData.error?.Code;
      const errorDesc = jsonData.ErrorDescription || jsonData.description || jsonData.error?.description;
      
      if (errorCode === 'APIVersionRequired' || errorCode === 'InvalidVersion') {
        // The API requires a version - this is expected
        // We need to try known versions since the API doesn't tell us which ones are supported
        console.log(`ClicData: API returned 200 with version error: ${errorCode}`);
        
        // Try common versions to find one that works
        const commonVersions = ['2025.4', '2025.3', '2025.2', '2025.1', '2024.4', '2024.3', '2024.2', '2024.1', '2023.4', '2023.3', '2023.2', '2023.1'];
        
        for (const testVersion of commonVersions) {
          try {
            console.log(`ClicData: Testing version ${testVersion}...`);
            const testResponse = await fetch(`${BASE_URL}/data?api_version=${testVersion}`, {
              method: 'GET',
              headers: {
                'CLICDATA-API-KEY': apiKey,
                'Accept': 'application/json',
              },
            });
            
            const testText = await testResponse.text();
            console.log(`ClicData: Version ${testVersion} response (first 200): ${testText.substring(0, 200)}`);
            
            let testJson: any = null;
            try {
              testJson = JSON.parse(testText);
            } catch {}
            
            // Check if this version worked (no APIVersionRequired/InvalidVersion error)
            const testErrorCode = testJson?.error?.code || testJson?.ErrorCode || testJson?.errorCode;
            console.log(`ClicData: Version ${testVersion} error code: ${testErrorCode}`);
            
            if (!testErrorCode || (testErrorCode !== 'APIVersionRequired' && testErrorCode !== 'InvalidVersion')) {
              console.log(`ClicData: Found working version: ${testVersion}`);
              supportedVersionsCache.set(cacheKey, {
                versions: [testVersion],
                recommendedVersion: testVersion,
                timestamp: Date.now()
              });
              return {
                success: true,
                supportedVersions: [testVersion],
                recommendedVersion: testVersion
              };
            }
          } catch (err) {
            console.log(`ClicData: Error testing version ${testVersion}:`, err);
          }
        }
        
        // No versions worked - return error with instruction
        return {
          success: false,
          supportedVersions: [],
          recommendedVersion: null,
          diagnostics: {
            ...diagnostics,
            errorCode,
            errorMessage: errorDesc || 'API version is required. Please enter your API version (e.g., 2024.1)',
            rawResponse: rawText.substring(0, 300)
          }
        };
      }
      
      // Check if response has data - that means no version is needed for this tenant
      if (Array.isArray(jsonData) || (jsonData.data || jsonData.Data)) {
        console.log(`ClicData: API responded 200 with data - version not required`);
        supportedVersionsCache.set(cacheKey, {
          versions: [],
          recommendedVersion: null,
          timestamp: Date.now()
        });
        return {
          success: true,
          supportedVersions: [],
          recommendedVersion: null
        };
      }
    }

    // If 401/403, API key is invalid
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        supportedVersions: [],
        recommendedVersion: null,
        diagnostics: {
          ...diagnostics,
          errorMessage: 'Invalid or expired API key. Please check your ClicData API key.'
        }
      };
    }
    
    // For other error statuses, return diagnostics
    if (!response.ok) {
      return {
        success: false,
        supportedVersions: [],
        recommendedVersion: null,
        diagnostics: {
          ...diagnostics,
          errorMessage: diagnostics.errorMessage || `API returned status ${response.status}`,
          rawResponse: rawText.substring(0, 300)
        }
      };
    }

  } catch (error) {
    console.error(`ClicData: Error probing for versions:`, error);
    diagnostics.errorMessage = `Network error: ${error.message}`;
  }

  // Discovery failed - return diagnostics for UI
  console.log(`ClicData: Version discovery failed. Diagnostics:`, diagnostics);
  return {
    success: false,
    supportedVersions: [],
    recommendedVersion: null,
    diagnostics
  };
}

// Make authenticated request to ClicData
async function fetchClicData(
  endpoint: string,
  apiKey: string,
  apiVersion: string | null,
  method: string = 'GET',
  body?: string
): Promise<Response> {
  let url = `${BASE_URL}${endpoint}`;
  
  // Add api_version as query parameter if provided
  if (apiVersion) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api_version=${apiVersion}`;
  }

  console.log(`ClicData: ${method} ${url} (version: ${apiVersion || 'none'})`);

  const headers: Record<string, string> = {
    'CLICDATA-API-KEY': apiKey,
    'Accept': 'application/json',
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return await fetch(url, {
    method,
    headers,
    body,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, apiKey, apiVersion: userApiVersion, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ClicData API key is required',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle version discovery action (Webflow-like pattern)
    if (action === 'discoverVersions') {
      const result = await discoverSupportedVersions(apiKey);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For all other actions, first ensure we have version info
    const versionInfo = await discoverSupportedVersions(apiKey);
    
    // Determine which version to use
    let effectiveVersion: string | null = userApiVersion || null;
    
    // If no user version and we have a recommended version, use it
    if (!effectiveVersion && versionInfo.recommendedVersion) {
      effectiveVersion = versionInfo.recommendedVersion;
      console.log(`ClicData: Using auto-discovered version: ${effectiveVersion}`);
    }

    // If discovery failed and no user version, return helpful error
    if (!versionInfo.success && !effectiveVersion) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not auto-detect supported API versions for this ClicData account.',
          diagnostics: versionInfo.diagnostics,
          suggestion: 'Please enter an API version manually (e.g., 2024.1) or verify your API key is correct.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user provided a version, validate it against supported versions (if we have them)
    if (userApiVersion && versionInfo.supportedVersions.length > 0) {
      // Normalize: 2022.1 <-> 2022.01
      const normalizeVersion = (v: string) => {
        const match = v.match(/^(\d{4})\.(\d{1,2})$/);
        if (match) {
          return `${match[1]}.${parseInt(match[2], 10)}`;
        }
        return v;
      };
      
      const normalizedInput = normalizeVersion(userApiVersion);
      const isSupported = versionInfo.supportedVersions.some(v => 
        normalizeVersion(v) === normalizedInput
      );
      
      if (!isSupported) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Version "${userApiVersion}" is not supported by this ClicData account.`,
            supportedVersions: versionInfo.supportedVersions,
            recommendedVersion: versionInfo.recommendedVersion,
            suggestion: `Use one of: ${versionInfo.supportedVersions.join(', ')}`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let endpoint = '';
    let method = 'GET';
    let body: string | undefined;

    switch (action) {
      case 'listData':
      case 'list_data':
        endpoint = '/data';
        break;

      case 'getData':
      case 'get_data':
        const tableId = params.dataSetId || params.tableId;
        endpoint = `/data/${tableId}`;
        const getDataParams = new URLSearchParams();
        if (params.limit) getDataParams.append('limit', String(params.limit));
        if (params.offset) getDataParams.append('offset', String(params.offset));
        const getDataQuery = getDataParams.toString();
        if (getDataQuery) endpoint += `?${getDataQuery}`;
        break;

      case 'insertRow':
        const insertTableId = params.dataSetId || params.tableId;
        endpoint = `/data/${insertTableId}`;
        method = 'POST';
        const rowData = typeof params.rowData === 'string' ? JSON.parse(params.rowData) : params.rowData;
        
        if (rowData && typeof rowData === 'object' && !Array.isArray(rowData)) {
          const rowArray = Object.entries(rowData).map(([column, value]) => ({
            column,
            value,
          }));
          body = JSON.stringify({ data: [rowArray] });
        } else if (params.data) {
          body = JSON.stringify({ data: params.data });
        } else {
          body = JSON.stringify({ rows: [rowData] });
        }
        break;

      case 'deleteData':
      case 'delete_data':
        const deleteTableId = params.dataSetId || params.tableId;
        endpoint = `/data/${deleteTableId}`;
        method = 'DELETE';
        if (params.filter) {
          const filterData = typeof params.filter === 'string' ? JSON.parse(params.filter) : params.filter;
          body = JSON.stringify(filterData);
        }
        break;

      case 'refreshTable':
      case 'refresh_data_source':
        const refreshId = params.dataSourceId || params.tableId;
        endpoint = `/datasource/${refreshId}/refresh`;
        method = 'POST';
        if (params.waitForCompletion) {
          endpoint += '?wait=true';
        }
        break;

      case 'listDashboards':
      case 'list_dashboards':
        endpoint = '/dashboards';
        break;

      case 'getDashboard':
      case 'get_dashboard':
        endpoint = `/dashboard/${params.dashboardId}`;
        break;

      case 'listDataSources':
      case 'list_data_sources':
        endpoint = '/datasource';
        break;

      case 'getDataSource':
      case 'get_data_source':
        endpoint = `/datasource/${params.dataSourceId}`;
        break;

      case 'listWidgets':
      case 'list_widgets':
        endpoint = `/dashboard/${params.dashboardId}/widget`;
        break;

      case 'getWidgetData':
      case 'get_widget_data':
        endpoint = `/widget/${params.widgetId}/data`;
        break;

      case 'listAccounts':
      case 'list_accounts':
        endpoint = '/account';
        break;

      case 'getAccount':
      case 'get_account':
        endpoint = `/account/${params.accountId}`;
        break;

      case 'createDataSource':
      case 'create_data_source':
        endpoint = '/datasource';
        method = 'POST';
        body = JSON.stringify({
          name: params.name,
          type: params.type,
          config: params.config,
        });
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint || '';
        method = params.method || 'GET';
        if (params.body) {
          body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Make the API call with the determined version (ONLY use supported versions)
    const response = await fetchClicData(endpoint, apiKey, effectiveVersion, method, body);
    
    let data: any;
    const rawText = await response.text();
    
    try {
      data = JSON.parse(rawText);
    } catch {
      // Not JSON
      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: `ClicData API error (${response.status}): ${rawText.substring(0, 200)}`,
          statusCode: response.status,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      data = { rawResponse: rawText };
    }

    // Check for API errors
    if (!response.ok) {
      let errorMessage = data.message || data.error || data.ErrorDescription || 'ClicData API error';
      
      if (response.status === 401) {
        errorMessage = 'Invalid or expired API key. Please check your ClicData API key.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Your API key may not have permission for this action.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found. Please verify the data set or resource ID.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait and try again.';
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        details: data,
        statusCode: response.status,
        apiVersionUsed: effectiveVersion,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for version errors in response body
    const errorCode = data.ErrorCode || data.errorCode || data.code;
    if (errorCode && (errorCode.toLowerCase() === 'apiversionrequired' || errorCode.toLowerCase() === 'invalidversion')) {
      // This shouldn't happen if we use supported versions, but handle it gracefully
      return new Response(JSON.stringify({
        success: false,
        error: `API version error: ${data.ErrorDescription || data.message || errorCode}`,
        supportedVersions: versionInfo.supportedVersions,
        recommendedVersion: versionInfo.recommendedVersion,
        apiVersionUsed: effectiveVersion,
        suggestion: versionInfo.supportedVersions.length > 0 
          ? `Try version: ${versionInfo.supportedVersions[0]}`
          : 'Please enter an API version manually (e.g., 2024.1)'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success - return data based on action type
    const responseData: any = {
      success: true,
      apiVersionUsed: effectiveVersion,
    };

    // Normalize response data based on action
    switch (action) {
      case 'listData':
      case 'list_data':
        responseData.dataSets = Array.isArray(data) ? data : (data.Data || data.data || []);
        break;
      case 'getData':
      case 'get_data':
        responseData.rows = Array.isArray(data) ? data : (data.Data || data.data || []);
        responseData.count = data.Count || data.count || responseData.rows.length;
        break;
      case 'listDashboards':
      case 'list_dashboards':
        responseData.dashboards = Array.isArray(data) ? data : (data.Data || data.data || []);
        break;
      case 'listDataSources':
      case 'list_data_sources':
        responseData.dataSources = Array.isArray(data) ? data : (data.Data || data.data || []);
        break;
      case 'insertRow':
        responseData.rowId = data.Id || data.id;
        responseData.data = data;
        break;
      case 'deleteData':
      case 'delete_data':
        responseData.deletedCount = data.DeletedCount || data.deletedCount || 0;
        break;
      case 'refreshTable':
      case 'refresh_data_source':
        responseData.refreshStatus = data.Status || data.status || 'initiated';
        break;
      default:
        responseData.data = data;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ClicData proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
