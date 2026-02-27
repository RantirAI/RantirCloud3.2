import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Model mapping and display names (matching ai-assistant)
const modelMapping: Record<string, string> = {
  'gpt-5': 'openai/gpt-5',
  'claude-opus-4.1': 'claude-opus-4-1-20250805',
  'gemini-3.1': 'google/gemini-3-pro-preview',
  'gemini-deep-research': 'DEEP_RESEARCH',
  'openai-deep-research': 'DEEP_RESEARCH',
};

const modelDisplayNames: Record<string, string> = {
  'openai/gpt-5': 'GPT-5 Pro',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'google/gemini-3-pro-preview': 'Gemini 3.1 Pro',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'gpt-5': 'GPT-5 Pro',
  'claude-opus-4.1': 'Claude Opus 4.1',
  'gemini-3.1': 'Gemini 3.1 Pro',
  'gemini-deep-research': 'gemini-2.5-pro-deep-research',
  'openai-deep-research': 'o3-deep-research',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, tableProjectId, databaseId, tableName, sampleLimit = 30, model: requestedModel } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing 'question' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment is not configured");
    }

    // Determine which model to use
    const isClaudeModel = requestedModel === 'claude-opus-4.1';
    const isGeminiModel = requestedModel === 'gemini-3.1';
    const isGptModel = requestedModel === 'gpt-5';
    const isDeepResearch = requestedModel === 'gemini-deep-research' || requestedModel === 'openai-deep-research';
    
    // If deep research is requested, route to the deep-research function
    if (isDeepResearch) {
      console.log('[DATA-CHAT] Routing to deep-research function for:', requestedModel);
      
      const deepResearchResp = await fetch(`${SUPABASE_URL}/functions/v1/deep-research`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          provider: requestedModel,
          context: {
            tableProjectId,
            databaseId,
            tableName
          }
        }),
      });

      if (!deepResearchResp.ok) {
        const errText = await deepResearchResp.text();
        console.error('[DATA-CHAT] Deep research error:', errText);
        return new Response(errText, {
          status: deepResearchResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const deepResearchData = await deepResearchResp.json();
      return new Response(JSON.stringify({
        ...deepResearchData,
        model: modelDisplayNames[requestedModel] || requestedModel,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Default to Claude Sonnet if no model specified or if Claude is selected but no Anthropic key
    let selectedModelId = 'claude-sonnet-4-5';
    let modelDisplayName = 'Claude Sonnet 4.5';
    
    if (isClaudeModel && ANTHROPIC_API_KEY) {
      selectedModelId = 'claude-opus-4-1-20250805';
      modelDisplayName = 'Claude Opus 4.1';
    } else if (isGptModel && LOVABLE_API_KEY) {
      selectedModelId = 'openai/gpt-5';
      modelDisplayName = 'GPT-5 Pro';
    } else if (isGeminiModel && GOOGLE_API_KEY) {
      selectedModelId = 'gemini-2.0-flash';
      modelDisplayName = 'Gemini 3.1 Pro';
    } else if (!ANTHROPIC_API_KEY) {
      throw new Error("No AI API keys configured. Add ANTHROPIC_API_KEY in Supabase Edge Function secrets.");
    }

    console.log('Selected model:', selectedModelId, 'Display name:', modelDisplayName);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Identify user (for logging and RLS context)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load table data under user's RLS context
    let tableProject: any = null;
    let allTables: any[] = [];
    
    if (tableProjectId) {
      // Check if this is actually a database ID by trying to load tables
      const { data: tablesData } = await supabase
        .from("table_projects")
        .select("id,name,schema,records,user_id,database_id")
        .eq("database_id", tableProjectId);
      
      if (tablesData && tablesData.length > 0) {
        // It's a database ID, load all tables
        allTables = tablesData;
      } else {
        // It's a table project ID, load single table
        const { data, error } = await supabase
          .from("table_projects")
          .select("id,name,schema,records,user_id,database_id")
          .eq("id", tableProjectId)
          .single();
        if (error) throw error;
        tableProject = data;
      }
    } else if (databaseId && tableName) {
      const { data, error } = await supabase
        .from("table_projects")
        .select("id,name,schema,records,user_id,database_id")
        .eq("database_id", databaseId)
        .eq("name", tableName)
        .single();
      if (error) throw error;
      tableProject = data;
    } else if (databaseId) {
      // Load all tables for this database
      const { data, error } = await supabase
        .from("table_projects")
        .select("id,name,schema,records,user_id,database_id")
        .eq("database_id", databaseId);
      if (error) throw error;
      allTables = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Provide tableProjectId, databaseId, or both databaseId and tableName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare context: schema + data sample (bounded)
    let dataProfile: any;
    let recordsForChart: any[] = []; // Store records for chart generation
    
    if (allTables.length > 0) {
      // Multiple tables context (database view)
      const sampleCount = Math.min(Math.max(1, Number(sampleLimit) || 30), 100);
      dataProfile = {
        database_id: allTables[0]?.database_id,
        table_count: allTables.length,
        tables: allTables.map((table: any) => {
          const schema = table?.schema || {};
          const fields = Array.isArray(schema?.fields)
            ? schema.fields.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required }))
            : [];
          const tableRecords = Array.isArray(table?.records) ? table.records : [];
          const sample = tableRecords.slice(0, Math.min(sampleCount, 10)); // Smaller sample per table
          
          // Combine records from all tables for chart generation
          recordsForChart = recordsForChart.concat(tableRecords);
          
          return {
            table_id: table.id,
            table_name: table.name,
            record_count: tableRecords.length,
            field_count: fields.length,
            fields,
            sample
          };
        })
      };
    } else if (tableProject) {
      // Single table context
      const schema = tableProject?.schema || {};
      const fields = Array.isArray(schema?.fields)
        ? schema.fields.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required }))
        : [];

      const tableRecords = Array.isArray(tableProject?.records) ? tableProject.records : [];
      const sampleCount = Math.min(Math.max(1, Number(sampleLimit) || 30), 100);
      const sample = tableRecords.slice(0, sampleCount);
      
      // Store records for chart generation
      recordsForChart = tableRecords;

      dataProfile = {
        table_id: tableProject.id,
        table_name: tableProject.name,
        record_count: tableRecords.length,
        field_count: fields.length,
        fields,
        sample, // Keep sample shallow to respect token budget
      };
    } else {
      return new Response(
        JSON.stringify({ error: "No table data found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect if this is a chart/visualization request
    const isChartRequest = /\b(chart|graph|plot|visualization|visualize|show.*distribution|create.*chart|generate.*chart|pie|bar|line|scatter)\b/i.test(question);

    const baseRules = `Rules:
- If the snapshot lacks enough information to answer confidently, say what is missing and suggest follow-ups.
- Be precise and concise, but also insightful.
- When computing metrics, show steps briefly and round to 2 decimals if needed.
- If there are arrays or nested objects, describe structure and summarize patterns.
- Never fabricate fields or values that do not appear in the snapshot.
- Look for trends, patterns, outliers, and data quality issues.
- Provide actionable insights when possible.
- If helpful, include a short bullet list of key findings.
- For statistical questions, calculate actual values from the data.
- Point out interesting correlations or unusual patterns you observe.`;

    const chartInstructions = isChartRequest ? `

CHART GENERATION:
When the user requests a chart/visualization, ALSO provide a chart configuration in JSON format at the end of your response.
Use this exact format after your text analysis:

CHART_CONFIG:
{
  "type": "pie|bar|line|area|scatter",
  "title": "Chart title",
  "xAxisField": "field_name_for_x_axis",
  "yAxisField": "field_name_for_y_axis_or_count",
  "data": [{"label": "value", "value": count}, ...],
  "description": "Brief description of what the chart shows"
}

Chart type guidelines:
- pie: For distributions, categories, percentages
- bar: For comparing quantities across categories
- line: For trends over time or continuous data
- area: For cumulative data over time
- scatter: For relationships between two numeric variables

For distribution charts, count occurrences of each unique value in the specified field.
` : '';

    const systemPrompt = allTables.length > 0
      ? `You are an expert data analyst with access to a database containing multiple tables. You will answer user questions using ONLY the provided data snapshots from all tables.

**Database Overview:**
- Total Tables: ${dataProfile.table_count}
- Available Tables: ${dataProfile.tables.map((t: any) => t.table_name).join(", ")}

${baseRules}
${chartInstructions}

Always provide helpful, business-relevant insights that help users understand their data better.`
      : `You are an expert data analyst. You will answer user questions about a dataset using ONLY the provided JSON snapshot.

${baseRules}
${chartInstructions}

Always provide helpful, business-relevant insights that help users understand their data better.`;

    // Build request and call appropriate API based on selected model
    let aiText = '';
    
    const userContent = `DATA SNAPSHOT (JSON):\n${JSON.stringify(dataProfile, null, 2)}\n\nQUESTION:\n${question}`;
    
    if (selectedModelId.startsWith('openai/') && Deno.env.get('OPENAI_API_KEY')) {
      // Use OpenAI API directly for GPT-5
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI API error:", errText);
        throw new Error("AI API error: " + errText);
      }

      const data = await response.json();
      aiText = data.choices?.[0]?.message?.content || "";
    } else if (selectedModelId.startsWith('gemini') && GOOGLE_API_KEY) {
      // Use Google Generative AI API for Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: systemPrompt + "\n\n" + userContent }] 
          }],
          generationConfig: { maxOutputTokens: 1500 }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Google AI error:", errText);
        throw new Error("AI API error: " + errText);
      }

      const data = await response.json();
      aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Default to Anthropic Claude
      const anthropicModel = selectedModelId.startsWith('claude-') ? selectedModelId : 'claude-sonnet-4-5';
      const anthropicBody = {
        model: anthropicModel,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      };

      const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(anthropicBody),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("Anthropic error:", errText);
        throw new Error("Anthropic API error: " + errText);
      }

      const aiJson = await aiResp.json();
      const contentBlocks = aiJson?.content || [];
      aiText = contentBlocks.find((c: any) => c?.type === "text")?.text || "";
    }

    console.log("AI Response:", aiText);

    // Parse chart configuration if present
    let chartConfig = null;
    if (isChartRequest && aiText) {
      // Try to extract chart config with more robust parsing
      let chartConfigMatch = aiText.match(/CHART_CONFIG:\s*(\{[\s\S]*?\n\})/);
      
      if (chartConfigMatch) {
        try {
          // Clean up the JSON string to fix common issues
          let jsonStr = chartConfigMatch[1];
          
          // Fix trailing commas and other common JSON issues
          jsonStr = jsonStr
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
            .replace(/:\s*([^",{\[\s][^,}\]]*)/g, ': "$1"') // Quote unquoted string values
            .replace(/: "(\d+)"/g, ': $1') // Unquote numeric values
            .replace(/: "(true|false|null)"/g, ': $1'); // Unquote boolean/null values
          
          chartConfig = JSON.parse(jsonStr);
          console.log("Parsed chart config:", chartConfig);
        } catch (parseError) {
          console.warn("Failed to parse chart config:", parseError);
          console.warn("Raw chart config text:", chartConfigMatch[1]);
        }
      }
      
      // If we couldn't parse the config, try to generate one from the question and data
      if (!chartConfig) {
        console.log("No chart config found, generating one from data...");
        
        // Extract field name from question
        const fieldMatch = question.match(/distribution\s+of\s+(\w+)/i) || 
                          question.match(/(\w+)\s+distribution/i) ||
                          question.match(/show\s+(\w+)/i);
        const fieldName = fieldMatch ? fieldMatch[1] : 'category';
        
        // Generate distribution data from actual records
        const fieldValues: Record<string, number> = {};
        recordsForChart.forEach((record: any) => {
          const value = record[fieldName] || record[fieldName.toLowerCase()] || record[fieldName.replace(/\s+/g, '_')];
          if (value !== undefined && value !== null && value !== '') {
            const key = String(value);
            fieldValues[key] = (fieldValues[key] || 0) + 1;
          }
        });
        
        if (Object.keys(fieldValues).length > 0) {
          // Determine chart type based on question
          let chartType = 'pie';
          if (/bar|column/i.test(question)) chartType = 'bar';
          else if (/line|trend/i.test(question)) chartType = 'line';
          else if (/scatter/i.test(question)) chartType = 'scatter';
          
          chartConfig = {
            type: chartType,
            title: `Distribution of ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
            xAxisField: fieldName,
            yAxisField: 'value',
            data: Object.entries(fieldValues)
              .map(([label, value]) => ({ label, value }))
              .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
              .slice(0, 20), // Limit to top 20 for readability
            description: `Distribution showing breakdown by ${fieldName}`
          };
          
          console.log("Generated chart config from data:", chartConfig);
        }
      }
    }

    // Clean the message text by removing chart data or config
    let cleanMessage = aiText
      .replace(/CHART_CONFIG:\s*\{[\s\S]*?\}/, '')
      .replace(/\[[\s\S]*?"label"[\s\S]*?"value"[\s\S]*?\]/, '')
      .replace(/,\s*\{[\s\S]*?"description"[\s\S]*?\}/, '')
      .trim();

    console.log("Chart config result:", chartConfig);
    console.log("Clean message:", cleanMessage);

    // Best-effort: log the interaction to user_searches (non-blocking)
    try {
      await supabase.from("user_searches").insert({
        user_id: userData.user.id,
        search_query: question?.slice(0, 2000) || "",
        search_type: "chat",
        results_count: 1,
        metadata: {
          table_project_id: tableProject?.id || allTables[0]?.id,
          table_name: tableProject?.name || (allTables.length > 1 ? 'Multiple Tables' : allTables[0]?.name),
          sample_count: recordsForChart.length,
          has_chart: !!chartConfig,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (logErr) {
      console.warn("Failed to log user_searches:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: cleanMessage || "",
        model: modelDisplayName,
        chartConfig: chartConfig,
        usedContext: {
          tableName: dataProfile.table_name || (allTables.length > 1 ? 'Multiple Tables' : allTables[0]?.name),
          recordCount: dataProfile.record_count || recordsForChart.length,
          fieldCount: dataProfile.field_count || dataProfile.tables?.reduce((acc: number, t: any) => acc + t.field_count, 0),
          sampleCount: recordsForChart.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("data-chat function error:", error);
    let message = "An unexpected error occurred";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "object" && error !== null) {
      message = (error as any).message || JSON.stringify(error);
    } else {
      message = String(error);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
