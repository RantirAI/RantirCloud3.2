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
    const { prompt, columns, sampleData } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a spreadsheet formula expert. Generate Excel/Hyperformula compatible formulas based on user requests.

Rules:
- Always start formulas with =
- Use standard Excel functions: SUM, AVERAGE, IF, VLOOKUP, COUNT, MAX, MIN, etc.
- DO NOT include any cell references - just show the formula structure
- For ranges or multiple values, use placeholder text like "range" or "values"
- Keep formulas simple showing only the function structure
- Only return the formula, no explanation
- Generate formulas that demonstrate the function syntax without specific cells

Examples:
- User asks for "sum formula" → =SUM(range)
- User asks for "average formula" → =AVERAGE(values)
- User asks for "if formula" → =IF(condition, value_if_true, value_if_false)`;

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
          { role: "user", content: prompt }
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
      throw new Error("Failed to generate formula");
    }

    const data = await response.json();
    let formula = data.choices?.[0]?.message?.content?.trim() || '';

    // Remove markdown code blocks if present (e.g., ```excel, ```formula, or just ```)
    formula = formula.replace(/```(?:excel|formula)?\n?/g, '').replace(/```$/g, '').trim();

    // Ensure formula starts with =
    const finalFormula = formula.startsWith('=') ? formula : `=${formula}`;

    return new Response(
      JSON.stringify({ formula: finalFormula }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating formula:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
