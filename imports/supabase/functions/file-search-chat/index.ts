import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Text-based file extensions that we can read content from
const TEXT_FILE_EXTENSIONS = [
  'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'log', 'env',
  'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'scss', 'sql',
  'sh', 'bash', 'zsh', 'conf', 'cfg', 'ini', 'properties'
];

// Max content size per file (characters)
const MAX_CONTENT_PER_FILE = 5000;
const MAX_FILES_TO_ANALYZE = 10;

function isTextFile(fileType: string): boolean {
  return TEXT_FILE_EXTENSIONS.includes(fileType.toLowerCase());
}

async function fetchFileContent(filePath: string): Promise<string | null> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, MAX_CONTENT_PER_FILE);
  } catch (error) {
    console.error(`[file-search-chat] Failed to fetch file content: ${filePath}`, error);
    return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId, databaseId, conversationHistory } = await req.json();

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

    console.log(`[file-search-chat] Processing file question for user: ${userId}`);

    // Extract search keywords from question
    const searchKeywords = question.toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(' ')
      .filter((w: string) => w.length > 2 && !['the', 'what', 'how', 'can', 'you', 'find', 'show', 'get', 'all', 'any', 'file', 'files', 'document', 'documents'].includes(w));

    // Query files - if databaseId provided, filter to that database, otherwise get all user files
    let filesQuery = supabase
      .from('drive_files')
      .select('id, name, file_type, file_path, file_size, mime_type, database_id, folder_id, created_at, updated_at')
      .eq('uploaded_by', userId)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (databaseId) {
      filesQuery = filesQuery.eq('database_id', databaseId);
    }

    const { data: allFiles, error: filesError } = await filesQuery;

    if (filesError) {
      console.error('[file-search-chat] Error fetching files:', filesError);
      throw new Error('Failed to fetch files');
    }

    // Get database names for context
    const dbIds = [...new Set((allFiles || []).map(f => f.database_id))];
    const { data: databases } = await supabase
      .from('databases')
      .select('id, name')
      .in('id', dbIds);

    const dbNameMap = new Map((databases || []).map(db => [db.id, db.name]));

    // Search/filter files based on keywords
    let relevantFiles = (allFiles || []).filter(file => {
      const fileName = file.name.toLowerCase();
      const fileType = file.file_type.toLowerCase();
      
      // Match if any keyword appears in filename or type
      return searchKeywords.some((kw: string) => 
        fileName.includes(kw) || fileType.includes(kw)
      ) || searchKeywords.length === 0;
    });

    // Limit files for analysis
    const filesToAnalyze = relevantFiles.slice(0, MAX_FILES_TO_ANALYZE);

    console.log(`[file-search-chat] Found ${relevantFiles.length} relevant files, analyzing ${filesToAnalyze.length}`);

    // Fetch content for text-based files
    const filesWithContent = await Promise.all(
      filesToAnalyze.map(async (file) => {
        let content: string | null = null;
        
        if (isTextFile(file.file_type)) {
          content = await fetchFileContent(file.file_path);
        }

        return {
          ...file,
          database_name: dbNameMap.get(file.database_id) || 'Unknown Database',
          content,
          content_preview: content ? content.slice(0, 500) : null
        };
      })
    );

    // Build context for AI
    const fileContextList = filesWithContent.map((f, idx) => {
      let fileInfo = `${idx + 1}. "${f.name}" (${f.file_type}, ${formatFileSize(f.file_size)}) in ${f.database_name}`;
      
      if (f.content) {
        fileInfo += `\n   CONTENT:\n   ${f.content.replace(/\n/g, '\n   ')}`;
      } else if (!isTextFile(f.file_type)) {
        fileInfo += `\n   [Binary file - content not readable. Type: ${f.mime_type || f.file_type}]`;
      }
      
      return fileInfo;
    }).join('\n\n');

    const systemPrompt = `You are an intelligent file search and analysis assistant. You have access to the user's files stored in their workspace Drive.

AVAILABLE FILES (${filesWithContent.length} files analyzed, ${relevantFiles.length} total matching):

${fileContextList || 'No files found matching the query.'}

${relevantFiles.length > MAX_FILES_TO_ANALYZE ? `\n[Note: ${relevantFiles.length - MAX_FILES_TO_ANALYZE} additional files were found but not analyzed to keep response time fast.]` : ''}

INSTRUCTIONS:
1. Answer questions based on the file contents and metadata above
2. If asked to find files, search through the list and describe what you found
3. For text files with content, you can quote specific parts
4. For binary files (images, PDFs, spreadsheets), describe based on filename and metadata
5. Reference specific file names in your answers
6. If a file isn't found, suggest how the user might find it
7. Be concise but helpful
8. When referencing files, include their type and location (database name)

RESPONSE FORMAT:
Return ONLY a JSON object (no markdown, no code fences) with:
{
  "message": "Your helpful response with insights from the files",
  "referencedFiles": [{"id": "file-id", "name": "filename.ext", "database_id": "db-id", "database_name": "Database Name"}],
  "summary": "Brief one-line summary of what was found"
}

Only include referencedFiles for files you specifically mention or analyze in your response.`;

    // Call AI API
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
        max_tokens: 1500
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
      console.error("[file-search-chat] AI error:", errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("[file-search-chat] AI response:", content.slice(0, 200));

    // Parse AI response
    let parsedResponse: { message?: string; referencedFiles?: any[]; summary?: string } = {};
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { message: content, referencedFiles: [], summary: "" };
      }
    } catch {
      parsedResponse = { message: content, referencedFiles: [], summary: "" };
    }

    // Validate referenced files against actual files
    if (parsedResponse.referencedFiles && Array.isArray(parsedResponse.referencedFiles)) {
      parsedResponse.referencedFiles = parsedResponse.referencedFiles.filter((ref: any) => 
        filesWithContent.some(f => f.id === ref.id || f.name === ref.name)
      ).map((ref: any) => {
        const actualFile = filesWithContent.find(f => f.id === ref.id || f.name === ref.name);
        if (actualFile) {
          return {
            id: actualFile.id,
            name: actualFile.name,
            file_type: actualFile.file_type,
            file_path: actualFile.file_path,
            database_id: actualFile.database_id,
            database_name: actualFile.database_name
          };
        }
        return ref;
      });
    }

    return new Response(
      JSON.stringify({
        message: parsedResponse.message || "I couldn't analyze the files. Please try again.",
        referencedFiles: parsedResponse.referencedFiles || [],
        summary: parsedResponse.summary || "",
        totalFilesSearched: relevantFiles.length,
        filesAnalyzed: filesWithContent.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[file-search-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
