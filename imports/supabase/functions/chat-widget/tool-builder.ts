// tool-builder.ts — Converts downstream flow nodes into AI tool definitions
// Hybrid approach: registry for rich descriptions + auto-discovery for any node

// Known node input definitions for better AI descriptions (optional enhancement)
const NODE_INPUT_REGISTRY: Record<string, { name: string; description: string; inputs: { name: string; label: string; type: string; required?: boolean; description?: string; options?: { label: string; value: string }[] }[] }> = {
  'http-request': {
    name: 'HTTP Request',
    description: 'Make an HTTP request to an external API',
    inputs: [
      { name: 'url', label: 'URL', type: 'text', required: true, description: 'The URL to send the request to' },
      { name: 'method', label: 'Method', type: 'select', required: true, description: 'HTTP method', options: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' }] },
      { name: 'headers', label: 'Headers', type: 'code', required: false, description: 'Request headers as JSON' },
      { name: 'body', label: 'Body', type: 'code', required: false, description: 'Request body' },
    ],
  },
  'slack': {
    name: 'Send Slack Message',
    description: 'Send a message to Slack',
    inputs: [
      { name: 'text', label: 'Message', type: 'text', required: true, description: 'The message text to send to Slack' },
    ],
  },
  'gmail': {
    name: 'Send Email (Gmail)',
    description: 'Send an email using Gmail',
    inputs: [
      { name: 'to', label: 'To', type: 'text', required: true, description: 'Recipient email address' },
      { name: 'subject', label: 'Subject', type: 'text', required: true, description: 'Email subject' },
      { name: 'body', label: 'Body', type: 'textarea', required: true, description: 'Email body content' },
    ],
  },
  'resend': {
    name: 'Send Email (Resend)',
    description: 'Send an email using Resend',
    inputs: [
      { name: 'to', label: 'To', type: 'text', required: true, description: 'Recipient email address' },
      { name: 'subject', label: 'Subject', type: 'text', required: true, description: 'Email subject' },
      { name: 'body', label: 'Body', type: 'textarea', required: true, description: 'Email body (HTML supported)' },
      { name: 'from', label: 'From', type: 'text', required: false, description: 'Sender email address' },
    ],
  },
  'notion': {
    name: 'Notion',
    description: 'Create or update a page in Notion',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'Operation type' },
      { name: 'title', label: 'Title', type: 'text', required: false, description: 'Page title' },
      { name: 'content', label: 'Content', type: 'textarea', required: false, description: 'Page content' },
    ],
  },
  'google-sheets': {
    name: 'Google Sheets',
    description: 'Read or write data in Google Sheets spreadsheets',
    inputs: [
      { name: 'operation', label: 'Action', type: 'select', required: true, description: 'The operation to perform', options: [{ label: 'Export Sheet', value: 'exportSheet' }, { label: 'Insert Row', value: 'insertRow' }, { label: 'Find Rows', value: 'findRows' }, { label: 'Update Row', value: 'updateRow' }, { label: 'Delete Row', value: 'deleteRow' }] },
      { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true, description: 'The Google Spreadsheet ID' },
      { name: 'worksheetName', label: 'Worksheet Name', type: 'text', required: false, description: 'Name of the worksheet tab' },
      { name: 'values', label: 'Values', type: 'code', required: false, description: 'Values to insert/update (JSON array)' },
    ],
  },
  'google-calendar': {
    name: 'Google Calendar',
    description: 'Create, update, or list calendar events',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'Calendar operation' },
      { name: 'title', label: 'Event Title', type: 'text', required: false, description: 'Title of the event' },
      { name: 'description', label: 'Description', type: 'textarea', required: false, description: 'Event description' },
      { name: 'startTime', label: 'Start Time', type: 'text', required: false, description: 'Event start time (ISO format)' },
      { name: 'endTime', label: 'End Time', type: 'text', required: false, description: 'Event end time (ISO format)' },
    ],
  },
  'hubspot': {
    name: 'HubSpot',
    description: 'Manage contacts, deals, and companies in HubSpot CRM',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'HubSpot operation' },
      { name: 'data', label: 'Data', type: 'code', required: false, description: 'Data payload (JSON)' },
    ],
  },
  'airtable': {
    name: 'Airtable',
    description: 'Read or write records in Airtable',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'Airtable operation' },
      { name: 'data', label: 'Data', type: 'code', required: false, description: 'Record data (JSON)' },
    ],
  },
  'data-table': {
    name: 'Data Table',
    description: 'Insert, update, or query data in a database table',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'Database operation', options: [{ label: 'Insert', value: 'insert' }, { label: 'Update', value: 'update' }, { label: 'Query', value: 'query' }] },
      { name: 'data', label: 'Data', type: 'code', required: false, description: 'Data to insert or update (JSON)' },
    ],
  },
  'code-execution': {
    name: 'Code Execution',
    description: 'Execute custom JavaScript code',
    inputs: [
      { name: 'code', label: 'Code', type: 'code', required: true, description: 'JavaScript code to execute' },
    ],
  },
  'trello': {
    name: 'Trello',
    description: 'Manage cards, lists, and boards in Trello',
    inputs: [
      { name: 'action', label: 'Action', type: 'select', required: true, description: 'Trello operation' },
      { name: 'name', label: 'Name', type: 'text', required: false, description: 'Card or list name' },
      { name: 'description', label: 'Description', type: 'textarea', required: false, description: 'Card description' },
    ],
  },
  'slack-webhook': {
    name: 'Send Slack Webhook Message',
    description: 'Send a message to Slack via Incoming Webhook URL',
    inputs: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, description: 'Slack Incoming Webhook URL' },
      { name: 'text', label: 'Message', type: 'text', required: true, description: 'Message text to send' },
      { name: 'username', label: 'Bot Name', type: 'text', required: false, description: 'Override bot display name' },
      { name: 'icon_emoji', label: 'Bot Icon Emoji', type: 'text', required: false, description: 'Override bot icon emoji' },
    ],
  },
};

