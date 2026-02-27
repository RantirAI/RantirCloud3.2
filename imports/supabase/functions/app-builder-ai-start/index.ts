import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct API endpoints - NO Lovable Gateway
const MODEL_CONFIG: Record<string, { provider: string; model: string; envKey: string }> = {
  'gemini-3.1': { provider: 'google', model: 'gemini-2.0-flash', envKey: 'GOOGLE_API_KEY' },
  'gemini-2.0': { provider: 'google', model: 'gemini-2.0-flash', envKey: 'GOOGLE_API_KEY' },
  'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-20250514', envKey: 'ANTHROPIC_API_KEY' },
  'claude-opus-4.1': { provider: 'anthropic', model: 'claude-sonnet-4-20250514', envKey: 'ANTHROPIC_API_KEY' },
  'gpt-4.1': { provider: 'openai', model: 'gpt-4-turbo', envKey: 'OPENAI_API_KEY' },
  'gpt-4o': { provider: 'openai', model: 'gpt-4-turbo', envKey: 'OPENAI_API_KEY' },
  'gpt-5': { provider: 'openai', model: 'gpt-4-turbo', envKey: 'OPENAI_API_KEY' },
  'default': { provider: 'google', model: 'gemini-2.0-flash', envKey: 'GOOGLE_API_KEY' },
};

// Direct OpenAI API call
async function callOpenAI(
  apiKey: string, 
  model: string, 
  systemPrompt: string, 
  userPrompt: string, 
  maxTokens: number, 
  temperature: number, 
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`[OpenAI] Calling ${model} with timeout ${timeoutMs}ms`);
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt }, 
          { role: 'user', content: userPrompt }
        ] 
      }),
      signal: controller.signal,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[OpenAI] Response in ${elapsed}ms, status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] Error: ${response.status}`, errorText);
      throw new Error(`OpenAI error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`[OpenAI] Response length: ${content.length} chars`);
    return content;
  } finally { 
    clearTimeout(timeoutId); 
  }
}

// Direct Google Gemini API call
async function callGemini(
  apiKey: string, 
  model: string, 
  systemPrompt: string, 
  userPrompt: string, 
  maxTokens: number, 
  temperature: number, 
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`[Gemini] Calling ${model} with timeout ${timeoutMs}ms`);
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] 
        }],
        generationConfig: { 
          maxOutputTokens: maxTokens, 
          temperature 
        }
      }),
      signal: controller.signal,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[Gemini] Response in ${elapsed}ms, status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] Error: ${response.status}`, errorText);
      throw new Error(`Gemini error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[Gemini] Response length: ${content.length} chars`);
    return content;
  } finally { 
    clearTimeout(timeoutId); 
  }
}

// Direct Anthropic Claude API call
async function callAnthropic(
  apiKey: string, 
  model: string, 
  systemPrompt: string, 
  userPrompt: string, 
  maxTokens: number, 
  temperature: number, 
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`[Anthropic] Calling ${model} with timeout ${timeoutMs}ms`);
    const startTime = Date.now();
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'x-api-key': apiKey, 
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }] 
      }),
      signal: controller.signal,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[Anthropic] Response in ${elapsed}ms, status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Anthropic] Error: ${response.status}`, errorText);
      throw new Error(`Anthropic error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    console.log(`[Anthropic] Response length: ${content.length} chars`);
    return content;
  } finally { 
    clearTimeout(timeoutId); 
  }
}

// Unified AI caller - routes to correct provider via DIRECT API with fallback
async function callAIModel(
  modelKey: string, 
  systemPrompt: string, 
  userPrompt: string, 
  maxTokens = 16000, 
  temperature = 0.7, 
  timeoutMs = 60000
): Promise<string> {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['default'];
  let apiKey = Deno.env.get(config.envKey);
  
  // If primary API key missing, try to fallback to Gemini
  if (!apiKey) {
    console.warn(`[AI Call] Missing API key: ${config.envKey}, trying Gemini fallback`);
    const geminiKey = Deno.env.get('GOOGLE_API_KEY');
    if (geminiKey) {
      console.log(`[AI Call] Falling back to Gemini`);
      return await callGemini(geminiKey, 'gemini-2.0-flash', systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
    }
    throw new Error(`No API keys configured`);
  }
  
  console.log(`[AI Call] Using ${config.provider}/${config.model} via direct API`);
  
  try {
    switch (config.provider) {
      case 'openai':
        return await callOpenAI(apiKey, config.model, systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
      case 'google':
        return await callGemini(apiKey, config.model, systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
      case 'anthropic':
        return await callAnthropic(apiKey, config.model, systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[AI Call] Request timed out after ${timeoutMs}ms`);
      throw new Error('AI_TIMEOUT');
    }
    
    // If OpenAI fails with 404 or similar, fallback to Gemini
    if (config.provider === 'openai' && (error.message.includes('404') || error.message.includes('401') || error.message.includes('403'))) {
      console.warn(`[AI Call] OpenAI error (${error.message}), falling back to Gemini`);
      const geminiKey = Deno.env.get('GOOGLE_API_KEY');
      if (geminiKey) {
        return await callGemini(geminiKey, 'gemini-2.0-flash', systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
      }
    }
    
    // If Anthropic fails, fallback to Gemini
    if (config.provider === 'anthropic' && (error.message.includes('401') || error.message.includes('403') || error.message.includes('404'))) {
      console.warn(`[AI Call] Anthropic error (${error.message}), falling back to Gemini`);
      const geminiKey = Deno.env.get('GOOGLE_API_KEY');
      if (geminiKey) {
        return await callGemini(geminiKey, 'gemini-2.0-flash', systemPrompt, userPrompt, maxTokens, temperature, timeoutMs);
      }
    }
    
    throw error;
  }
}

