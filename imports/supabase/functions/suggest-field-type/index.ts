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
    const { columnData, columnName } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!columnData || !Array.isArray(columnData)) {
      return new Response(
        JSON.stringify({ error: "Column data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sample the data (first 10 non-empty values)
    const sampleValues = columnData
      .filter(v => v !== null && v !== undefined && v !== '')
      .slice(0, 10);

    const systemPrompt = `You are a data type analyzer. Analyze the provided column data and suggest the most appropriate data type.

Available types:
- text: General text data
- number: Numeric values (integers or decimals)
- date: Date or datetime values
- email: Email addresses
- url: Website URLs
- boolean: True/false values
- phone: Phone numbers
- currency: Monetary values

Analyze the sample values and determine the best data type. Consider patterns, formats, and content.
Return ONLY the type name, nothing else.`;

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
            content: `Column name: ${columnName || 'Unknown'}\nSample values: ${JSON.stringify(sampleValues)}` 
          }
        ],
        max_tokens: 100,
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
      throw new Error("Failed to analyze data type");
    }

    const data = await response.json();
    let suggestedType = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'text';

    // Validate the suggested type
    const validTypes = ['text', 'number', 'date', 'email', 'url', 'boolean', 'phone', 'currency'];
    if (!validTypes.includes(suggestedType)) {
      suggestedType = 'text';
    }

    return new Response(
      JSON.stringify({ type: suggestedType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error suggesting field type:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
