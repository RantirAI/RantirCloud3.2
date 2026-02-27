import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { flowMonitoringService } from "./flowMonitoringService";

export interface FlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: any;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface FlowData {
  id: string;
  flow_project_id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  version: number;
  version_name?: string;
  version_description?: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

export interface FlowExecutionResult {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  logs: any[];
  error_message?: string;
}

export interface NodeConfiguration {
  id: string;
  flow_project_id: string;
  node_type: string;
  api_key?: string;
  config: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotpressApiResponse {
  status: number;
  statusText: string;
  data: any;
  headers?: any;
  error?: string;
}

async function callBotpressApi(
  endpoint: string,
  apiKey: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<BotpressApiResponse> {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.botpress.cloud/v1${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const requestOptions: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    console.log(`Making ${method} request to Rantir Core API: ${url}`);
    
    const response = await fetch(url, requestOptions);
    
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    if (!response.ok) {
      const errorMessage = typeof responseData === 'object' && responseData.message 
        ? responseData.message 
        : `API error: ${response.statusText}`;
        
      console.error(`Rantir Core API error (${response.status}): ${errorMessage}`, responseData);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: errorMessage
      };
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    };
  } catch (error: any) {
    console.error('Error calling Rantir Core API:', error);
    return {
      status: 0,
      statusText: 'Network Error',
      data: null,
      error: error.message || 'Failed to connect to Rantir Core API',
    };
  }
}

async function getFlowProject(flowProjectId: string) {
  const { data, error } = await supabase
    .from("flow_projects")
    .select("*")
    .eq("id", flowProjectId)
    .single();

  if (error) {
    console.error("Error getting flow project:", error);
    throw new Error(`Error getting flow project: ${error.message}`);
  }

  return data;
}

async function updateFlowProject(flowProjectId: string, updates: { name?: string; description?: string }) {
  const { data, error } = await supabase
    .from("flow_projects")
    .update(updates)
    .eq("id", flowProjectId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating flow project:", error);
    throw new Error(`Error updating flow project: ${error.message}`);
  }

  return data;
}

async function getLatestFlowData(flowProjectId: string): Promise<FlowData | null> {
  const { data, error } = await supabase
    .from("flow_data")
    .select("*")
    .eq("flow_project_id", flowProjectId)
    .order("version", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error getting latest flow data:", error);
    throw new Error(`Error getting latest flow data: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const flowData = data[0];
  return {
    ...flowData,
    nodes: Array.isArray(flowData.nodes) ? flowData.nodes : JSON.parse(flowData.nodes as unknown as string),
    edges: Array.isArray(flowData.edges) ? flowData.edges : JSON.parse(flowData.edges as unknown as string),
  } as FlowData;
}

async function saveFlowData(
  flowProjectId: string,
  flowData: { nodes: FlowNode[]; edges: FlowEdge[] }
): Promise<FlowData | null> {
  try {
    // Get the latest version to increment
    const latestData = await getLatestFlowData(flowProjectId);
    const newVersion = latestData ? latestData.version + 1 : 1;
    
    // Use the existing saveNewFlowVersion function 
    return await saveNewFlowVersion(
      flowProjectId,
      flowData.nodes,
      flowData.edges,
      {
        version: newVersion,
      }
    );
  } catch (error) {
    console.error("Error saving flow data:", error);
    throw error;
  }
}

async function saveNewFlowVersion(
  flowProjectId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: {
    version: number;
    versionName?: string;
    versionDescription?: string;
  }
): Promise<FlowData | null> {
  const flowData = {
    flow_project_id: flowProjectId,
    nodes: nodes as unknown as Json,
    edges: edges as unknown as Json,
    version: options.version,
    version_name: options.versionName,
    version_description: options.versionDescription,
    is_published: false,
  };

  const { data, error } = await supabase
    .from("flow_data")
    .insert(flowData)
    .select("*")
    .single();

  if (error) {
    console.error("Error saving flow version:", error);
    throw new Error(`Error saving flow version: ${error.message}`);
  }

  return {
    ...data,
    nodes: Array.isArray(data.nodes) ? data.nodes : JSON.parse(data.nodes as unknown as string),
    edges: Array.isArray(data.edges) ? data.edges : JSON.parse(data.edges as unknown as string),
  } as FlowData;
}

async function getNodeConfigurations(flowProjectId: string): Promise<NodeConfiguration[]> {
  const { data, error } = await supabase
    .from("flow_node_configurations")
    .select("*")
    .eq("flow_project_id", flowProjectId);

  if (error) {
    console.error("Error getting node configurations:", error);
    throw new Error(`Error getting node configurations: ${error.message}`);
  }

  return data || [];
}

async function saveNodeConfiguration(flowProjectId: string, nodeType: string, config: any): Promise<NodeConfiguration> {
  const { data: existingConfig } = await supabase
    .from("flow_node_configurations")
    .select("*")
    .eq("flow_project_id", flowProjectId)
    .eq("node_type", nodeType)
    .single();

  if (existingConfig) {
    const { data, error } = await supabase
      .from("flow_node_configurations")
      .update({ config, ...config })
      .eq("id", existingConfig.id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating node configuration:", error);
      throw new Error(`Error updating node configuration: ${error.message}`);
    }

    return data;
  } else {
    const { data, error } = await supabase
      .from("flow_node_configurations")
      .insert([{
        flow_project_id: flowProjectId,
        node_type: nodeType,
        config,
        ...config
      }])
      .select("*")
      .single();

    if (error) {
      console.error("Error creating node configuration:", error);
      throw new Error(`Error creating node configuration: ${error.message}`);
    }

    return data;
  }
}

async function testBotpressConnection(
  flowProjectId: string, 
  environmentVariables?: Record<string, string>
): Promise<any> {
  try {
    let apiKey = environmentVariables?.['RANTIR_CORE_API_KEY'] || environmentVariables?.['BOTPRESS_API_KEY'];

    if (!apiKey) {
      const flowData = await getLatestFlowData(flowProjectId);
      if (!flowData) {
        throw new Error("No flow data found");
      }

      const botpressNodes = flowData.nodes.filter(node => 
        (node.data?.label === 'text' || node.data?.label === 'ai') && node.data?.connected && node.data?.apiKey
      );

      if (botpressNodes.length === 0) {
        throw new Error("No connected Rantir Core nodes found with API keys");
      }

      apiKey = botpressNodes[0].data.apiKey;
    }
    
    if (!apiKey) {
      throw new Error("No valid API key found in Rantir Core node configuration or environment variables");
    }
    
    console.log("Testing Rantir Core connection with API key:", apiKey ? "API key found" : "No API key found");
    
    const response = await callBotpressApi('/bots', apiKey);
    
    if (response.error || response.status >= 400) {
      throw new Error(`Rantir Core API error: ${response.error || response.statusText}`);
    }

    const bots = response.data;
    
    const logs = [{
      message: `Successfully connected to Rantir Core API. Found ${bots.length} bots.`,
      timestamp: new Date().toISOString(),
      level: 'info'
    }];

    return {
      bots,
      logs,
      status: 'success'
    };
  } catch (error: any) {
    console.error("Error testing Rantir Core connection:", error);
    return {
      bots: [],
      logs: [{
        message: `Connection failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        level: 'error'
      }],
      status: 'error',
      error: error.message
    };
  }
}

