import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripMarkdownCodeFences(text: string): string {
  if (!text) return "";
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```[a-zA-Z]*\s*/g, "")
    .replace(/```/g, "")
    .trim();
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function coercePlainTextMessage(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId, conversationHistory } = await req.json();

    if (!question || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing question or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priorMessages = Array.isArray(conversationHistory) ? conversationHistory : [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[workspace-chat] Loading workspace data for user: ${userId}`);

    // Load all workspace data in parallel
    const [
      { data: databases },
      { data: flows },
      { data: apps },
      { data: driveFiles }
    ] = await Promise.all([
      supabase.from('databases').select('id, name, description, created_at').eq('user_id', userId),
      supabase.from('flow_projects').select('id, name, description, created_at').eq('user_id', userId),
      supabase.from('app_projects').select('id, name, description, created_at').eq('user_id', userId),
      supabase.from('drive_files').select('id, name, file_type, file_size, database_id, created_at').eq('uploaded_by', userId).order('created_at', { ascending: false }).limit(50)
    ]);

    // Load tables and documents for all databases
    let tables: any[] = [];
    let documents: any[] = [];
    
    if (databases && databases.length > 0) {
      const dbIds = databases.map(db => db.id);
      
      const [tablesResult, docsResult] = await Promise.all([
        supabase.from('table_projects').select('id, name, description, database_id, records, schema').in('database_id', dbIds),
        supabase.from('documents').select('id, title, database_id, created_at').in('database_id', dbIds).eq('archived', false)
      ]);
      
      tables = (tablesResult.data || []).map(t => ({
        ...t,
        database_name: databases.find(db => db.id === t.database_id)?.name,
        record_count: Array.isArray(t.records) ? t.records.length : 0,
        field_count: t.schema?.fields?.length || 0
      }));
      
      documents = (docsResult.data || []).map(d => ({
        ...d,
        database_name: databases.find(db => db.id === d.database_id)?.name
      }));
    }

    // Map files to their database names
    const files = (driveFiles || []).map(f => ({
      ...f,
      database_name: databases?.find(db => db.id === f.database_id)?.name || 'Unknown'
    }));

    // Build workspace context for AI
    const workspaceContext = {
      summary: {
        totalDatabases: databases?.length || 0,
        totalTables: tables.length,
        totalDocuments: documents.length,
        totalFlows: flows?.length || 0,
        totalApps: apps?.length || 0,
        totalFiles: files.length
      },
      databases: (databases || []).map(db => ({
        id: db.id,
        name: db.name,
        description: db.description,
        tableCount: tables.filter(t => t.database_id === db.id).length,
        documentCount: documents.filter(d => d.database_id === db.id).length,
        fileCount: files.filter(f => f.database_id === db.id).length
      })),
      tables: tables.map(t => ({
        id: t.id,
        name: t.name,
        databaseId: t.database_id,
        databaseName: t.database_name,
        recordCount: t.record_count,
        fieldCount: t.field_count,
        fields: t.schema?.fields?.map((f: any) => f.name).slice(0, 10) || []
      })),
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        databaseId: d.database_id,
        databaseName: d.database_name
      })),
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        fileType: f.file_type,
        fileSize: f.file_size,
        databaseId: f.database_id,
        databaseName: f.database_name
      })),
      flows: (flows || []).map(f => ({
        id: f.id,
        name: f.name,
        description: f.description
      })),
      apps: (apps || []).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description
      }))
    };

    console.log(`[workspace-chat] Context: ${workspaceContext.summary.totalDatabases} databases, ${workspaceContext.summary.totalTables} tables, ${workspaceContext.summary.totalDocuments} docs, ${workspaceContext.summary.totalFiles} files, ${workspaceContext.summary.totalFlows} flows, ${workspaceContext.summary.totalApps} apps`);

    const systemPrompt = `You are a helpful workspace assistant. You have access to the user's complete workspace data and can answer questions about their databases, tables, documents, files, flows, and apps.

WORKSPACE SUMMARY:
- ${workspaceContext.summary.totalDatabases} databases
- ${workspaceContext.summary.totalTables} tables
- ${workspaceContext.summary.totalDocuments} documents
- ${workspaceContext.summary.totalFiles} files (in Drive)
- ${workspaceContext.summary.totalFlows} automation flows
- ${workspaceContext.summary.totalApps} apps

DATABASES:
${workspaceContext.databases.map(db => `- "${db.name}" (${db.tableCount} tables, ${db.documentCount} docs, ${db.fileCount} files)${db.description ? `: ${db.description}` : ''}`).join('\n') || 'No databases'}

TABLES:
${workspaceContext.tables.map(t => `- "${t.name}" in ${t.databaseName} (${t.recordCount} records, fields: ${t.fields.join(', ') || 'none'})`).join('\n') || 'No tables'}

DOCUMENTS:
${workspaceContext.documents.map(d => `- "${d.title}" in ${d.databaseName}`).join('\n') || 'No documents'}

FILES (Drive):
${workspaceContext.files.map(f => `- "${f.name}" (${f.fileType}) in ${f.databaseName}`).join('\n') || 'No files'}

FLOWS:
${workspaceContext.flows.map(f => `- "${f.name}"${f.description ? `: ${f.description}` : ''}`).join('\n') || 'No flows'}

APPS:
${workspaceContext.apps.map(a => `- "${a.name}"${a.description ? `: ${a.description}` : ''}`).join('\n') || 'No apps'}

INSTRUCTIONS:
1. Answer questions accurately based on the workspace data above
2. If asked about counts, provide exact numbers
3. If asked to find something, search through all items
4. Be concise but helpful
5. If the user asks about something not in the workspace, let them know
6. When referencing items, include their type (database, table, document, flow, app)

RESPONSE FORMAT:
Return ONLY a JSON object (no markdown, no code fences, no extra text) with:
{
  "message": "Your helpful response text",
  "relatedItems": [{"type": "database|table|document|flow|app", "id": "item-id", "name": "Item Name"}]
}

Only include relatedItems if you're specifically referencing items from the workspace. The relatedItems should be clickable for navigation.`;

    // Call OpenAI API
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...priorMessages.map((m: {role: string; content: string}) => ({ role: m.role, content: m.content })),
      { role: "user", content: question }
    ];

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("[workspace-chat] AI error:", errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("[workspace-chat] AI response:", content);

    // Parse AI response (it should be JSON, but models sometimes wrap it in markdown fences)
    const cleanedContent = stripMarkdownCodeFences(content);

    let parsedResponse: { message?: unknown; relatedItems?: unknown } = {};
    try {
      const jsonStr = extractFirstJsonObject(cleanedContent);
      parsedResponse = jsonStr ? JSON.parse(jsonStr) : { message: cleanedContent, relatedItems: [] };
    } catch {
      parsedResponse = { message: cleanedContent, relatedItems: [] };
    }

    // Ensure we NEVER return JSON as the visible message
    let plainMessage = stripMarkdownCodeFences(coercePlainTextMessage(parsedResponse.message));
    if (!plainMessage) {
      const jsonStr = extractFirstJsonObject(cleanedContent);
      const remainder = jsonStr ? cleanedContent.replace(jsonStr, "").trim() : cleanedContent.trim();
      plainMessage = remainder || "I couldn't format an answer. Please try again.";
    }

    if (plainMessage.startsWith("{") && plainMessage.endsWith("}")) {
      plainMessage = "I found the answer, but it returned in an unexpected format. Please try again.";
    }

    // Validate relatedItems against actual workspace data
    if (parsedResponse.relatedItems && Array.isArray(parsedResponse.relatedItems)) {
      parsedResponse.relatedItems = parsedResponse.relatedItems.filter((item: any) => {
        if (!item.id || !item.type) return false;
        switch (item.type) {
          case 'database':
            return workspaceContext.databases.some(db => db.id === item.id);
          case 'table':
            return workspaceContext.tables.some(t => t.id === item.id);
          case 'document':
            return workspaceContext.documents.some(d => d.id === item.id);
          case 'flow':
            return workspaceContext.flows.some(f => f.id === item.id);
          case 'app':
            return workspaceContext.apps.some(a => a.id === item.id);
          default:
            return false;
        }
      });
    }

    const relatedItems = Array.isArray(parsedResponse.relatedItems) ? parsedResponse.relatedItems : [];

    return new Response(
      JSON.stringify({
        message: plainMessage,
        relatedItems,
        workspaceSummary: workspaceContext.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[workspace-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
