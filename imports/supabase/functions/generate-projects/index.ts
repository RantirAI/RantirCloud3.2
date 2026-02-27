import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstalledIntegration {
  id: string;
  name: string;
  nodeType: string;
  category: string;
  description?: string;
}

interface AvailableNodeType {
  type: string;
  name: string;
  description: string;
  category: string;
  requiresInstallation?: boolean;
  isInstalled?: boolean;
}

interface ProjectGenerationRequest {
  description: string;
  projectTypes: string[];
  userId: string;
  installedIntegrations?: InstalledIntegration[];
  autoDetectTypes?: boolean;
  availableNodeTypes?: AvailableNodeType[];
}

interface GeneratedProject {
  type: 'database' | 'flow' | 'app';
  name: string;
  description: string;
  config: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    console.log('Environment check - ANTHROPIC_API_KEY exists:', !!ANTHROPIC_API_KEY);
    
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set in environment variables');
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const { description, projectTypes, userId, installedIntegrations, autoDetectTypes, availableNodeTypes }: ProjectGenerationRequest = await req.json();

    if (!description || !userId) {
      throw new Error('Missing required fields: description or userId');
    }

    console.log(`Generating projects for user ${userId}: ${description}`);
    console.log('Requested types:', projectTypes);
    console.log('Auto-detect enabled:', autoDetectTypes);
    console.log('Installed integrations:', installedIntegrations?.length || 0);
    console.log('Available node types:', availableNodeTypes?.length || 0);

    // Build dynamic node types list from available nodes passed by frontend
    let nodeTypesList = '';
    if (availableNodeTypes && availableNodeTypes.length > 0) {
      // Group nodes by category for better organization (matching ai-assistant format)
      const nodesByCategory = availableNodeTypes.reduce((acc, node) => {
        if (!acc[node.category]) acc[node.category] = [];
        acc[node.category].push(node);
        return acc;
      }, {} as Record<string, AvailableNodeType[]>);
      
      // Build formatted list with installation status markers (matching ai-assistant)
      const categoryOrder = ['trigger', 'action', 'condition', 'transformer'];
      for (const category of categoryOrder) {
        if (nodesByCategory[category]) {
          nodeTypesList += `\n**${category.toUpperCase()} NODES:**\n`;
          nodeTypesList += nodesByCategory[category]
            .map(n => {
              // Mark nodes that will be auto-installed
              const installNote = n.requiresInstallation && !n.isInstalled 
                ? ' [will be auto-installed]' 
                : '';
              return `- ${n.type}: ${n.description}${installNote}`;
            })
            .join('\n');
          nodeTypesList += '\n';
        }
      }
      nodeTypesList += '\n**IMPORTANT:** Any integration nodes marked with [will be auto-installed] will be automatically installed when the flow is created. Feel free to suggest ANY node that fits the user\'s needs!';
    } else {
      // Fallback to basic node types if none provided
      nodeTypesList = `
**TRIGGER NODES:**
- webhook: Receive incoming HTTP webhooks
- scheduler: Schedule automated runs

**ACTION NODES:**
- http-request: API calls (inputs: url, method, headers, body)
- database-reader: Read from database (inputs: tableId, filter)
- database-writer: Write to database (inputs: tableId, data)
- gmail: Send emails via Gmail [will be auto-installed]
- slack: Send Slack messages [will be auto-installed]
- airtable: Airtable operations [will be auto-installed]
- google-sheets: Google Sheets [will be auto-installed]

**CONDITION NODES:**
- condition: Branching logic with TRUE and FALSE paths

**TRANSFORMER NODES:**
- data-filter: Filter arrays (inputs: field, operator, value)
- calculator: Math operations (inputs: expression)
- code-executor: Custom code (inputs: code)
- delay: Wait time (inputs: duration)`;
    }

    // Build installed integrations list (these require installation)
    const integrationsList = (installedIntegrations || []).length > 0 
      ? `\n\nUser's installed integrations (use these in flows when relevant):\n${(installedIntegrations || []).map(i => `- ${i.name} (nodeType: "${i.nodeType}"): ${i.description || i.category}`).join('\n')}`
      : '';