// Fields the AI should always be able to override, even if pre-filled
const AI_OVERRIDABLE_FIELDS = new Set([
  'text', 'message', 'body', 'subject', 'content', 'data', 'query',
  'title', 'description', 'note', 'comment', 'name', 'value',
]);

// Fields to skip exposing to the AI (internal config, credentials, etc.)
const INTERNAL_FIELDS = new Set([
  'accessToken', 'apiKey', 'apikey', 'api_key', 'token', 'secretKey',
  'secret_key', 'connectionMethod', 'webhookUrl', 'webhook_url',
  'clientId', 'clientSecret', 'refreshToken', 'password',
]);

// Node types to skip when building tools (logic/flow control, not actions)
const SKIP_NODE_TYPES = new Set([
  'condition', 'data-filter', 'set-variable', 'webhook-trigger',
  'response', 'logger', 'ai-agent', 'loop',
]);

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// Map NodeInput type to JSON Schema type
function inputTypeToJsonSchema(inputType: string): string {
  switch (inputType) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    default: return 'string';
  }
}

/**
 * Build AI tool definitions from downstream flow nodes.
 * Uses a hybrid approach:
 *  1. Registry entries provide rich descriptions for known node types
 *  2. Auto-discovery introspects node.data.inputs for unknown node types
 * 
 * @param downstreamNodes - Nodes directly connected from the AI Agent
 * @returns Tool definitions in OpenAI format + nodeMap for execution routing
 */
export function buildToolsFromNodes(
  downstreamNodes: any[],
  excludeNodeIds?: Set<string>,
): { tools: ToolDefinition[]; nodeMap: Map<string, any> } {
  const tools: ToolDefinition[] = [];
  const nodeMap = new Map<string, any>();

  for (const node of downstreamNodes) {
    const nodeType = node.data?.type;
    if (!nodeType || SKIP_NODE_TYPES.has(nodeType) || node.data?.disabled) continue;
    if (excludeNodeIds && excludeNodeIds.has(node.id)) continue;

    const nodeInputs = node.data?.inputs || {};
    const registry = NODE_INPUT_REGISTRY[nodeType];
    
    // Build a safe tool name
    const idSuffix = (node.id || '').replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
    const safeName = `${nodeType.replace(/[^a-zA-Z0-9_]/g, '_')}_${idSuffix}`;
    
    const nodeName = node.data?.label || registry?.name || nodeType;
    const nodeDesc = node.data?.description || registry?.description || `Execute ${nodeName}`;

    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (registry?.inputs) {
      // === REGISTRY PATH: use rich input definitions ===
      for (const input of registry.inputs) {
        const existingValue = nodeInputs[input.name];
        const hasValue = existingValue !== undefined && existingValue !== null && existingValue !== '';
        
        // Skip pre-configured inputs UNLESS they are AI-overridable content fields
        if (hasValue && !AI_OVERRIDABLE_FIELDS.has(input.name)) {
          continue;
        }

        const prop: any = {
          type: inputTypeToJsonSchema(input.type),
          description: input.description || input.label,
        };

        if (input.type === 'select' && input.options) {
          prop.enum = input.options.map(o => o.value);
        }

        properties[input.name] = prop;
        if (input.required && !hasValue) {
          required.push(input.name);
        }
      }
    } else {
      // === AUTO-DISCOVERY PATH: introspect node.data.inputs ===
      // For nodes NOT in the registry, dynamically build parameters
      // from the node's actual configured inputs.
      // - Empty values → required parameters the AI must provide
      // - Pre-filled values → skip (already configured) unless AI-overridable
      // - Internal/credential fields → always skip
      for (const [key, val] of Object.entries(nodeInputs)) {
        // Skip internal/credential fields
        if (INTERNAL_FIELDS.has(key)) continue;

        const isEmpty = val === undefined || val === null || val === '';
        const isOverridable = AI_OVERRIDABLE_FIELDS.has(key);

        if (isEmpty || isOverridable) {
          // Format the key into a readable description
          const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim();
          properties[key] = {
            type: 'string',
            description: `${readableKey} for ${nodeName}`,
          };
          if (isEmpty) {
            required.push(key);
          }
        }
      }
    }

    tools.push({
      type: 'function',
      function: {
        name: safeName,
        description: `${nodeName}: ${nodeDesc}`,
        parameters: {
          type: 'object',
          properties,
          required,
        },
      },
    });

    nodeMap.set(safeName, node);
  }

  return { tools, nodeMap };
}

/**
 * Convert OpenAI tool format to Anthropic tool format
 */
export function toAnthropicTools(tools: ToolDefinition[]): any[] {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}
