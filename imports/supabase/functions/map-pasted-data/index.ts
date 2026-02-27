import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pastedData, targetColumns } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!pastedData || !targetColumns) {
      return new Response(
        JSON.stringify({ error: "Pasted data and target columns are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a mapping of field names to IDs for reverse lookup
    const fieldNameToId: Record<string, string> = {};
    targetColumns.forEach((col: any) => {
      const fieldName = col.name || col.id;
      const fieldId = col.id || col.name;
      fieldNameToId[fieldName] = fieldId;
    });

    const systemPrompt = `You are a data mapping expert. Your task is to intelligently map pasted data to target columns.

Analyze the pasted data structure and the target columns, then create a mapping that shows how each field in the pasted data should map to the target columns.

Return ONLY a JSON object with this structure:
{
  "mapping": {
    "source_field_1": "target_column_1",
    "source_field_2": "target_column_2"
  },
  "unmapped_sources": ["source_field_3"],
  "unmapped_targets": ["target_column_3"]
}

Consider:
- Field name similarity
- Data type compatibility
- Common naming conventions (e.g., "email" matches "user_email", "created" matches "created_at")
- Partial matches and abbreviations`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Pasted data fields: ${JSON.stringify(Object.keys(pastedData[0] || {}))}\nTarget columns: ${JSON.stringify(targetColumns.map((c: any) => c.name || c.id))}\n\nSample pasted data: ${JSON.stringify(pastedData.slice(0, 2))}` 
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to map data");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '{}';

    // Remove markdown code blocks if present
    content = content.replace(/```(?:json)?\n?/g, '').replace(/```$/g, '').trim();

    let mappingResult;
    try {
      mappingResult = JSON.parse(content);
      if (!mappingResult.mapping) {
        throw new Error("Invalid mapping structure");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid mapping response");
    }

    // Transform the pasted data according to the mapping
    // Use field IDs as keys instead of field names
    const transformedData = pastedData.map((row: any) => {
      const transformed: any = {};
      Object.entries(mappingResult.mapping).forEach(([sourceField, targetFieldName]) => {
        // Convert field name to field ID
        const targetFieldId = fieldNameToId[targetFieldName as string] || targetFieldName;
        transformed[targetFieldId] = row[sourceField];
      });
      return transformed;
    });

    return new Response(
      JSON.stringify({
        ...mappingResult,
        transformedData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in map-pasted-data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