    // Enhanced system prompt with intent analysis
    const systemPrompt = `You are an expert software architect that analyzes user requirements and generates comprehensive multi-project solutions.

## YOUR TASK
1. FIRST: Analyze the user's description to determine what project types would best solve their needs
2. THEN: Generate detailed, practical configurations for each project type

## PROJECT NAMING RULES (CRITICAL)
When naming projects, follow these rules strictly:
- Extract the CORE TOPIC/SUBJECT from the user's request
- Use 2-4 words maximum for names
- Use Title Case formatting
- NEVER include action verbs (create, generate, build, make, design, develop, write, draft)
- NEVER include articles (a, an, the, my, our)
- NEVER append the project type as suffix (don't say "CRM Database" for database type, just "Customer CRM")
- Focus on the WHAT, not the action

NAMING EXAMPLES:
- "Create a customer CRM database" → name: "Customer CRM"
- "Build a flow for order notifications" → name: "Order Notifications"
- "Generate an analytics dashboard app" → name: "Analytics Dashboard"
- "Write a quarterly sales report document" → name: "Quarterly Sales Report"
- "Make me a task tracking flow with Slack" → name: "Slack Task Tracker"
- "Create a database for inventory management" → name: "Inventory Management"
- "Build an employee onboarding workflow" → name: "Employee Onboarding"

## INTENT ANALYSIS RULES
When analyzing the user's prompt, consider:
- **Database needed** when: storing data, managing records, CRM, inventory, contacts, products, orders, users, content management, collections, tables
- **Flow needed** when: automation, workflows, triggers, scheduled tasks, API integrations, notifications, sync data, webhooks, process automation, timetable, schedule, flow keyword mentioned
- **App needed** when: dashboard, interface, website, portal, admin panel, user-facing application, forms, reports visualization

CRITICAL: If user explicitly mentions "flow", "workflow", "timetable", or "automation" - ALWAYS generate a flow project, even if other project types are also requested.

If the user mentions multiple concepts (e.g., "customer database with automated follow-ups"), suggest MULTIPLE project types that work together.

## CROSS-PROJECT RELATIONSHIPS
When generating multiple projects, create meaningful connections:
- If generating Database + Flow: Include database-reader/database-writer nodes in the flow referencing the database tables
- If generating Database + App: Include data binding configurations pointing to the database
- If generating Flow + App: Include webhook triggers or action buttons that invoke the flow

## PROJECT CONFIGURATIONS

### DATABASE config:
\`\`\`json
{
  "tables": [
    {
      "name": "table_name",
      "description": "Purpose of this table",
      "fields": [
        { "name": "id", "type": "text", "required": true, "system": true },
        { "name": "field_name", "type": "text|number|email|date|boolean|select|textarea|file|timestamp|currency|phone|url", "required": true/false, "description": "Field purpose" }
      ]
    }
  ],
  "documents": [],
  "sampleRecords": true
}
\`\`\`
IMPORTANT: Do NOT generate documents in database config. If user mentions "report" or "document", create a separate document via the database-ai-actions function instead. The "documents" array should always be empty in generate-projects response.
Field type guidance:
- email: For email addresses
- phone: For phone numbers  
- currency: For prices/money
- url: For links
- date/timestamp: For dates
- select: For dropdown choices (add "options": ["option1", "option2"])
- boolean: For yes/no fields

### FLOW config:
\`\`\`json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "custom",
      "position": { "x": 400, "y": 100 },
      "data": {
        "type": "node-type-from-available-list",
        "label": "Node Name",
        "inputs": { /* node-specific inputs */ },
        "isFirstNode": true
      }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2", "type": "smoothstep" }
  ],
  "databaseReferences": [
    { "tableRef": "table_name", "nodeId": "node-x", "operation": "read|write" }
  ]
}
\`\`\`

CRITICAL: ONLY use node types from this list. Do NOT invent or use any node types not listed here.

Available Node Types:
${nodeTypesList}
${integrationsList}

## FLOW GENERATION RULES (CRITICAL FOR FLOWS)

1. ⚠️ MANDATORY FOR CONDITION NODES: You MUST create separate nodes for BOTH "true" AND "false" paths
   - The TRUE path node must have position to the LEFT (x=200) and connect via "true" sourceHandle
   - The FALSE path node must have position to the RIGHT (x=600) and connect via "false" sourceHandle
   - NEVER create only one path - ALWAYS create both paths for every condition node

2. ⚠️ AUTO-INSTALLATION: Any integration node you suggest marked with [will be auto-installed] 
   will be automatically installed for the user. Feel free to suggest ANY integration that fits!

3. NODE POSITIONING:
   - Place nodes vertically: y = 100, 220, 340, 460... (120px apart)
   - For condition branches: true path at x=200, false path at x=600, condition at x=400
   - Keep main flow at x=400 (center)

4. EDGE CONNECTIONS FOR CONDITIONS:
   - From condition to true path: { "sourceHandle": "true" }
   - From condition to false path: { "sourceHandle": "false" }
   - Normal edges: no sourceHandle needed

## FLOW EXAMPLE - CONDITIONAL WITH BOTH PATHS:

\`\`\`json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "custom",
      "position": { "x": 400, "y": 100 },
      "data": {
        "type": "http-request",
        "label": "Fetch Data",
        "inputs": { "url": "https://api.example.com/data", "method": "GET" },
        "isFirstNode": true
      }
    },
    {
      "id": "node-2",
      "type": "conditional",
      "position": { "x": 400, "y": 220 },
      "data": {
        "type": "condition",
        "label": "Check Status",
        "inputs": { "operation": "eq", "compareValue": "success" }
      }
    },
    {
      "id": "node-3",
      "type": "custom",
      "position": { "x": 200, "y": 340 },
      "data": {
        "type": "gmail",
        "label": "Send Success Email",
        "inputs": { "to": "user@example.com", "subject": "Success!" }
      }
    },
    {
      "id": "node-4",
      "type": "custom",
      "position": { "x": 600, "y": 340 },
      "data": {
        "type": "slack",
        "label": "Send Error Alert",
        "inputs": { "channel": "#errors", "message": "Process failed" }
      }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2", "type": "smoothstep" },
    { "id": "e2-3", "source": "node-2", "target": "node-3", "type": "smoothstep", "sourceHandle": "true" },
    { "id": "e2-4", "source": "node-2", "target": "node-4", "type": "smoothstep", "sourceHandle": "false" }
  ]
}
\`\`\`

## FLOW VALIDATION CHECKLIST (CHECK BEFORE RESPONDING):
✓ If creating a condition node, did I include nodes for BOTH true AND false paths?
✓ Are edges using correct sourceHandle ("true" or "false") for condition outputs?
✓ Are ALL node types from the available list (no invented types)?
✓ Is the first node marked with "isFirstNode": true?
✓ Are all positions properly set with 120px vertical spacing?
✓ For conditions: true path at x=200, false path at x=600, condition at x=400?

### APP config:
\`\`\`json
{
  "pages": [
    {
      "id": "page-id",
      "path": "/",
      "name": "Page Name",
      "components": [
        {
          "id": "component-id",
          "type": "Section|Container|Text|Heading|Button|Input|Card|Table|Form|Image|List",
          "props": { /* component-specific props */ },
          "style": { /* CSS styles */ },
          "children": [ /* nested components */ ],
          "dataBinding": { "tableId": "xxx", "field": "xxx" }
        }
      ]
    }
  ],
  "navigation": [
    { "label": "Home", "path": "/" },
    { "label": "Dashboard", "path": "/dashboard" }
  ],
  "dataConnections": [
    { "databaseRef": "database_name", "tables": ["table1", "table2"] }
  ]
}
\`\`\`

## RESPONSE FORMAT
Respond ONLY with valid JSON:
\`\`\`json
{
  "intentAnalysis": {
    "detectedNeeds": ["data storage", "automation", "user interface"],
    "suggestedTypes": ["database", "flow", "app"],
    "reasoning": "Brief explanation of why these types were chosen"
  },
  "projects": [
    {
      "type": "database|flow|app",
      "name": "Descriptive Project Name",
      "description": "Detailed description of what this project does",
      "config": { /* comprehensive configuration */ }
    }
  ],
  "relationships": [
    {
      "from": "project_name",
      "to": "project_name", 
      "type": "data-source|trigger|api-call",
      "description": "How these projects connect",
      "config": { /* connection details */ }
    }
  ]
}
\`\`\`

## IMPORTANT RULES
1. Generate PRACTICAL, REAL-WORLD configurations - not placeholder data
2. Use appropriate field types based on context (email for emails, currency for prices, etc.)
3. Create meaningful relationships between projects when multiple are generated
4. Include sample data structure for databases
5. Use installed integrations in flows when they match the user's needs
6. Position flow nodes vertically (y: 100, 200, 300...) at x: 400
7. For apps, create proper page structure with navigation`;

