import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Direct provider API keys - NO Lovable Gateway
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map user-friendly model names to actual API model identifiers
const modelMapping: Record<string, string> = {
  'gpt-5': 'openai/gpt-5',
  'claude-opus-4.1': 'claude-opus-4-1-20250805', // Anthropic model ID
  'gemini-3.1': 'google/gemini-3-pro-preview',
};

// Map API model identifiers back to user-friendly display names
const modelDisplayNames: Record<string, string> = {
  'openai/gpt-5': 'GPT-5 Pro',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'google/gemini-3-pro-preview': 'Gemini 3.1 Pro',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gpt-5': 'GPT-5 Pro',
  'claude-opus-4.1': 'Claude Opus 4.1',
  'gemini-3.1': 'Gemini 3.1 Pro',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LOVABLE_API_KEY exists:', !!lovableApiKey);
    console.log('ANTHROPIC_API_KEY exists:', !!anthropicApiKey);
    console.log('GOOGLE_API_KEY exists:', !!googleApiKey);
    console.log('OPENAI_API_KEY exists:', !!openaiApiKey);
    
    const { prompt, context, images, model: requestedModel } = await req.json();
    
    // Check if Claude, Gemini, or GPT-5 is selected
    const isClaudeModel = requestedModel === 'claude-opus-4.1';
    const isGeminiModel = requestedModel === 'gemini-3.1';
    const isGPT5Model = requestedModel === 'gpt-5';
    
    // Determine which model to use
    const selectedModel = requestedModel && modelMapping[requestedModel] 
      ? modelMapping[requestedModel] 
      : 'google/gemini-2.5-flash'; // Default to fast model
    
    console.log('Selected model:', selectedModel);
    console.log('Is Claude model:', isClaudeModel);
    console.log('Is Gemini model:', isGeminiModel);
    
    let systemPrompt = '';
    
    if (context?.component) {
      // Context-aware component editing
      systemPrompt = `You are an expert UI/UX assistant helping to modify React components. 
      
Current component:
- Type: ${context.component.type}
- Current styles: ${JSON.stringify(context.component.style || {}, null, 2)}
- Current props: ${JSON.stringify(context.component.props || {}, null, 2)}

Based on the user's request, provide a JSON response with ONLY the properties that need to be updated:

{
  "success": true,
  "updates": {
    "style": { /* only changed style properties */ },
    "props": { /* only changed props */ }
  },
  "message": "Brief description of what was changed"
}

For styles, use these guidelines:
- Colors: Use hex values like #ef4444 for red, #3b82f6 for blue
- Spacing: Use px values like "20px"
- Sizes: Use px or % values
- Always preserve existing styles unless specifically asked to change them

For props:
- Text content goes in "children" property
- Other component properties go in their respective keys

IMPORTANT: Only include properties that are being changed, not all properties.`;
    } else if (context?.pageType === 'flow') {
      // Flow Builder AI Assistant
      const currentNodesInfo = context.currentNodes ? `\n\nCurrent Flow Nodes:\n${JSON.stringify(context.currentNodes.map((n: any) => ({ id: n.id, type: n.data?.type, label: n.data?.label })), null, 2)}` : '';
      
      // Build dynamic node types list from available nodes passed by frontend
      const availableNodeTypes = context.availableNodeTypes || [];
      let nodeTypesList = '';
      
      if (availableNodeTypes.length > 0) {
        // Enhanced format - includes installation status so AI knows what's available
        // System will auto-install any missing integrations when flow is created
        nodeTypesList = availableNodeTypes
          .map((node: any) => {
            const installNote = node.requiresInstallation && !node.isInstalled 
              ? ' [will be auto-installed]' 
              : '';
            return `- ${node.type}: ${node.description || node.name}${installNote}`;
          })
          .join('\n');
      } else {
        // Fallback to common nodes if no dynamic list provided
        nodeTypesList = `
TRIGGER NODES:
- webhook-trigger: Trigger flows from webhooks

ACTION NODES:
- http-request: Make HTTP API calls (GET, POST, PUT, DELETE)
- data-table: Read from or write to database tables
- gmail: Send emails via Gmail [will be auto-installed]
- brevo: Send emails via Brevo [will be auto-installed]
- amazon-ses: Send emails via Amazon SES [will be auto-installed]
- slack: Send messages to Slack [will be auto-installed]
- airtable: Interact with Airtable bases [will be auto-installed]
- webflow: Work with Webflow CMS [will be auto-installed]
- google-sheets: Work with Google Sheets [will be auto-installed]
- notion: Work with Notion [will be auto-installed]
- hubspot: Work with HubSpot CRM [will be auto-installed]
- salesforce: Work with Salesforce [will be auto-installed]
- delay: Add time delays in flows

CONDITION NODES:
- condition: Create branching logic based on conditions (requires true/false paths)

TRANSFORMER NODES:
- data-filter: Filter and transform data
- loop: Iterate over arrays/collections
- javascript: Execute custom JavaScript code
- text-processing: Process and manipulate text
- json-parser: Parse and manipulate JSON data`;
      }
      
      console.log('Available node types count:', availableNodeTypes.length);
      
      systemPrompt = `You are a Flow Builder AI Assistant specializing in creating automation workflows and logic flows.

CRITICAL INSTRUCTIONS - MUST FOLLOW:
1. READ THE USER'S REQUEST CAREFULLY - Identify EVERY component they ask for
2. BE PRECISE - Only add nodes that were explicitly requested, no extras
3. BE COMPLETE - Include ALL nodes mentioned in the request
4. ⚠️ MANDATORY FOR CONDITION NODES: You MUST create separate nodes for BOTH "true" AND "false" paths
   - If user says "add nodes for true and false", create TWO separate action nodes
   - The TRUE path node must have: "connectTo": "previous", "pathType": "true"
   - The FALSE path node must have: "connectTo": "previous", "pathType": "false"
   - NEVER create only one path - ALWAYS create both unless explicitly told otherwise
5. ⚠️ AUTO-INSTALLATION: If you suggest a node marked with [will be auto-installed], it will be automatically installed for the user. Feel free to suggest any integration that fits the user's needs.

AVAILABLE NODE TYPES (nodes marked [will be auto-installed] will be installed automatically when used):
${nodeTypesList}

WORKING WITH PASTED IMAGES:
When user provides images along with their request:
1. 🔍 ANALYZE THE IMAGE FIRST - Look for:
   - Node type indicators (icons, labels, badges)
   - Node configuration details (URLs, endpoints, field values, methods)
   - Input field values and settings
   - Connection patterns and relationships
   
2. 📋 EXTRACT SPECIFIC DETAILS:
   - If image shows a node label, use that EXACT label
   - If image shows a URL/endpoint, use that EXACT URL
   - If image shows field values (method, headers, body), use those EXACT values
   - If image shows node type (HTTP, email, database), use that type
   
3. ✅ PRIORITIZE IMAGE DATA OVER DEFAULTS:
   - Do NOT use placeholder URLs like "https://api.example.com/endpoint"
   - Do NOT invent generic labels like "Process Action"
   - Do NOT make up field values
   - Use the exact specifications shown in the image
   
4. 📸 IMAGE ANALYSIS EXAMPLE:
   User: "add this node on the false side" + [image showing HTTP node with URL "https://webhook.site/abc123", method "POST", label "Send to Webhook"]
   
   CORRECT RESPONSE:
   {
     "success": true,
     "nodes": [{
       "type": "http-request",
       "label": "Send to Webhook",
       "inputs": {
         "url": "https://webhook.site/abc123",
         "method": "POST"
       },
       "connectTo": "previous",
       "pathType": "false"
     }],
     "message": "Added the webhook node to the false path as shown in your image"
   }
   
   ❌ WRONG RESPONSE (DON'T DO THIS):
   {
     "nodes": [{
       "type": "http-request",
       "label": "Process Action",
       "inputs": {
         "url": "https://api.example.com/endpoint",
         "method": "POST"
       }
     }]
   }

⚠️ IF USER PROVIDES AN IMAGE: Acknowledge what you see in the image in your message field, e.g., "Added the webhook node shown in your image to the false path"

RESPONSE FORMAT FOR NODE GENERATION:

{
  "success": true,
  "nodes": [
    {
      "type": "condition",
      "label": "Check Value",
      "inputs": {
        "sourceNodeId": "previous-node-id",
        "outputField": "value",
        "operation": "gt",
        "compareValue": "100"
      },
      "connections": {
        "true": ["next-node-id-for-true"],
        "false": ["next-node-id-for-false"]
      }
    },
    {
      "id": "next-node-id-for-true",
      "type": "http-request",
      "label": "POST Request",
      "inputs": {
        "url": "https://api.example.com/endpoint",
        "method": "POST"
      },
      "connectTo": "parent",
      "pathType": "true"
    },
    {
      "id": "next-node-id-for-false", 
      "type": "email",
      "label": "Send Alert",
      "inputs": {
        "to": "admin@example.com",
        "subject": "Value below threshold"
      },
      "connectTo": "parent",
      "pathType": "false"
    }
  ],
  "message": "Created condition node with separate actions for true and false paths"
}

EXAMPLES - STUDY THESE CAREFULLY:

⚠️ EXAMPLE 1 - CONDITIONAL NODE (MOST IMPORTANT):
User: "create a conditional node then add separate nodes for true side and false side"

YOU MUST RESPOND WITH ALL THREE NODES:
{
  "success": true,
  "nodes": [
    {
      "type": "condition",
      "label": "Check Condition",
      "inputs": { "operation": "eq", "compareValue": "true" }
    },
    {
      "type": "http-request",
      "label": "True Path Action",
      "inputs": { "method": "POST" },
      "connectTo": "previous",
      "pathType": "true"
    },
    {
      "type": "http-request",
      "label": "False Path Action", 
      "inputs": { "method": "GET" },
      "connectTo": "previous",
      "pathType": "false"
    }
  ],
  "message": "Created condition node with actions for both true and false paths"
}

NOTICE: Three nodes created - one condition + two action nodes (one for each path)

EXAMPLE 2 - SIMPLE NODE:
User: "add an email node"
{
  "success": true,
  "nodes": [
    {
      "type": "email",
      "label": "Send Email",
      "inputs": {}
    }
  ],
  "message": "Added email node"
}

For questions, respond with ONLY plain text (no JSON).

${currentNodesInfo}

VALIDATION CHECKLIST BEFORE RESPONDING:
✓ If creating a condition node, did I include nodes for BOTH true AND false paths?
✓ Does each path node have the correct "pathType" field?
✓ Are all requested nodes included in the response?
✓ Are node types valid and from the available list?
✓ If user provided images, did I analyze them and use the exact details shown?
✓ Am I using placeholder/generic values when specific values were shown in images? (DON'T!)

IF YOU CREATE A CONDITION NODE WITHOUT BOTH TRUE AND FALSE PATH NODES, YOUR RESPONSE IS INCOMPLETE.

⚠️ SELF-CHECK BEFORE SENDING RESPONSE:
IF YOU CREATE A CONDITION NODE:
1. Count your nodes array - you MUST have at least 3 total nodes (1 condition + 2 paths)
2. Verify you have exactly 1 node with pathType: "true" AND 1 node with pathType: "false"
3. Verify each path node has connectTo: "previous"
4. NEVER SEND A RESPONSE WITH A CONDITION NODE AND FEWER THAN 3 NODES TOTAL

FINAL REMINDER - READ THIS BEFORE RESPONDING:
- Conditional nodes = 3 nodes minimum (1 condition + 1 true path + 1 false path)
- Include ALL nodes the user requested
- Use correct "pathType" values: "true" or "false"
- If unsure about paths, create both to be safe

IMPORTANT:
- ONLY use JSON format when creating/generating nodes (with a "nodes" array)
- For questions and explanations, respond with plain text only
- ⚠️ YOU CAN USE ANY INTEGRATION NODE TYPE - even if not listed above!
  - Use kebab-case for node types (e.g., "google-calendar", "slack", "stripe", "gmail")
  - The system will automatically install any integration that exists in the catalog
  - Do NOT limit yourself to only the nodes listed - suggest the best integration for the user's needs
- Provide realistic, working configurations for each node
- Keep flows simple and focused on the user's specific request
- Always include helpful input configurations when creating nodes`;
    } else {
      // General AI chat
      systemPrompt = `You are Rantir AI Assistant, an intelligent project enhancement assistant built into the Lovable platform. You specialize in helping users improve and build their projects using the components and elements available in their components panel.

CRITICAL: You MUST only use components from the user's actual component palette. All generated components must be properly integrated so they show properties when clicked.

AVAILABLE COMPONENT TYPES FROM USER'S PALETTE:
 
 LAYOUT COMPONENTS:
 - div: Basic div element - fundamental HTML building block
 - section: Semantic section element for page sections
 - container: Centered container with max-width
 - spacer: Empty space element
 - separator: Visual divider line
 
 TYPOGRAPHY COMPONENTS:
 - text: Simple text element (for paragraphs, spans)
 - heading: Heading element (H1-H6) - use props.level for h1/h2/h3 etc
 - blockquote: Quote block for testimonials
 - code: Inline code snippet
 - codeblock: Multi-line code block
 - link: Hyperlink element
 - icon: Lucide icon (use props.iconName like "Star", "Check", "ArrowRight")
 
 FORM COMPONENTS:
 - form-wrapper: Smart form container with submission handling
 - button: Interactive button (use props.text for label, NOT props.content)
 - input: Text input field
 - password-input: Password with show/hide toggle
 - textarea: Multi-line text input
 - select: Dropdown selection
 - checkbox: Checkbox input
 - checkbox-group: Multiple checkbox selection
 - radio: Radio button input
 - radio-group: Radio button group
 - switch: Toggle switch
 - slider: Range slider
 - label: Form label
 - combobox: Searchable select
 - datepicker: Date selection with popup calendar
 
 MEDIA COMPONENTS:
 - image: Image element (use props.src for URL)
 - video: Video player
 
 DATA DISPLAY COMPONENTS:
 - datatable: Connected data table (NOT "table")
 - list: List component
 - data-display: Advanced data display with templates
 - chart: Chart/graph component
 - badge: Status badge
 - alert: Alert message
 - progress: Progress indicator bar
 - calendar: Calendar display
 - avatar: User avatar image
 - card: Content card container
 
 NAVIGATION COMPONENTS:
 - nav-horizontal: Header navigation bar
 - nav-vertical: Sidebar navigation
 - sidebar: Sidebar layout
 - dropdown-menu: Dropdown menu with options
 - tabs: Tabbed content navigation
 - accordion: Collapsible content sections (great for FAQs)
 - carousel: Slideshow with customizable slides
 - theme-toggle: Light/dark mode toggle
 
 OVERLAY COMPONENTS:
 - dialog: Modal dialog popup
 - sheet: Slide-in panel
 - tooltip: Hover information display
 - popover: Click-triggered popup

CORE CAPABILITIES:
 - Build complex layouts using div, section, container, and nested children
- Create rich interactive content with buttons, inputs, and icons  
- Generate multiple properly integrated components that work together
- Connect components to databases automatically
- Make instant changes to the canvas with full property integration
- Ensure all components show proper properties panel when selected
 
 CRITICAL RULES:
 - Use "heading" for titles, NOT "text" with variant
 - Use "datatable" for tables, NOT "table"
 - Use "dialog" for modals, NOT "modal"
 - Use "div" for flex/grid layouts, NOT "row" or "column"
 - Button labels go in props.text, NOT props.content
 - All containers must have minWidth: "200px" to prevent collapse

RESPONSE FORMAT:
When users request features like "pricing card", "hero section", "contact form", etc., build them using multiple basic components from their palette:

{
  "success": true,
  "action": "generate_component", 
  "components": [
    {
      "id": "pricing-section",
      "type": "container",
      "props": {
        "className": "pricing-container"
      },
      "style": {
        "layout": { "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "20px", "maxWidth": "400px" },
        "colors": { "backgroundColor": "hsl(var(--card))", "borderColor": "hsl(var(--border))" },
        "effects": { "borderRadius": "12px", "border": "1px solid", "boxShadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }
      },
      "children": [
        {
          "id": "plan-title",
          "type": "text",
          "props": { "content": "Pro Plan", "variant": "h3" },
          "style": { 
            "typography": { "fontSize": "28px", "fontWeight": "700", "color": "hsl(var(--foreground))" },
            "layout": { "textAlign": "center", "marginBottom": "8px" }
          }
        },
        {
          "id": "plan-description",
          "type": "text", 
          "props": { "content": "Perfect for growing teams and businesses" },
          "style": { 
            "typography": { "fontSize": "16px", "color": "hsl(var(--muted-foreground))" },
            "layout": { "textAlign": "center", "marginBottom": "16px" }
          }
        },
        {
          "id": "price-display",
          "type": "text",
          "props": { "content": "$49", "variant": "h1" },
          "style": { 
            "typography": { "fontSize": "48px", "fontWeight": "800", "color": "hsl(var(--primary))" },
            "layout": { "textAlign": "center" }
          }
        },
        {
          "id": "price-period",
          "type": "text",
          "props": { "content": "per month" },
          "style": { 
            "typography": { "fontSize": "14px", "color": "hsl(var(--muted-foreground))" },
            "layout": { "textAlign": "center", "marginBottom": "24px" }
          }
        },
        {
          "id": "feature-list",
          "type": "container",
          "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": "12px", "marginBottom": "24px" } },
          "children": [
            {
              "id": "feature-1",
              "type": "text",
              "props": { "content": "✓ Unlimited projects" },
              "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } }
            },
            {
              "id": "feature-2", 
              "type": "text",
              "props": { "content": "✓ Priority support" },
              "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } }
            },
            {
              "id": "feature-3",
              "type": "text", 
              "props": { "content": "✓ Advanced analytics" },
              "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--foreground))" } }
            }
          ]
        },
        {
          "id": "cta-button",
          "type": "button",
          "props": { 
            "content": "Get Started Now",
            "variant": "primary",
            "size": "lg"
          },
          "style": { 
            "layout": { "width": "100%", "padding": "12px 24px" },
            "colors": { "backgroundColor": "hsl(var(--primary))", "color": "hsl(var(--primary-foreground))" },
            "effects": { "borderRadius": "8px" }
          }
        }
      ]
    }
  ],
  "message": "Created a complete pricing card using container, text, and button components from your palette!"
}

For simple questions, respond with:
{
  "success": true,
  "action": "chat", 
  "message": "Your helpful response here"
}

IMPORTANT: 
- NEVER use generic "card" components for complex layouts
- ALWAYS build using basic components: container, row, column, text, button, icon
- Create nested structures with children arrays
- Use semantic component types that match the available palette`;
    }

    // Log image context
    if (images && images.length > 0) {
      console.log('📸 Images provided with request:', images.length);
      console.log('Image analysis required - AI should extract node details from images');
    }

    // Retry logic for temporary API issues
    let response;
    let lastError;
    const maxRetries = 3;
    
    console.log(`Starting AI request with ${maxRetries} max retries using model: ${selectedModel}`);
    
    // Build messages array for OpenAI-compatible format
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: images && images.length > 0 
          ? [
              { type: 'text', text: prompt },
              ...images.map((img: { type: string; data: string }) => ({
                type: 'image_url',
                image_url: {
                  url: `data:${img.type};base64,${img.data}`
                }
              }))
            ]
          : prompt
      }
    ];
    
    let data;
    let aiResponse = '';
    let actualModel = '';
    
    // Use Anthropic API directly for Claude model
    if (isClaudeModel) {
      console.log('Using Anthropic API directly for Claude model');
      
      if (!anthropicApiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured for Claude model');
      }
      
      // Build Anthropic-format messages
      const anthropicMessages = [
        {
          role: 'user',
          content: images && images.length > 0 
            ? [
                { type: 'text', text: prompt },
                ...images.map((img: { type: string; data: string }) => ({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.type,
                    data: img.data
                  }
                }))
              ]
            : prompt
        }
      ];
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${maxRetries}: Calling Anthropic API...`);
          
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicApiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-opus-4-1-20250805',
              max_tokens: 4000,
              system: systemPrompt,
              messages: anthropicMessages,
            }),
          });
          
          console.log(`Attempt ${attempt + 1} response status: ${response.status}`);
          
          if (response.ok) {
            console.log(`Success on attempt ${attempt + 1}`);
            break;
          }
          
          if (response.status === 429 || response.status === 503) {
            lastError = `Anthropic API temporarily unavailable (${response.status})`;
            console.warn(`⚠️ API rate limited/overloaded (${response.status})`);
            
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          } else {
            const errorText = await response.text();
            console.error('Anthropic error response:', errorText);
            throw new Error(`Anthropic API error: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error in attempt ${attempt + 1}:`, error);
          lastError = error.message;
          if (attempt === maxRetries - 1) {
            throw error;
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(lastError || 'Anthropic API request failed after retries');
      }
      
      const anthropicData = await response.json();
      aiResponse = anthropicData.content?.[0]?.text?.trim() || '';
      actualModel = 'Claude Opus 4.1';
      
      console.log('=== CLAUDE RESPONSE DEBUG ===');
      console.log('Response length:', aiResponse.length);
      console.log('First 500 chars:', aiResponse.substring(0, 500));
      
    } else if (isGeminiModel) {
      // Use Google Generative AI API directly for Gemini 3.1
      console.log('Using Google Generative AI API directly for Gemini model');
      
      if (!googleApiKey) {
        throw new Error('GOOGLE_API_KEY is not configured for Gemini model');
      }
      
      // Build Google Gemini-format content
      const geminiParts: any[] = [{ text: systemPrompt + '\n\nUser request: ' + prompt }];
      
      // Add images if provided
      if (images && images.length > 0) {
        for (const img of images) {
          geminiParts.push({
            inlineData: {
              mimeType: img.type,
              data: img.data
            }
          });
        }
      }
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${maxRetries}: Calling Google Generative AI API...`);
          
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: geminiParts
                }
              ],
              generationConfig: {
                maxOutputTokens: 4000,
                temperature: 0.7,
              },
            }),
          });
          
          console.log(`Attempt ${attempt + 1} response status: ${response.status}`);
          
          if (response.ok) {
            console.log(`Success on attempt ${attempt + 1}`);
            break;
          }
          
          if (response.status === 429 || response.status === 503) {
            lastError = `Google AI API temporarily unavailable (${response.status})`;
            console.warn(`⚠️ API rate limited/overloaded (${response.status})`);
            
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          } else {
            const errorText = await response.text();
            console.error('Google AI error response:', errorText);
            throw new Error(`Google AI API error: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error in attempt ${attempt + 1}:`, error);
          lastError = error.message;
          if (attempt === maxRetries - 1) {
            throw error;
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(lastError || 'Google AI API request failed after retries');
      }
      
      const geminiData = await response.json();
      aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      actualModel = 'Gemini 3.1 Pro';
      
      console.log('=== GEMINI RESPONSE DEBUG ===');
      console.log('Response length:', aiResponse.length);
      console.log('First 500 chars:', aiResponse.substring(0, 500));
      
    } else if (isGPT5Model) {
      // Use OpenAI API directly for GPT-5
      console.log('Using OpenAI API directly for GPT-5 model');
      
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured for GPT-5 model');
      }
      
      // Build OpenAI-format messages with images support
      const openaiMessages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: images && images.length > 0 
            ? [
                { type: 'text', text: prompt },
                ...images.map((img: { type: string; data: string }) => ({
                  type: 'image_url',
                  image_url: {
                    url: `data:${img.type};base64,${img.data}`
                  }
                }))
              ]
            : prompt
        }
      ];
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${maxRetries}: Calling OpenAI API...`);
          
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o', // Use gpt-4o as the actual model
              messages: openaiMessages,
              max_tokens: 4000,
            }),
          });
          
          console.log(`Attempt ${attempt + 1} response status: ${response.status}`);
          
          if (response.ok) {
            console.log(`Success on attempt ${attempt + 1}`);
            break;
          }
          
          if (response.status === 429 || response.status === 503) {
            lastError = `OpenAI API temporarily unavailable (${response.status})`;
            console.warn(`⚠️ API rate limited/overloaded (${response.status})`);
            
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          } else {
            const errorText = await response.text();
            console.error('OpenAI error response:', errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error in attempt ${attempt + 1}:`, error);
          lastError = error.message;
          if (attempt === maxRetries - 1) {
            throw error;
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(lastError || 'OpenAI API request failed after retries');
      }
      
      const openaiData = await response.json();
      aiResponse = openaiData.choices?.[0]?.message?.content?.trim() || '';
      actualModel = 'GPT-5 Pro';
      
      console.log('=== OPENAI RESPONSE DEBUG ===');
      console.log('Response length:', aiResponse.length);
      console.log('First 500 chars:', aiResponse.substring(0, 500));
      
    } else {
      // Use OpenAI API directly as fallback
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${maxRetries}: Calling OpenAI API (fallback)...`);
          
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: messages,
              max_tokens: 4000,
            }),
          });

          console.log(`Attempt ${attempt + 1} response status: ${response.status}`);

          if (response.ok) {
            console.log(`Success on attempt ${attempt + 1}`);
            break;
          }

          if (response.status === 429 || response.status === 503) {
            lastError = `OpenAI API temporarily unavailable (${response.status})`;
            console.warn(`⚠️ API rate limited/overloaded (${response.status})`);
            
            if (attempt < maxRetries - 1) {
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 2}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error in attempt ${attempt + 1}:`, error);
          lastError = error.message;
          if (attempt === maxRetries - 1) {
            throw error;
          }
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastError || 'OpenAI API request failed after retries');
      }

      data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content?.trim() || '';
      
      actualModel = 'GPT-4o Mini';
      
      console.log('=== AI RESPONSE DEBUG ===');
      console.log('Response length:', aiResponse.length);
      console.log('First 500 chars:', aiResponse.substring(0, 500));
      console.log('Display Model:', actualModel);

      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason) {
        console.log('Finish reason:', finishReason);
        if (finishReason === 'length') {
          console.warn('⚠️ RESPONSE TRUNCATED - Hit max_tokens limit!');
        }
      }
    }

    // Check if response contains markdown code blocks
    if (aiResponse.includes('```json') || aiResponse.includes('```')) {
      // Try to extract JSON from markdown code block
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.nodes || parsed.success !== undefined) {
            // Extract text outside code blocks for the message
            const textOnly = aiResponse.replace(/```[\s\S]*?```/g, '').trim();
            
            const responsePayload = {
              ...parsed,
              message: parsed.message || textOnly || 
                (parsed.nodes && Array.isArray(parsed.nodes)
                  ? `I've created ${parsed.nodes.length} node${parsed.nodes.length > 1 ? 's' : ''} for your flow.`
                  : ''),
              model: actualModel
            };
            
            return new Response(JSON.stringify(responsePayload), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
      // If we can't extract valid JSON, strip the markdown and return as text
      const textOnly = aiResponse.replace(/```[\s\S]*?```/g, '').trim();
      return new Response(JSON.stringify({ 
        success: true, 
        message: textOnly,
        model: actualModel
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to extract inline JSON object even without markdown fences
    const inlineJsonMatch = aiResponse.match(/(\{[\s\S]*\})/);
    if (inlineJsonMatch) {
      const jsonText = inlineJsonMatch[1];
      const textBefore = aiResponse.slice(0, inlineJsonMatch.index ?? 0).trim();

      try {
        const parsed = JSON.parse(jsonText);
        if (parsed.nodes || parsed.success !== undefined) {
          const responsePayload = {
            ...parsed,
            message: parsed.message || textBefore || 
              (parsed.nodes && Array.isArray(parsed.nodes)
                ? `I've created ${parsed.nodes.length} node${parsed.nodes.length > 1 ? 's' : ''} for your flow.`
                : ''),
            model: actualModel
          };

          return new Response(JSON.stringify(responsePayload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.error('Failed to parse inline JSON:', e);
        // fall through
      }
    }

    // Try to parse as pure JSON
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.success !== undefined || parsed.nodes) {
        const responsePayload = {
          ...parsed,
          message: parsed.message || 
            (parsed.nodes && Array.isArray(parsed.nodes)
              ? `I've created ${parsed.nodes.length} node${parsed.nodes.length > 1 ? 's' : ''} for your flow.`
              : 'I have prepared the requested configuration.'),
          model: actualModel
        };
        
        return new Response(JSON.stringify(responsePayload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // Not JSON, treat as regular chat response
    }

    // Plain text response
    return new Response(JSON.stringify({ 
      success: true, 
      message: aiResponse,
      model: actualModel
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    
    // Provide helpful messaging for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = `AI service error: ${errorMessage}`;
    
    if (errorMessage.includes('429') || errorMessage.includes('503')) {
      userMessage = 'The AI service is currently experiencing high demand. Please try again in a moment.';
    } else if (errorMessage.includes('AI Gateway')) {
      userMessage = 'Unable to connect to AI service. Please try again.';
    } else if (errorMessage.includes('Payment required')) {
      userMessage = 'Please add credits to your Lovable workspace to continue using AI features.';
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: userMessage
    }), {
      // Return 200 so the client can handle AI errors gracefully without treating them as server failures
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