const SKELETON_SYSTEM_PROMPT = `Return ONLY valid JSON, no markdown, no comments:
{ "sections": [{ "id": "nav-section", "type": "nav", "title": "Navigation" }, ...] }
Include 5-8 sections for a complete page.`;

const DEFAULT_SKELETON = { 
  sections: [
    { id: 'nav-section', type: 'nav', title: 'Navigation' }, 
    { id: 'hero-section', type: 'hero', title: 'Hero' }, 
    { id: 'features-section', type: 'features', title: 'Features' }, 
    { id: 'cta-section', type: 'cta', title: 'CTA' }, 
    { id: 'footer-section', type: 'footer', title: 'Footer' }
  ] 
};

function parseJsonSafe(text: string): Record<string, unknown> | null {
  if (!text || text.trim().length === 0) {
    console.warn('[parseJsonSafe] Empty text received');
    return null;
  }
  
  try {
    // Remove markdown code fences and comments
    const sanitized = text
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
    
    return JSON.parse(sanitized);
  } catch (e) {
    console.warn('[parseJsonSafe] First parse failed, trying to extract JSON object');
    
    // Try to find JSON object in the text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end > start) {
      try { 
        const extracted = text.slice(start, end + 1);
        return JSON.parse(extracted); 
      } catch { 
        console.warn('[parseJsonSafe] Extracted JSON parse failed');
      }
    }
    
    // Last resort: try to find JSON array
    const arrStart = text.indexOf('[');
    const arrEnd = text.lastIndexOf(']');
    
    if (arrStart !== -1 && arrEnd > arrStart) {
      try { 
        const extracted = text.slice(arrStart, arrEnd + 1);
        return { steps: JSON.parse(extracted) }; 
      } catch { 
        console.warn('[parseJsonSafe] Extracted array parse failed');
      }
    }
    
    return null;
  }
}

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Main system prompt for generating UI components
const MAIN_SYSTEM_PROMPT = `You are an EXPERT UI DESIGNER creating STUNNING web applications.
Return ONLY valid JSON (no markdown, no comments, no explanatory text) in this exact format:
{
  "success": true,
  "steps": [
    { "type": "component", "data": { "id": "section-id", "type": "section", "style": {...}, "children": [...] } }
  ],
  "summary": "Brief description"
}

CRITICAL REQUIREMENTS:
1. Generate complete, professional pages with navigation, hero, content sections, CTA, and footer
2. Use semantic IDs like "nav-section", "hero-section", "about-section" - NEVER use generic IDs like "div-1"
3. Use HSL color tokens: hsl(var(--foreground)), hsl(var(--background)), hsl(var(--primary)), hsl(var(--muted-foreground))
4. Use responsive layouts with proper padding (80px vertical for sections) and maxWidth: "1200px"
5. Every button MUST have explicit "content" prop - NEVER leave buttons without text
6. Use proper typography hierarchy: headlines 40-64px, body 16px, labels 12-14px
7. Include visual polish: shadows on cards, hover states, gradient backgrounds for hero/CTA
8. Return PURE JSON only - no markdown code blocks, no comments, no extra text`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model from context - NEVER auto-fallback, respect user's choice
    const selectedModel = context?.model || 'gemini-3.1';
    console.log(`[AI Build Start] Creating job for user ${user.id} with model ${selectedModel}`);

    // Create the job in the database
    const { data: job, error: insertError } = await supabase
      .from('ai_build_jobs')
      .insert({
        user_id: user.id,
        project_id: context?.projectId || null,
        model: selectedModel,
        prompt,
        context,
        status: 'pending',
        progress: 0,
        current_step: 'Queued for processing...',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[AI Build Start] Failed to create job:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create build job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AI Build Start] Job created: ${job.id}`);

    // Start background processing using waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(processJobDirectly(job.id, prompt, selectedModel, context));

    // Return immediately with job ID
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: 'pending',
        message: 'Build job started. Poll /app-builder-ai-status for updates.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Build Start] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Background job processor - calls AI models DIRECTLY (no gateway)
async function processJobDirectly(
  jobId: string, 
  prompt: string, 
  model: string, 
  context: Record<string, unknown>
) {
  console.log(`[AI Build Background] Starting direct processing for job ${jobId} with model ${model}`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const updateJob = async (updates: Record<string, unknown>) => {
    const { error } = await supabase
      .from('ai_build_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) {
      console.error(`[AI Build Background] Job ${jobId} update failed:`, error);
    }
  };

  try {
    // Update: processing started
    await updateJob({ 
      status: 'processing', 
      progress: 5, 
      current_step: 'Initializing AI model...' 
    });

    // Determine if this is a complex build (multi-section page)
    const isComplex = isComplexBuild(prompt);
    console.log(`[AI Build Background] Job ${jobId} - Complex build: ${isComplex}`);

    let result: Record<string, unknown>;

    if (isComplex) {
      // Multi-stage generation for complex builds
      result = await generateMultiStage(jobId, prompt, model, context, updateJob);
    } else {
      // Simple single-call generation
      result = await generateSimple(jobId, prompt, model, context, updateJob);
    }

    // Success! Store the result
    await updateJob({
      status: 'complete',
      progress: 100,
      current_step: 'Complete!',
      result: result,
      completed_at: new Date().toISOString(),
    });

    console.log(`[AI Build Background] Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`[AI Build Background] Job ${jobId} failed:`, error);
    
    await updateJob({
      status: 'failed',
      progress: 0,
      error: error.message || 'Processing failed',
      current_step: `Failed: ${error.message || 'Processing failed'}`,
      completed_at: new Date().toISOString(),
    });
  }
}

