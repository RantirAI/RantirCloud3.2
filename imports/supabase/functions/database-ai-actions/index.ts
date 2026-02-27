import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIActionRequest {
  prompt: string;
  databaseId: string;
  userId: string;
  existingTables?: { 
    id: string; 
    name: string; 
    fieldCount: number;
    schema?: {
      fields: Array<{
        id: string;
        name: string;
        type: string;
        required?: boolean;
        options?: string[];
      }>;
    };
  }[];
  existingDocuments?: { id: string; title: string }[];
}

interface ContentSection {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image' | 'chart' | 'video';
  level?: number; // For headings: 1, 2, 3
  content: string;
  items?: string[]; // For lists
  // Media fields
  imagePrompt?: string;
  imageUrl?: string;
  chartConfig?: {
    type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter';
    data: Array<{ name: string; value: number; [key: string]: any }>;
    title?: string;
    xAxisKey?: string;
    yAxisKey?: string;
  };
  videoPrompt?: string;
  videoUrl?: string;
}

interface AIActionResponse {
  action: 'create_document' | 'create_table' | 'add_records' | 'query' | 'none';
  document?: {
    title: string;
    sections: ContentSection[]; // Progressive content sections
  };
  table?: {
    name: string;
    description: string;
    fields: Array<{
      name: string;
      type: string;
      required?: boolean;
      options?: any;
      description?: string;
    }>;
  };
  records?: {
    tableId: string;
    tableName: string;
    data: Array<Record<string, any>>;
  };
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, databaseId, userId, existingTables, existingDocuments } = await req.json() as AIActionRequest;
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // PRE-AI KEYWORD CHECK: Force document creation if document keywords detected
    // IMPORTANT: Use word-boundary matching ("doc" should NOT match "product").
    const promptLower = prompt.toLowerCase();

    const matchesWord = (w: string) => new RegExp(`\\b${w}\\b`, 'i').test(promptLower);
    const matchesPhrase = (p: string) => promptLower.includes(p);

    const forceDocument =
      matchesWord('report') ||
      matchesWord('reports') ||
      matchesWord('document') ||
      matchesWord('documents') ||
      matchesWord('doc') ||
      matchesWord('docs') ||
      matchesWord('article') ||
      matchesWord('summary') ||
      matchesWord('brief') ||
      matchesWord('draft') ||
      matchesWord('paper') ||
      matchesPhrase('write about');

    // Chart keyword detection - if user explicitly asks for charts/graphs
    const forceChart =
      matchesWord('chart') ||
      matchesWord('charts') ||
      matchesWord('graph') ||
      matchesWord('graphs') ||
      matchesWord('visualization') ||
      matchesWord('visualizations') ||
      matchesWord('plot') ||
      matchesWord('pie') ||
      matchesWord('bar') ||
      matchesPhrase('data viz') ||
      matchesPhrase('data visualization');

    // Image keyword detection
    const forceImage =
      matchesWord('image') ||
      matchesWord('images') ||
      matchesWord('picture') ||
      matchesWord('pictures') ||
      matchesWord('photo') ||
      matchesWord('photos') ||
      matchesWord('illustration') ||
      matchesWord('diagram') ||
      matchesWord('infographic') ||
      matchesWord('visual') ||
      matchesWord('visuals') ||
      matchesPhrase('img of') ||
      matchesPhrase('pic of');

    // Video keyword detection
    const forceVideo =
      matchesWord('video') ||
      matchesWord('videos') ||
      matchesWord('animation') ||
      matchesWord('animated') ||
      matchesWord('motion') ||
      matchesWord('clip') ||
      matchesWord('explainer');

    console.log('Prompt analysis - forceDocument:', forceDocument, 'forceChart:', forceChart, 'forceImage:', forceImage, 'forceVideo:', forceVideo, 'prompt:', prompt);

    // System prompt to detect intent and generate appropriate action
    const systemPrompt = `You are an AI assistant that helps users create documents, tables, and records in their database.

Your job is to:
1. Detect if the user wants to CREATE something (document, table, or records) or just ASK a question
2. If creating a document: Generate the title and content as SECTIONS array for progressive rendering
3. If creating a table: Generate the schema with appropriate field types as FIELDS array
4. If adding records: Generate realistic sample data based on the table's schema
5. If just a question: Provide a helpful response

CRITICAL RULES:
- For document creation: Generate content as an array of SECTIONS that will be added progressively
- For table creation: Generate FIELDS array that will be added one by one to the table
- For record creation: Generate DATA array with realistic values matching the table schema field types
- Always respond with valid JSON

DOCUMENT TITLE RULES (CRITICAL):
- NEVER use the user's prompt as the document title
- ALWAYS generate a professional, contextual title that describes what the document is about
- Title should be concise (2-5 words) and descriptive
- Examples:
  - User asks: "add dummy data and generate a report" → Title: "Data Analysis Report"
  - User asks: "create a sales document with charts" → Title: "Sales Performance Overview"
  - User asks: "write about marketing strategies" → Title: "Marketing Strategy Guide"

DOCUMENT CONTENT RULES (CRITICAL):
- Generate SUBSTANTIVE content with real information, statistics, and analysis
- Include specific numbers, percentages, and data points
- Write complete paragraphs with actionable insights
- For reports: Include executive summary, key findings, detailed analysis, and recommendations
- NEVER use placeholder text like "Add your content here" or "Content goes here"
- Generate at least 8-12 detailed sections

Existing context in this database:
- Tables (with schemas): ${JSON.stringify(existingTables || [])}
- Documents: ${JSON.stringify(existingDocuments || [])}

RESPONSE FORMAT (always respond with this exact JSON structure):

For documents - use SECTIONS array:
{
  "action": "create_document",
  "document": {
    "title": "Professional Contextual Title",
    "sections": [
      { "type": "heading", "level": 1, "content": "Professional Report Title" },
      { "type": "paragraph", "content": "Executive Summary: This report provides a comprehensive analysis of [topic]. Key findings indicate a 23% growth in performance metrics, with notable improvements in Q4. The data reveals significant opportunities for optimization and strategic advancement." },
      { "type": "heading", "level": 2, "content": "Key Findings" },
      { "type": "paragraph", "content": "Detailed analysis paragraph with specific insights, numbers, and observations..." },
      { "type": "list", "content": "Key Takeaways:", "items": ["Finding 1 with specific data", "Finding 2 with measurable results", "Finding 3 with actionable insight"] },
      { "type": "heading", "level": 2, "content": "Recommendations" },
      { "type": "paragraph", "content": "Based on the analysis, we recommend the following strategic actions..." }
    ]
  },
  "message": "Creating your document..."
}

For tables - use FIELDS array (with sampleRecords for user data OR recordCount for generated data):
{
  "action": "create_table",
  "table": {
    "name": "Table Name",
    "description": "Table description",
    "fields": [
      { "name": "name", "type": "text", "required": true, "description": "Name field" },
      { "name": "email", "type": "email", "required": true, "description": "Email address" },
      { "name": "status", "type": "select", "required": false, "options": ["active", "inactive"], "description": "Status" },
      { "name": "created_date", "type": "date", "required": false, "description": "Creation date" }
    ],
    "sampleRecords": [
      { "name": "John Doe", "email": "john@example.com", "status": "active" },
      { "name": "Jane Smith", "email": "jane@example.com", "status": "inactive" }
    ]
  },
  "message": "Creating your table with your data..."
}

USER-PROVIDED DATA vs SAMPLE DATA (CRITICAL - READ CAREFULLY):
- If user provides SPECIFIC DATA VALUES in their prompt → Extract into "sampleRecords" array
- If user asks for "sample records" or "N records" WITHOUT specific data → Use "recordCount"
- NEVER use recordCount when user has provided actual data values in their prompt
- Extract user data EXACTLY as given - do not modify, enhance, or replace with fake data

USER-PROVIDED ID HANDLING (CRITICAL):
- If user data includes "id", "ID", or any ID field → Preserve it EXACTLY in sampleRecords
- If user data has NO ID field → Omit id field entirely (system generates 5-digit sequential IDs)
- NEVER generate fake IDs - only include id field if user explicitly provided IDs
- ID format from system: 5-digit sequential (e.g., "34521", "34522", "34523")

DETECTION RULES FOR USER DATA:
→ User provides SQL INSERT with values (e.g., 'INSERT INTO ... VALUES ("Messi", ...)') → sampleRecords
→ User provides JSON array with data (e.g., '[{name: "John"}, ...]') → sampleRecords
→ User lists items inline (e.g., "with players: Messi, Ronaldo, Haaland") → sampleRecords
→ User provides markdown/text table with data rows → sampleRecords
→ User says "create table with 20 records" (no actual data) → recordCount: 20
→ User says "make a users table with sample data" (no actual data) → recordCount: 5
→ User says "create employees table" (no data request) → no records at all

ID EXAMPLES:
- "add players: id=10 Messi, id=7 Ronaldo" → sampleRecords: [{"id": "10", "name": "Messi"}, {"id": "7", "name": "Ronaldo"}]
- "create products: iPhone $999, MacBook $1299" → sampleRecords: [{"name": "iPhone", "price": 999}, {"name": "MacBook", "price": 1299}] (NO id field - system generates)

DATA EXAMPLES:
- "CREATE TABLE players (...) with data: Messi - 12 goals, Ronaldo - 18 goals" → sampleRecords: [{player_name: "Messi", goals: 12}, {player_name: "Ronaldo", goals: 18}]
- "create phones table: iPhone 15 $999, Galaxy S24 $899" → sampleRecords: [{name: "iPhone 15", price: 999}, {name: "Galaxy S24", price: 899}]
- "create products table with 30 records" → recordCount: 30 (generate fake data)
- "make a users table" → no records (just schema)

For adding records to existing tables - use DATA array:
{
  "action": "add_records",
  "records": {
    "tableId": "the-table-uuid-from-existingTables",
    "tableName": "the table name",
    "data": [
      { "field_name": "value1", "another_field": "value2" },
      { "field_name": "value3", "another_field": "value4" }
    ]
  },
  "message": "Adding records to your table..."
}

For queries:
{
  "action": "query",
  "message": "Your helpful response here..."
}

**CRITICAL DEFAULT BEHAVIOR - TEXT ONLY DOCUMENTS:**
- BY DEFAULT, ALL documents MUST be TEXT-ONLY using ONLY these section types: heading, paragraph, list
- DO NOT add charts, images, or videos unless the user EXPLICITLY requests them with specific keywords
- DO NOT assume the user wants visualizations or media just because they ask for a "report" or "document"
- A professional report does NOT require charts or images - text is the default
- ONLY add chart sections if user says: "chart", "graph", "visualization", "pie chart", "bar chart", "data viz"
- ONLY add image sections if user says: "image", "picture", "photo", "illustration", "diagram", "visual"
- ONLY add video sections if user says: "video", "animation", "motion", "clip"
- If NO media keywords are present in the user's request, your document MUST contain ZERO image, chart, or video sections
- When in doubt, use TEXT content ONLY (headings, paragraphs, lists)

SECTION TYPES for documents:
- heading: Use level 1 for main title, level 2 for sections, level 3 for subsections
- paragraph: Regular text content - THIS IS THE PRIMARY SECTION TYPE
- list: Bullet list with items array - USE THIS FOR ENUMERATIONS
- code: Code block (ONLY for actual code snippets, NOT for charts or data)
- image: ONLY when user explicitly requests images. Include imagePrompt field.
- chart: ONLY when user explicitly requests charts/graphs. Include chartConfig with type and data array.
- video: ONLY when user explicitly requests videos. Include videoPrompt field.

MEDIA RULES (ONLY USE WHEN EXPLICITLY REQUESTED):
- Charts: Use chartConfig with type (bar, line, area, pie, donut, scatter) and data array
- Images: Use imagePrompt with 20-50 word description
- Videos: Use videoPrompt with 15-30 word motion description

FIELD TYPES for tables: text, number, date, boolean, select, multiselect, email, textarea, timestamp, password, image, pdf, json

INTENT DETECTION PRIORITY (check in this order):
1. DOCUMENT FIRST: If prompt contains "report", "document", "doc", "write about", "article", "summary", "brief" → ALWAYS use create_document
2. RECORDS: If prompt mentions "add records", "add data", "populate", "insert", "sample data" with existing table name → add_records  
3. TABLE: If prompt mentions "table", "database for", "set up database", "create table" WITHOUT document keywords → create_table
4. QUERY: Questions, help requests, general inquiries → query

Examples:
- "create a student report" → create_document (contains "report")
- "write a document about sales" → create_document
- "create a table for customers" → create_table
- "add 10 records to users table" → add_records
- "what is this database for?" → query

RECORD GENERATION RULES:
- When user says "add N records to TABLE_NAME", find the table in existingTables by name
- Generate exactly the number of records requested (default 10 if not specified)
- Match each field's type when generating values:
  - text: Generate realistic text values
  - number: Generate appropriate numeric values
  - email: Generate realistic email addresses
  - date: Generate dates in YYYY-MM-DD format
  - timestamp: Generate ISO timestamps
  - boolean: Generate true/false
  - select: Pick randomly from the field's options array
  - multiselect: Pick 1-3 random items from options
- Use the exact field names from the schema
- Generate diverse, realistic data - don't repeat same values

For CREATE/ADD actions, ALWAYS generate COMPLETE content with multiple sections/fields/records - never ask for more details.
Generate at least 5-8 sections for documents, 4-8 fields for tables, and exactly the number of records requested.`;

    console.log('Sending request to OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    let parsedResponse: AIActionResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // If parsing fails, return as a query response
      parsedResponse = {
        action: 'query',
        message: content
      };
    }

    // Validate the response structure
    if (!parsedResponse.action) {
      parsedResponse.action = 'query';
    }

    // POST-AI VALIDATION: Force document action if keywords detected but AI returned wrong action
    if (forceDocument && parsedResponse.action !== 'create_document') {
      console.log('POST-AI OVERRIDE: Forcing create_document because document keywords were detected');
      
      // Generate a meaningful contextual title based on keywords in the prompt
      const topicKeywords = prompt.toLowerCase()
        .replace(/create|generate|write|make|add|build|a|an|the|with|for|about|and|or|to|from|in|on|of/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 3);
      
      const contextualTitle = topicKeywords.length > 0 
        ? topicKeywords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Report'
        : 'Data Analysis Report';
      
      // Build dynamic sections based on detected keywords
      const dynamicSections: ContentSection[] = [
        { type: 'heading', level: 1, content: contextualTitle },
        { type: 'paragraph', content: `This comprehensive report provides an in-depth analysis based on the available data. Our findings reveal significant patterns and trends that inform strategic decision-making. The analysis covers key performance indicators, growth metrics, and actionable recommendations.` },
        { type: 'heading', level: 2, content: 'Executive Summary' },
        { type: 'paragraph', content: `The data analysis reveals a 15% improvement in overall performance metrics compared to the previous period. Key areas of growth include operational efficiency (+23%), customer engagement (+18%), and revenue optimization (+12%). These findings suggest strong momentum and opportunities for continued advancement.` },
      ];
      
      // Add image if requested
      if (forceImage) {
        const imageTopicWords = topicKeywords.join(' ') || 'data analysis';
        dynamicSections.push({
          type: 'image',
          content: 'Visual Overview',
          imagePrompt: `Professional high-quality photograph or illustration of ${imageTopicWords}, detailed and visually striking, suitable for a professional report, ultra high resolution, modern design`
        });
      }
      
      // Only add chart if explicitly requested
      if (forceChart) {
        dynamicSections.push(
          { type: 'heading', level: 2, content: 'Key Metrics' },
          { type: 'chart', content: 'Performance Overview', chartConfig: { type: 'bar', data: [{ name: 'Metric A', value: 4500 }, { name: 'Metric B', value: 3200 }, { name: 'Metric C', value: 5800 }, { name: 'Metric D', value: 2900 }, { name: 'Metric E', value: 4100 }], title: 'Key Performance Indicators' } },
        );
      }
      
      dynamicSections.push(
        { type: 'heading', level: 2, content: 'Detailed Analysis' },
        { type: 'paragraph', content: `A deeper examination of the data reveals several notable trends. Category performance varies significantly, with top performers achieving 35% above average results. The analysis identifies three primary drivers of success: consistent execution, resource optimization, and strategic alignment with market demands.` },
        { type: 'list', content: 'Key Findings:', items: ['Performance increased by 15% quarter-over-quarter', 'Top category contributed 42% of total results', 'Efficiency improvements reduced costs by 8%', 'Customer satisfaction scores reached 4.2/5.0', 'Response time decreased by 22%'] },
      );
      
      // Add video if requested
      if (forceVideo) {
        const videoTopicWords = topicKeywords.join(' ') || 'business analysis';
        dynamicSections.push({
          type: 'video',
          content: 'Video Overview',
          videoPrompt: `Cinematic video footage of ${videoTopicWords}, smooth camera movement, professional quality, visually engaging documentary style`
        });
      }
      
      // Only add trend chart if explicitly requested
      if (forceChart) {
        dynamicSections.push(
          { type: 'heading', level: 2, content: 'Trend Analysis' },
          { type: 'chart', content: 'Growth Trends', chartConfig: { type: 'line', data: [{ name: 'Jan', value: 2400 }, { name: 'Feb', value: 2800 }, { name: 'Mar', value: 3100 }, { name: 'Apr', value: 3500 }, { name: 'May', value: 4200 }, { name: 'Jun', value: 4800 }], title: 'Monthly Growth Trend' } },
        );
      }
      
      dynamicSections.push(
        { type: 'heading', level: 2, content: 'Recommendations' },
        { type: 'paragraph', content: `Based on the analysis, we recommend focusing on three strategic priorities: 1) Scaling successful initiatives identified in top-performing categories, 2) Implementing process improvements in underperforming areas, and 3) Investing in capabilities that support sustained growth.` },
        { type: 'list', content: 'Action Items:', items: ['Allocate additional resources to high-growth segments', 'Review and optimize underperforming processes', 'Establish quarterly performance review cadence', 'Develop training programs to enhance team capabilities'] },
        { type: 'heading', level: 2, content: 'Conclusion' },
        { type: 'paragraph', content: `The data presents a positive outlook with clear opportunities for continued improvement. By acting on the recommendations outlined above, we can expect to achieve 20-25% growth in key metrics over the next quarter. Regular monitoring and adjustment will be essential to maintain momentum.` }
      );

      parsedResponse = {
        action: 'create_document',
        document: {
          title: contextualTitle,
          sections: dynamicSections
        },
        message: 'Creating your document...'
      };
    }

    // POST-AI MEDIA STRIPPING: If no media keywords detected, remove ALL media sections the AI generated
    if (parsedResponse.action === 'create_document' && parsedResponse.document?.sections) {
      const noMediaRequested = !forceChart && !forceImage && !forceVideo;
      
      if (noMediaRequested) {
        const originalCount = parsedResponse.document.sections.length;
        parsedResponse.document.sections = parsedResponse.document.sections.filter(
          (s: ContentSection) => s.type !== 'chart' && s.type !== 'image' && s.type !== 'video'
        );
        const removedCount = originalCount - parsedResponse.document.sections.length;
        if (removedCount > 0) {
          console.log(`POST-AI MEDIA STRIPPING: Removed ${removedCount} unsolicited media sections`);
        }
      }
    }

    // Ensure sections array exists for documents
    if (parsedResponse.action === 'create_document' && parsedResponse.document) {
      if (!parsedResponse.document.sections || !Array.isArray(parsedResponse.document.sections)) {
        // Convert old format to new sections format if needed
        parsedResponse.document.sections = [
          { type: 'heading', level: 1, content: parsedResponse.document.title },
          { type: 'paragraph', content: (parsedResponse.document as any).content || 'Content here...' }
        ];
      }
      
      // POST-AI CHART INJECTION: If chart keywords detected but no chart sections exist, add sample chart
      if (forceChart) {
        const hasChartSection = parsedResponse.document.sections.some(
          (s: ContentSection) => s.type === 'chart'
        );
        
        if (!hasChartSection) {
          console.log('POST-AI CHART INJECTION: Adding chart section because chart keywords were detected');
          
          // Insert chart section after the first heading/paragraph
          const chartSection: ContentSection = {
            type: 'chart',
            content: 'Data Visualization',
            chartConfig: {
              type: 'bar',
              data: [
                { name: 'Category A', value: 4200 },
                { name: 'Category B', value: 3100 },
                { name: 'Category C', value: 5800 },
                { name: 'Category D', value: 2400 },
                { name: 'Category E', value: 3900 }
              ],
              title: 'Sample Data Chart'
            }
          };
          
          // Find best position to insert (after first heading and paragraph)
          let insertIndex = 2;
          if (parsedResponse.document.sections.length <= 2) {
            insertIndex = parsedResponse.document.sections.length;
          }
          
          parsedResponse.document.sections.splice(insertIndex, 0, chartSection);
        }
      }
      
      // POST-AI IMAGE INJECTION: If image keywords detected but no image sections exist, add image
      if (forceImage) {
        const hasImageSection = parsedResponse.document.sections.some(
          (s: ContentSection) => s.type === 'image'
        );
        
        if (!hasImageSection) {
          console.log('POST-AI IMAGE INJECTION: Adding image section because image keywords were detected');
          
          // Extract topic from prompt for contextual image
          const topicWords = prompt.toLowerCase()
            .replace(/create|generate|write|make|add|build|image|images|picture|pictures|photo|photos|visual|visuals|illustration|diagram|infographic|a|an|the|with|for|about|and|or|to|from|in|on|of|report|document|doc/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2)
            .slice(0, 4)
            .join(' ');
          
          const imageSection: ContentSection = {
            type: 'image',
            content: 'Visual Illustration',
            imagePrompt: topicWords 
              ? `Professional high-quality photograph or illustration of ${topicWords}, detailed and visually striking, suitable for a professional report, ultra high resolution`
              : 'Professional business infographic showing data analysis and insights, modern clean design with blue and green colors, suitable for corporate presentation'
          };
          
          // Find best position to insert (after first few sections)
          let insertIndex = Math.min(3, parsedResponse.document.sections.length);
          parsedResponse.document.sections.splice(insertIndex, 0, imageSection);
        }
      }
      
      // POST-AI VIDEO INJECTION: If video keywords detected but no video sections exist, add video
      if (forceVideo) {
        const hasVideoSection = parsedResponse.document.sections.some(
          (s: ContentSection) => s.type === 'video'
        );
        
        if (!hasVideoSection) {
          console.log('POST-AI VIDEO INJECTION: Adding video section because video keywords were detected');
          
          // Extract topic from prompt for contextual video
          const topicWords = prompt.toLowerCase()
            .replace(/create|generate|write|make|add|build|video|videos|animation|animated|motion|clip|explainer|a|an|the|with|for|about|and|or|to|from|in|on|of|report|document|doc/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2)
            .slice(0, 4)
            .join(' ');
          
          const videoSection: ContentSection = {
            type: 'video',
            content: 'Video Content',
            videoPrompt: topicWords 
              ? `Cinematic video footage of ${topicWords}, smooth camera movement, professional quality, visually engaging`
              : 'Professional business presentation animation with smooth transitions, modern corporate style with clean graphics'
          };
          
          // Find best position to insert (after first few sections)
          let insertIndex = Math.min(4, parsedResponse.document.sections.length);
          parsedResponse.document.sections.splice(insertIndex, 0, videoSection);
        }
      }
    }

    // Ensure fields array exists for tables
    if (parsedResponse.action === 'create_table' && parsedResponse.table) {
      if (!parsedResponse.table.fields || !Array.isArray(parsedResponse.table.fields)) {
        // Convert old schema format to new fields format if needed
        const oldSchema = (parsedResponse.table as any).schema;
        if (oldSchema?.fields) {
          parsedResponse.table.fields = oldSchema.fields;
        } else {
          parsedResponse.table.fields = [
            { name: 'name', type: 'text', required: true }
          ];
        }
      }
    }

    // Ensure records data array exists for add_records
    if (parsedResponse.action === 'add_records' && parsedResponse.records) {
      if (!parsedResponse.records.data || !Array.isArray(parsedResponse.records.data)) {
        parsedResponse.records.data = [];
      }
      if (!parsedResponse.records.tableId || !parsedResponse.records.tableName) {
        console.error('Missing tableId or tableName in add_records response');
        parsedResponse.action = 'query';
        parsedResponse.message = 'Could not identify which table to add records to. Please specify the table name.';
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in database-ai-actions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'none',
      message: 'Sorry, I encountered an error processing your request.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
