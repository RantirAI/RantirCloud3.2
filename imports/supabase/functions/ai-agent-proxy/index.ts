import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      apiKey,
      model,
      instructions,
      messages,
      inputData,
      temperature,
      knowledgeFiles,
      flowProjectId,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- 1. Resolve API key ---
    let resolvedKey = apiKey || "";

    // If it's a vault reference like {{env.MY_KEY}}
    const envMatch = resolvedKey.match(/^\{\{env\.(.+?)\}\}$/);
    if (envMatch && flowProjectId) {
      const secretName = envMatch[1];
      const { data: secrets } = await supabase.rpc("get_all_flow_secrets", {
        p_flow_project_id: flowProjectId,
      });
      if (secrets && secrets[secretName]) {
        resolvedKey = secrets[secretName];
      } else {
        // Case-insensitive fallback
        const match = Object.entries(secrets || {}).find(
          ([k]) => k.toLowerCase() === secretName.toLowerCase()
        );
        if (match) resolvedKey = match[1] as string;
      }
    }

    if (!resolvedKey || resolvedKey.startsWith("{{")) {
      return new Response(
        JSON.stringify({ error: "API key could not be resolved. Please configure a valid API key in your vault secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 2. Resolve model (handle accidental {{env.*}} in model field) ---
    let resolvedModel = model || "gpt-4o";
    if (resolvedModel.startsWith("{{env.")) {
      // Model field has a secret ref — swap: use it as key, pick default model
      if (!resolvedKey || resolvedKey === apiKey) {
        const mMatch = resolvedModel.match(/^\{\{env\.(.+?)\}\}$/);
        if (mMatch && flowProjectId) {
          const { data: secrets } = await supabase.rpc("get_all_flow_secrets", {
            p_flow_project_id: flowProjectId,
          });
          if (secrets?.[mMatch[1]]) resolvedKey = secrets[mMatch[1]];
        }
      }
      resolvedModel = resolvedKey.startsWith("sk-ant-") ? "claude-sonnet-4-6" : "gpt-4o";
    }

    // --- 3. Load knowledge files ---
    let knowledgeContext = "";
    if (knowledgeFiles && Array.isArray(knowledgeFiles) && knowledgeFiles.length > 0) {
      const chunks: string[] = [];
      for (const file of knowledgeFiles) {
        try {
          const storagePath = file.storagePath || file.path;
          if (!storagePath) continue;
          const { data: fileData, error: fileError } = await supabase.storage
            .from("flow-node-files")
            .download(storagePath);
          if (fileError || !fileData) continue;
          const text = await fileData.text();
          chunks.push(`--- ${file.name || storagePath} ---\n${text}`);
        } catch {
          // Skip unreadable files
        }
      }
      if (chunks.length > 0) {
        knowledgeContext = "\n\n## Reference Documents\n" + chunks.join("\n\n");
      }
    }

    // --- 4. Build messages ---
    const systemContent = (instructions || "You are a helpful AI assistant.") + knowledgeContext;

    // Parse inputData if present
    let userMessages: any[] = [];
    if (messages && Array.isArray(messages) && messages.length > 0) {
      userMessages = messages;
    } else if (inputData) {
      let parsed = inputData;
      if (typeof inputData === "string") {
        try { parsed = JSON.parse(inputData); } catch { parsed = { input: inputData }; }
      }
      if (parsed?.messages && Array.isArray(parsed.messages)) {
        userMessages = parsed.messages;
      } else {
        userMessages = [{ role: "user", content: typeof parsed === "string" ? parsed : JSON.stringify(parsed) }];
      }
    } else {
      userMessages = [{ role: "user", content: "Hello" }];
    }

    const temp = typeof temperature === "number" ? temperature : 0.7;

    // --- 5. Detect provider and call API ---
    const isAnthropic = resolvedModel.startsWith("claude") || resolvedKey.startsWith("sk-ant-");
    const isMinimax = resolvedModel.startsWith("minimax") || resolvedModel.includes("MiniMax");

    let responseText = "";
    let tokenUsage = { prompt: 0, completion: 0, total: 0 };

    if (isAnthropic) {
      // Anthropic Messages API
      const anthropicMessages = userMessages.filter((m: any) => m.role !== "system");
      if (anthropicMessages.length === 0) {
        anthropicMessages.push({ role: "user", content: "Hello" });
      }

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": resolvedKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: 4096,
          temperature: temp,
          system: systemContent,
          messages: anthropicMessages,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("Anthropic error:", resp.status, errBody);
        return new Response(
          JSON.stringify({ error: `Anthropic API error (${resp.status}): ${errBody}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      responseText = data.content?.[0]?.text || "";
      tokenUsage = {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    } else {
      // OpenAI-compatible (OpenAI + MiniMax)
      const apiUrl = isMinimax
        ? "https://api.minimax.io/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      const allMessages = [
        { role: "system", content: systemContent },
        ...userMessages,
      ];

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: allMessages,
          temperature: temp,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("AI API error:", resp.status, errBody);
        return new Response(
          JSON.stringify({ error: `AI API error (${resp.status}): ${errBody}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      responseText = data.choices?.[0]?.message?.content || "";
      tokenUsage = {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      };
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        metadata: {
          model: resolvedModel,
          timestamp: new Date().toISOString(),
          tokens: tokenUsage,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-agent-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