// Check if build is complex (multi-section page)
function isComplexBuild(prompt: string): boolean {
  const complexKeywords = [
    'page', 'website', 'landing', 'portfolio', 'dashboard',
    'full', 'complete', 'entire', 'whole', 'sections', 'app',
    'homepage', 'site', 'store', 'shop'
  ];
  const lowerPrompt = prompt.toLowerCase();
  return complexKeywords.some(kw => lowerPrompt.includes(kw));
}

// Simple single-call generation for small components
async function generateSimple(
  jobId: string,
  prompt: string,
  model: string,
  context: Record<string, unknown>,
  updateJob: (updates: Record<string, unknown>) => Promise<void>
): Promise<Record<string, unknown>> {
  console.log(`[AI Build Background] Job ${jobId} - Using simple generation`);
  
  await updateJob({ progress: 20, current_step: 'Generating components...' });

  const response = await callAIModel(
    model,
    MAIN_SYSTEM_PROMPT,
    `Create UI for: ${prompt}\n\nContext: ${JSON.stringify(context || {})}`,
    16000,
    0.7,
    55000 // 55s timeout - under platform limits
  );

  console.log(`[AI Build Background] Job ${jobId} - Simple generation response length: ${response.length}`);
  console.log(`[AI Build Background] Job ${jobId} - First 500 chars: ${response.slice(0, 500)}`);

  await updateJob({ progress: 80, current_step: 'Processing response...' });

  const parsed = parseJsonSafe(response);
  if (!parsed) {
    console.error(`[AI Build Background] Job ${jobId} - Failed to parse response:`, response.slice(0, 1000));
    throw new Error('Failed to parse AI response');
  }

  return parsed;
}