    const userPrompt = autoDetectTypes 
      ? `Analyze this request and determine the optimal project type(s), then generate configurations:

"${description}"

Return your intent analysis AND the full project configurations.`
      : `Create projects for: "${description}"

Requested project types: ${projectTypes?.join(', ') || 'auto-detect'}

Generate practical, functional configurations that work together as a cohesive solution.`;

    console.log('Making Claude API request with model: claude-sonnet-4-20250514');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [
          {
            role: 'user',
            content: systemPrompt + '\n\n' + userPrompt
          }
        ]
      })
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Error Response:', errorData);
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    console.log('Claude response length:', content.length);

    // Parse the JSON response
    let generatedData;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '');
        jsonStr = jsonStr.replace(/\n?```$/, '');
      }
      
      generatedData = JSON.parse(jsonStr);
      
      // Transform flow nodes to correct structure
      if (generatedData.projects) {
        generatedData.projects = generatedData.projects.map((project: any) => {
          if (project.type === 'flow' && project.config?.nodes) {
            project.config.nodes = project.config.nodes.map((node: any, index: number) => {
              const pluginType = node.data?.type || node.type || 'http-request';
              
              const defaultInputs = pluginType === 'http-request' 
                ? { url: '', method: 'GET', headers: '{}', body: '' }
                : pluginType === 'database-reader'
                ? { tableId: '', filter: '' }
                : pluginType === 'database-writer'
                ? { tableId: '', data: '{}' }
                : {};
              
              return {
                id: node.id || `node-${Date.now()}-${index}`,
                type: pluginType === 'condition' ? 'conditional' : 'custom',
                position: node.position || { x: 400, y: 100 + (index * 120) },
                data: {
                  type: pluginType,
                  label: node.data?.label || node.label || 'Node',
                  inputs: { ...defaultInputs, ...(node.data?.inputs || node.inputs || {}) },
                  isFirstNode: index === 0
                }
              };
            });
            
            if (project.config.edges) {
              project.config.edges = project.config.edges.map((edge: any) => ({
                id: edge.id || `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                type: edge.type || 'smoothstep'
              }));
            }
          }
          
          // Transform app components
          if (project.type === 'app' && project.config?.pages) {
            project.config.pages = project.config.pages.map((page: any) => ({
              ...page,
              id: page.id || `page-${Date.now()}`,
              components: (page.components || []).map((comp: any, idx: number) => ({
                ...comp,
                id: comp.id || `comp-${Date.now()}-${idx}`
              }))
            }));
          }
          
          // SAFEGUARD: Strip documents from database configs to prevent buggy document creation
          if (project.type === 'database' && project.config?.documents) {
            console.log('Stripping documents from database config to prevent buggy creation');
            delete project.config.documents;
          }
          
          return project;
        });
      }
      
      // Filter projects to only requested types if not auto-detecting
      if (!autoDetectTypes && projectTypes && projectTypes.length > 0) {
        generatedData.projects = generatedData.projects.filter(
          (p: any) => projectTypes.includes(p.type)
        );
        
        // SAFEGUARD: Ensure ALL requested types are present - add defaults for missing types
        for (const requestedType of projectTypes) {
          const hasType = generatedData.projects.some((p: any) => p.type === requestedType);
          if (!hasType) {
            console.log(`Adding default ${requestedType} project as AI did not generate one`);
            generatedData.projects.push({
              type: requestedType,
              name: extractSmartName(description, requestedType),
              description: `A ${requestedType} project for ${description}`,
              config: getDefaultConfig(requestedType)
            });
          }
        }
      }
      
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      console.error('Content was:', content.substring(0, 500));
      
      // Fallback generation - ensure ALL requested types get projects
      const fallbackTypes = projectTypes?.length > 0 ? projectTypes : ['database'];
      generatedData = {
        intentAnalysis: {
          detectedNeeds: ['data storage'],
          suggestedTypes: fallbackTypes,
          reasoning: 'Fallback due to parsing error'
        },
        projects: fallbackTypes.map(type => ({
          type,
          name: extractSmartName(description, type),
          description: `A ${type} project for ${description}`,
          config: getDefaultConfig(type)
        })),
        relationships: []
      };
    }

    return new Response(JSON.stringify({
      success: true,
      data: generatedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-projects function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Smart name extraction function (backend version)
function extractSmartName(prompt: string, projectType: string): string {
  const actionWords = [
    'generate', 'create', 'make', 'build', 'design', 'develop', 
    'write', 'draft', 'compose', 'prepare', 'produce', 'set', 'up',
    'add', 'new', 'start', 'begin', 'setup', 'configure', 'implement'
  ];
  
  const filterWords = [
    'a', 'an', 'the', 'my', 'our', 'your', 'their', 'its',
    'for', 'about', 'on', 'with', 'to', 'that', 'which', 'this',
    'some', 'any', 'please', 'can', 'could', 'would', 'should',
    'i', 'we', 'you', 'need', 'want', 'like', 'me'
  ];
  
  const typeKeywords = [
    'database', 'flow', 'workflow', 'app', 'application', 
    'website', 'site', 'document', 'report', 'logic', 'project',
    'table', 'tables', 'system'
  ];
  
  // Clean and tokenize
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  // Find first meaningful word index
  let startIdx = 0;
  for (let i = 0; i < Math.min(words.length, 5); i++) {
    if (actionWords.includes(words[i]) || filterWords.includes(words[i])) {
      startIdx = i + 1;
    } else {
      break;
    }
  }
  
  // Extract meaningful words
  const meaningfulWords = words
    .slice(startIdx)
    .filter(w => !filterWords.includes(w) && !actionWords.includes(w))
    .filter(w => !typeKeywords.includes(w))
    .slice(0, 4);
  
  if (meaningfulWords.length === 0) {
    const fallback = words
      .filter(w => !actionWords.includes(w) && !filterWords.includes(w))
      .slice(0, 2);
    
    if (fallback.length > 0) {
      return fallback.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    return `New ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`;
  }
  
  return meaningfulWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getDefaultConfig(type: string) {
  switch (type) {
    case 'database':
      return {
        tables: [
          {
            name: 'items',
            description: 'Main items table',
            fields: [
              { name: 'id', type: 'text', required: true, system: true },
              { name: 'name', type: 'text', required: true, description: 'Item name' },
              { name: 'description', type: 'textarea', required: false, description: 'Item description' },
              { name: 'status', type: 'select', required: true, options: ['active', 'inactive', 'pending'] },
              { name: 'created_at', type: 'timestamp', required: true, system: true }
            ]
          }
        ]
      };
    case 'flow':
      return {
        nodes: [
          {
            id: 'http-request-' + Date.now(),
            type: 'custom',
            position: { x: 400, y: 100 },
            data: { 
              type: 'http-request',
              label: 'HTTP Request',
              inputs: {
                url: '',
                method: 'GET',
                headers: '{}',
                body: ''
              },
              isFirstNode: true
            }
          }
        ],
        edges: []
      };
    case 'app':
      return {
        pages: [
          {
            id: 'home',
            path: '/',
            name: 'Home',
            components: [
              {
                id: 'section-1',
                type: 'Section',
                props: {},
                style: { padding: '40px 20px' },
                children: [
                  {
                    id: 'heading-1',
                    type: 'Heading',
                    props: { content: 'Welcome', level: 1 },
                    style: { textAlign: 'center', marginBottom: '20px' }
                  },
                  {
                    id: 'text-1',
                    type: 'Text',
                    props: { content: 'Your new application is ready.' },
                    style: { textAlign: 'center' }
                  }
                ]
              }
            ]
          }
        ],
        navigation: [
          { label: 'Home', path: '/' }
        ]
      };
    default:
      return {};
  }
}
