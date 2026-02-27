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
    const { values, count } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return new Response(
        JSON.stringify({ error: "Values array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const countToGenerate = count || 5;

    const systemPrompt = `You are a pattern detection expert. Analyze the provided sequence of values and detect the pattern.
Then generate the next ${countToGenerate} values following the same pattern.

Rules:
- Detect numeric sequences, date patterns, text patterns, or any logical progression
- Return ONLY a JSON array of the next values
- Match the format and style of the input values exactly
- Do not include any explanation, just the JSON array

Example input: ["2024-01-01", "2024-01-02", "2024-01-03"]
Example output: ["2024-01-04", "2024-01-05", "2024-01-06"]`;

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
          { role: "user", content: `Analyze this sequence and generate the next ${countToGenerate} values: ${JSON.stringify(values)}` }
        ],
        max_tokens: 500,
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
      throw new Error("Failed to detect pattern");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '[]';

    // Remove markdown code blocks if present
    content = content.replace(/```(?:json)?\n?/g, '').replace(/```$/g, '').trim();

    let generatedValues;
    try {
      generatedValues = JSON.parse(content);
      if (!Array.isArray(generatedValues)) {
        throw new Error("Response is not an array");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid pattern detection response");
    }

    return new Response(
      JSON.stringify({ values: generatedValues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in autofill-pattern:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