// Multi-stage generation with PARALLEL section generation for speed
async function generateMultiStage(
  jobId: string,
  prompt: string,
  model: string,
  context: Record<string, unknown>,
  updateJob: (updates: Record<string, unknown>) => Promise<void>
): Promise<Record<string, unknown>> {
  console.log(`[AI Build Background] Job ${jobId} - Using multi-stage parallel generation`);
  
  // Phase 1: Generate skeleton (fast, defines structure)
  console.log(`[AI Build Background] Job ${jobId} - Phase 1: Generating skeleton...`);
  await updateJob({ progress: 10, current_step: 'Planning page structure...' });

  let skeleton;
  try {
    const skeletonResponse = await callAIModel(
      model,
      SKELETON_SYSTEM_PROMPT,
      `Create a page skeleton for: ${prompt}\n\nReturn ONLY JSON with sections array, no markdown, no comments.`,
      2000,
      0.7,
      20000 // 20s for skeleton
    );
    
    console.log(`[AI Build Background] Job ${jobId} - Skeleton response: ${skeletonResponse.slice(0, 500)}`);
    
    skeleton = parseJsonSafe(skeletonResponse);
    if (!skeleton?.sections || !Array.isArray(skeleton.sections)) {
      console.warn(`[AI Build Background] Job ${jobId} - Skeleton parse failed, using default`);
      skeleton = DEFAULT_SKELETON;
    }
  } catch (error) {
    console.warn(`[AI Build Background] Job ${jobId} - Skeleton generation failed:`, error.message);
    skeleton = DEFAULT_SKELETON;
  }

  const sections = skeleton.sections || DEFAULT_SKELETON.sections;
  console.log(`[AI Build Background] Job ${jobId} - Skeleton has ${sections.length} sections`);
  
  await updateJob({ 
    progress: 15, 
    current_step: `Building ${sections.length} sections in parallel...`,
    skeleton: skeleton 
  });

  // Phase 2: Generate sections in PARALLEL batches of 3 for speed
  const allSteps: Record<string, unknown>[] = [];
  const BATCH_SIZE = 3;
  const batches: typeof sections[] = [];
  
  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    batches.push(sections.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`[AI Build Background] Job ${jobId} - Processing ${batches.length} batches of sections`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const batchProgress = 15 + Math.round(((batchIdx + 1) / batches.length) * 70);
    
    await updateJob({ 
      progress: batchProgress - 10, 
      current_step: `Building batch ${batchIdx + 1}/${batches.length}: ${batch.map((s: any) => s.type).join(', ')}...`,
      sections: { currentBatch: batchIdx + 1, totalBatches: batches.length }
    });

    // Generate all sections in this batch IN PARALLEL
    const batchPromises = batch.map(async (section: any) => {
      const sectionPrompt = `Generate the ${section.type} section for: ${prompt}
      
Section details:
- ID: ${section.id}
- Type: ${section.type}
- Title: ${section.title || section.type}
${section.description ? `- Description: ${section.description}` : ''}

REQUIREMENTS:
- Return ONLY valid JSON with "steps" array containing component definitions
- Use semantic IDs starting with "${section.id}-" for child elements
- Include proper styling: padding, colors, typography
- Make it visually polished and professional
- NO markdown, NO comments, PURE JSON only`;

      try {
        const sectionResponse = await callAIModel(
          model,
          MAIN_SYSTEM_PROMPT,
          sectionPrompt,
          5000, // Reduced tokens per section
          0.7,
          35000 // 35s per section
        );

        console.log(`[AI Build Background] Job ${jobId} - Section ${section.id} response length: ${sectionResponse.length}`);
        console.log(`[AI Build Background] Job ${jobId} - Section ${section.id} first 300 chars: ${sectionResponse.slice(0, 300)}`);

        const sectionResult = parseJsonSafe(sectionResponse);
        if (sectionResult?.steps && Array.isArray(sectionResult.steps)) {
          console.log(`[AI Build Background] Job ${jobId} - Section ${section.id} generated ${sectionResult.steps.length} steps`);
          return { success: true, sectionId: section.id, steps: sectionResult.steps };
        } else if (sectionResult?.success && sectionResult?.steps) {
          return { success: true, sectionId: section.id, steps: sectionResult.steps };
        }
        
        console.warn(`[AI Build Background] Job ${jobId} - Section ${section.id} parse failed, using fallback`);
        return { 
          success: false, 
          sectionId: section.id, 
          steps: [getMinimalSectionTemplate(section.type, section.id)]
        };
      } catch (error) {
        console.warn(`[AI Build Background] Job ${jobId} - Section ${section.id} failed:`, error.message);
        // Return minimal fallback template for failed sections
        return { 
          success: false, 
          sectionId: section.id, 
          steps: [getMinimalSectionTemplate(section.type, section.id)]
        };
      }
    });

    // Wait for all parallel requests in this batch
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result.steps && result.steps.length > 0) {
        allSteps.push(...result.steps);
      }
    }

    await updateJob({ 
      progress: batchProgress, 
      current_step: `Completed batch ${batchIdx + 1}/${batches.length}`,
      sections: { completedBatches: batchIdx + 1, totalBatches: batches.length }
    });
  }

  // Phase 3: Finalize
  console.log(`[AI Build Background] Job ${jobId} - Phase 3: Finalizing with ${allSteps.length} total steps`);
  await updateJob({ progress: 90, current_step: 'Finalizing build...' });

  // If all sections failed, return a basic fallback page instead of throwing
  if (allSteps.length === 0) {
    console.warn(`[AI Build Background] Job ${jobId} - All sections failed, returning fallback page`);
    return {
      success: true,
      steps: [
        getMinimalSectionTemplate('nav', 'nav-section'),
        getMinimalSectionTemplate('hero', 'hero-section'),
        getMinimalSectionTemplate('features', 'features-section'),
        getMinimalSectionTemplate('cta', 'cta-section'),
        getMinimalSectionTemplate('footer', 'footer-section')
      ],
      summary: `Fallback page generated for: ${prompt.slice(0, 50)}...`,
      warning: 'AI generation partially failed, showing fallback templates'
    };
  }

  return {
    success: true,
    steps: allSteps,
    summary: `Generated ${sections.length}-section page for: ${prompt.slice(0, 50)}...`
  };
}

