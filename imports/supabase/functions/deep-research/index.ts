import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
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

    const { 
      question, 
      provider, 
      context,
      action,
      prompt,
      selectedText 
    } = await req.json();

    const query = question || prompt;
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing 'question' or 'prompt' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DEEP-RESEARCH] Processing ${provider} request for user ${userData.user.id}`);

    // Build context-aware system prompt
    let contextInfo = "";
    if (context) {
      if (context.tableData) {
        contextInfo = `\n\nDATA CONTEXT:\nTable: ${context.tableName || 'Unknown'}\nRecords: ${JSON.stringify(context.tableData.slice(0, 20), null, 2)}`;
      }
      if (context.documentText || selectedText) {
        contextInfo = `\n\nDOCUMENT CONTEXT:\n${selectedText || context.documentText}`;
      }
    }

    const systemPrompt = `You are an expert research analyst with access to comprehensive web search capabilities. 
Your task is to conduct deep, thorough research on the user's query and provide a well-structured report.

RESEARCH GUIDELINES:
1. Search for recent, authoritative sources on the topic
2. Cross-reference multiple sources for accuracy
3. Provide specific data, statistics, and facts when available
4. Include relevant citations with source names and URLs when possible
5. Organize findings in a clear, logical structure
6. Highlight key insights and actionable takeaways
7. Note any limitations or areas requiring further research

RESPONSE FORMAT:
- Start with an executive summary (2-3 sentences)
- Organize main findings into clear sections with headers
- Include specific data points and statistics
- End with key takeaways and recommendations
- When citing sources, use format: [Source Name](URL)
${contextInfo}`;

    let aiResponse = "";
    let sources: Array<{ title: string; url: string; snippet?: string }> = [];

    if (provider === "openai-deep-research") {
      // Use OpenAI directly via their API
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured for OpenAI Deep Research");
      }

      console.log("[DEEP-RESEARCH] Using OpenAI Deep Research via direct API (gpt-4o)");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `Conduct comprehensive research on the following query. Provide detailed analysis with specific facts, data points, and structured findings.\n\n${contextInfo}\n\nRESEARCH QUERY:\n${query}` 
            }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[DEEP-RESEARCH] OpenAI API error:", response.status, errText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error("OpenAI API error: " + errText);
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || "";
      
      console.log("[DEEP-RESEARCH] OpenAI response received, length:", aiResponse.length);

    } else if (provider === "gemini-deep-research") {
      // Use Google Gemini with grounding/search enabled
      if (!GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is not configured for Gemini Deep Research");
      }

      console.log("[DEEP-RESEARCH] Using Gemini Deep Research with Google Search grounding");

      // Use Gemini 2.0 Flash with Google Search grounding
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `${systemPrompt}\n\nRESEARCH QUERY:\n${query}` 
            }] 
          }],
          tools: [{ 
            googleSearch: {} 
          }],
          generationConfig: { 
            maxOutputTokens: 4000,
            temperature: 0.7
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[DEEP-RESEARCH] Gemini API error:", response.status, errText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            error: "Google API rate limit exceeded. Please wait a moment and try again, or upgrade your Google AI API plan for higher limits." 
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error("Gemini API error: " + errText);
      }

      const data = await response.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extract grounding metadata for sources
      if (data.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        for (const chunk of data.candidates[0].groundingMetadata.groundingChunks) {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || "Source",
              url: chunk.web.uri || "",
              snippet: ""
            });
          }
        }
      }

      // Also check for search entry points
      if (data.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent) {
        console.log("[DEEP-RESEARCH] Search entry point available");
      }

    } else {
      return new Response(JSON.stringify({ error: "Invalid provider. Use 'gemini-deep-research' or 'openai-deep-research'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DEEP-RESEARCH] Successfully processed research request. Found ${sources.length} sources.`);

    // Parse the response to extract structured sections
    const sections = parseResearchSections(aiResponse);

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        message: aiResponse,
        research: {
          summary: sections.summary,
          findings: sections.findings,
          sources: sources.slice(0, 10), // Limit to 10 sources
          provider: provider,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DEEP-RESEARCH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to parse research response into structured sections
function parseResearchSections(text: string): { summary: string; findings: Array<{ title: string; content: string }> } {
  const lines = text.split('\n');
  let summary = "";
  const findings: Array<{ title: string; content: string }> = [];
  
  let currentSection = "";
  let currentContent: string[] = [];
  
  for (const line of lines) {
    // Check for section headers (## or ### or **)
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^\*\*(.+)\*\*$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        if (currentSection.toLowerCase().includes('summary') || currentSection.toLowerCase().includes('overview')) {
          summary = currentContent.join('\n').trim();
        } else {
          findings.push({
            title: currentSection,
            content: currentContent.join('\n').trim()
          });
        }
      }
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else if (line.trim()) {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection && currentContent.length > 0) {
    if (currentSection.toLowerCase().includes('summary') || currentSection.toLowerCase().includes('overview')) {
      summary = currentContent.join('\n').trim();
    } else {
      findings.push({
        title: currentSection,
        content: currentContent.join('\n').trim()
      });
    }
  }
  
  // If no summary found, use first paragraph
  if (!summary && text) {
    const firstParagraph = text.split('\n\n')[0];
    summary = firstParagraph.substring(0, 500);
  }
  
  return { summary, findings };
}