async function executeFlow(
  flowProjectId: string, 
  flowData: FlowData, 
  environmentVariables?: Record<string, string>
): Promise<any> {
  const executionStartTime = Date.now();
  
  const { data: executionData, error: executionInitError } = await supabase
    .from("flow_executions")
    .insert({
      flow_data_id: flowData.id,
      status: 'running',
      logs: [{ message: 'Rantir Core flow execution started', timestamp: new Date().toISOString(), level: 'info' }] as unknown as Json,
    })
    .select("*")
    .single();

  if (executionInitError) {
    console.error("Error creating flow execution record:", executionInitError);
    throw new Error(`Failed to initialize flow execution: ${executionInitError.message}`);
  }

  const executionId = executionData?.id;
  const logs: any[] = [];
  let errorCount = 0;

  try {
    let apiKey = environmentVariables?.['RANTIR_CORE_API_KEY'] || environmentVariables?.['BOTPRESS_API_KEY'];

    if (!apiKey) {
      const botpressNodes = flowData.nodes.filter(node => 
        (node.data?.label === 'text' || node.data?.label === 'ai') && node.data?.connected && node.data?.apiKey
      );

      logs.push({
        message: `Found ${botpressNodes.length} Rantir Core nodes in the flow`,
        timestamp: new Date().toISOString(),
        level: 'info'
      });

      // Log to monitoring system
      await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
        level: 'info',
        message: `Found ${botpressNodes.length} Rantir Core nodes in the flow`
      });

      if (botpressNodes.length === 0) {
        errorCount++;
        const errorMsg = "No connected Rantir Core nodes found";
        
        await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
          level: 'error',
          message: errorMsg
        });
        
        throw new Error(errorMsg);
      }

      apiKey = botpressNodes[0].data.apiKey;
    }
    
    if (!apiKey) {
      errorCount++;
      const errorMsg = "No valid API key found";
      
      await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
        level: 'error',
        message: errorMsg
      });
      
      throw new Error(errorMsg);
    }
    
    logs.push({
      message: 'Connecting to Rantir Core API...',
      timestamp: new Date().toISOString(),
      level: 'info'
    });
    
    await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
      level: 'info',
      message: 'Connecting to Rantir Core API...'
    });
    
    const botsResponse = await callBotpressApi('/bots', apiKey);
    
    if (botsResponse.error || botsResponse.status >= 400) {
      errorCount++;
      const errorMsg = `Failed to fetch Rantir Core bots: ${botsResponse.error || botsResponse.statusText}`;
      
      await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
        level: 'error',
        message: errorMsg
      });
      
      throw new Error(errorMsg);
    }

    const bots = botsResponse.data;
    
    logs.push({
      message: `Retrieved ${bots.length} Rantir Core bots`,
      timestamp: new Date().toISOString(),
      level: 'info'
    });
    
    await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
      level: 'info',
      message: `Retrieved ${bots.length} Rantir Core bots`
    });
    
    let integrations = [];
    if (bots && bots.length > 0) {
      const botId = bots[0].id;
      
      logs.push({
        message: `Fetching integrations for bot: ${bots[0].name} (${botId})`,
        timestamp: new Date().toISOString(),
        level: 'info'
      });
      
      const integrationsResponse = await callBotpressApi(`/bots/${botId}/integrations`, apiKey);

      if (integrationsResponse.error || integrationsResponse.status >= 400) {
        errorCount++;
        const errorMsg = `Failed to fetch integrations: ${integrationsResponse.error || integrationsResponse.statusText}`;
        
        logs.push({
          message: errorMsg,
          timestamp: new Date().toISOString(),
          level: 'error'
        });
        
        await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
          level: 'error',
          message: errorMsg
        });
        
        // Continue execution even if integrations fetch fails
      } else {
        integrations = integrationsResponse.data;
        logs.push({
          message: `Retrieved ${integrations.length} integrations`,
          timestamp: new Date().toISOString(),
          level: 'info'
        });
        
        await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
          level: 'info',
          message: `Retrieved ${integrations.length} integrations`
        });
      }
    }

    const executionEndTime = Date.now();
    const executionTimeMs = executionEndTime - executionStartTime;
    
    // Log execution metrics
    await flowMonitoringService.logFlowExecution(flowProjectId, executionId, {
      node_count: flowData.nodes.length,
      edge_count: flowData.edges.length,
      execution_time_ms: executionTimeMs,
      status: 'completed',
      error_count: errorCount
    });

    const executionLogs = Array.isArray(executionData?.logs) 
      ? executionData.logs 
      : (executionData?.logs ? [executionData.logs] : []);
    
    await supabase
      .from("flow_executions")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTimeMs,
        logs: [...executionLogs, ...logs] as unknown as Json
      })
      .eq("id", executionId);

    return {
      bots,
      integrations,
      execution: {
        ...executionData,
        status: 'completed',
        execution_time_ms: executionTimeMs,
        logs: [...executionLogs, ...logs],
        completed_at: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error("Error executing flow:", error);
    
    errorCount++;
    const executionEndTime = Date.now();
    const executionTimeMs = executionEndTime - executionStartTime;
    
    logs.push({
      message: `Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      level: 'error'
    });
    
    // Log error to monitoring system
    await flowMonitoringService.logFlowMessage(flowProjectId, executionId, {
      level: 'error',
      message: `Flow execution failed: ${error.message}`
    });
    
    // Log execution metrics with failure
    await flowMonitoringService.logFlowExecution(flowProjectId, executionId, {
      node_count: flowData.nodes.length,
      edge_count: flowData.edges.length,
      execution_time_ms: executionTimeMs,
      status: 'failed',
      error_count: errorCount
    });
    
    const executionLogs = Array.isArray(executionData?.logs) 
      ? executionData.logs 
      : (executionData?.logs ? [executionData.logs] : []);
    
    await supabase
      .from("flow_executions")
      .update({
        status: 'failed',
        error_message: error.message,
        execution_time_ms: executionTimeMs,
        completed_at: new Date().toISOString(),
        logs: [...executionLogs, ...logs] as unknown as Json
      })
      .eq("id", executionId);
    
    return {
      bots: [],
      integrations: [],
      execution: {
        ...executionData,
        status: 'failed',
        error_message: error.message,
        execution_time_ms: executionTimeMs,
        logs: [...executionLogs, ...logs],
        completed_at: new Date().toISOString()
      }
    };
  }
}

async function duplicateFlowProject(flowProjectId: string): Promise<any> {
  try {
    // Get the original flow project
    const originalProject = await getFlowProject(flowProjectId);
    if (!originalProject) {
      throw new Error("Original flow project not found");
    }

    // Generate a unique name for the duplicate
    const baseName = `Copy of ${originalProject.name}`;
    let duplicateName = baseName;
    let counter = 1;
    
    // Check if name already exists and increment counter if needed
    while (true) {
      const { data: existingProject } = await supabase
        .from("flow_projects")
        .select("id")
        .eq("user_id", originalProject.user_id)
        .eq("name", duplicateName)
        .maybeSingle();
      
      if (!existingProject) break;
      counter++;
      duplicateName = `${baseName} ${counter}`;
    }

    // Create new flow project
    const { data: newProject, error: projectError } = await supabase
      .from("flow_projects")
      .insert({
        user_id: originalProject.user_id,
        name: duplicateName,
        description: originalProject.description
      })
      .select("*")
      .single();

    if (projectError) {
      throw new Error(`Failed to create duplicate project: ${projectError.message}`);
    }

    // Get the latest flow data from original project
    const originalFlowData = await getLatestFlowData(flowProjectId);
    
    if (originalFlowData) {
      // Copy flow data to new project
      await saveFlowData(newProject.id, {
        nodes: originalFlowData.nodes,
        edges: originalFlowData.edges
      });
    }

    // Copy flow variables
    const { data: originalVariables } = await supabase
      .from("flow_variables")
      .select("*")
      .eq("flow_project_id", flowProjectId);

    if (originalVariables && originalVariables.length > 0) {
      const newVariables = originalVariables.map(variable => ({
        flow_project_id: newProject.id,
        name: variable.name,
        value: variable.value,
        description: variable.description,
        is_secret: variable.is_secret
      }));

      await supabase.from("flow_variables").insert(newVariables);
    }

    // Copy node configurations
    const originalConfigs = await getNodeConfigurations(flowProjectId);
    
    if (originalConfigs && originalConfigs.length > 0) {
      const newConfigs = originalConfigs.map(config => ({
        flow_project_id: newProject.id,
        node_type: config.node_type,
        config: config.config,
        is_enabled: config.is_enabled
      }));

      await supabase.from("flow_node_configurations").insert(newConfigs);
    }

    return newProject;
  } catch (error) {
    console.error("Error duplicating flow project:", error);
    throw error;
  }
}

async function deleteFlowProject(flowProjectId: string): Promise<void> {
  const { error } = await supabase
    .from("flow_projects")
    .delete()
    .eq("id", flowProjectId);

  if (error) {
    console.error("Error deleting flow project:", error);
    throw new Error(`Error deleting flow project: ${error.message}`);
  }

  // Dispatch event to close the tab if open
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId: flowProjectId } }));
  }
}

export const flowService = {
  getFlowProject,
  getLatestFlowData,
  saveNewFlowVersion,
  getNodeConfigurations,
  saveNodeConfiguration,
  testBotpressConnection,
  executeFlow,
  updateFlowProject,
  saveFlowData,
  duplicateFlowProject,
  deleteFlowProject,
};