// Minimal fallback template for sections that fail to generate
function getMinimalSectionTemplate(sectionType: string, sectionId: string): Record<string, unknown> {
  const templates: Record<string, Record<string, unknown>> = {
    nav: {
      type: 'component',
      data: {
        id: sectionId,
        type: 'container',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          backgroundColor: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))'
        },
        children: [
          {
            id: `${sectionId}-logo`,
            type: 'text',
            props: { content: 'Logo' },
            style: { fontWeight: '700', fontSize: '20px', color: 'hsl(var(--foreground))' }
          },
          {
            id: `${sectionId}-nav-links`,
            type: 'container',
            style: { display: 'flex', gap: '24px' },
            children: [
              { id: `${sectionId}-link-1`, type: 'text', props: { content: 'Home' }, style: { color: 'hsl(var(--foreground))' } },
              { id: `${sectionId}-link-2`, type: 'text', props: { content: 'About' }, style: { color: 'hsl(var(--foreground))' } },
              { id: `${sectionId}-link-3`, type: 'text', props: { content: 'Contact' }, style: { color: 'hsl(var(--foreground))' } }
            ]
          }
        ]
      }
    },
    hero: {
      type: 'component',
      data: {
        id: sectionId,
        type: 'section',
        style: {
          padding: '80px 32px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--background)))'
        },
        children: [
          {
            id: `${sectionId}-headline`,
            type: 'text',
            props: { content: 'Welcome to Our Platform' },
            style: { fontSize: '48px', fontWeight: '700', marginBottom: '16px', color: 'hsl(var(--foreground))' }
          },
          {
            id: `${sectionId}-subheadline`,
            type: 'text',
            props: { content: 'Build something amazing with our tools' },
            style: { fontSize: '18px', color: 'hsl(var(--muted-foreground))', marginBottom: '32px' }
          },
          {
            id: `${sectionId}-cta`,
            type: 'button',
            props: { content: 'Get Started' },
            style: { padding: '12px 32px', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '8px' }
          }
        ]
      }
    },
    features: {
      type: 'component',
      data: {
        id: sectionId,
        type: 'section',
        style: { padding: '80px 32px', backgroundColor: 'hsl(var(--background))' },
        children: [
          {
            id: `${sectionId}-title`,
            type: 'text',
            props: { content: 'Features' },
            style: { fontSize: '36px', fontWeight: '700', textAlign: 'center', marginBottom: '48px', color: 'hsl(var(--foreground))' }
          },
          {
            id: `${sectionId}-grid`,
            type: 'container',
            style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', maxWidth: '1200px', margin: '0 auto' },
            children: [
              { id: `${sectionId}-feature-1`, type: 'container', style: { padding: '24px', backgroundColor: 'hsl(var(--card))', borderRadius: '12px' }, children: [{ id: `${sectionId}-f1-title`, type: 'text', props: { content: 'Feature 1' }, style: { fontWeight: '600', marginBottom: '8px' } }, { id: `${sectionId}-f1-desc`, type: 'text', props: { content: 'Description here' }, style: { color: 'hsl(var(--muted-foreground))' } }] },
              { id: `${sectionId}-feature-2`, type: 'container', style: { padding: '24px', backgroundColor: 'hsl(var(--card))', borderRadius: '12px' }, children: [{ id: `${sectionId}-f2-title`, type: 'text', props: { content: 'Feature 2' }, style: { fontWeight: '600', marginBottom: '8px' } }, { id: `${sectionId}-f2-desc`, type: 'text', props: { content: 'Description here' }, style: { color: 'hsl(var(--muted-foreground))' } }] },
              { id: `${sectionId}-feature-3`, type: 'container', style: { padding: '24px', backgroundColor: 'hsl(var(--card))', borderRadius: '12px' }, children: [{ id: `${sectionId}-f3-title`, type: 'text', props: { content: 'Feature 3' }, style: { fontWeight: '600', marginBottom: '8px' } }, { id: `${sectionId}-f3-desc`, type: 'text', props: { content: 'Description here' }, style: { color: 'hsl(var(--muted-foreground))' } }] }
            ]
          }
        ]
      }
    },
    cta: {
      type: 'component',
      data: {
        id: sectionId,
        type: 'section',
        style: { padding: '80px 32px', textAlign: 'center', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
        children: [
          { id: `${sectionId}-title`, type: 'text', props: { content: 'Ready to Get Started?' }, style: { fontSize: '36px', fontWeight: '700', marginBottom: '16px' } },
          { id: `${sectionId}-subtitle`, type: 'text', props: { content: 'Join thousands of users today' }, style: { fontSize: '18px', marginBottom: '32px', opacity: '0.9' } },
          { id: `${sectionId}-button`, type: 'button', props: { content: 'Start Now' }, style: { padding: '12px 32px', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', borderRadius: '8px' } }
        ]
      }
    },
    footer: {
      type: 'component',
      data: {
        id: sectionId,
        type: 'container',
        style: { padding: '48px 32px', backgroundColor: 'hsl(var(--muted))', textAlign: 'center' },
        children: [
          { id: `${sectionId}-copyright`, type: 'text', props: { content: '© 2025 Company. All rights reserved.' }, style: { color: 'hsl(var(--muted-foreground))' } }
        ]
      }
    }
  };

  return templates[sectionType] || templates.cta;
}
