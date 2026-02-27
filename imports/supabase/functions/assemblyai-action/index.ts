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
    const { apiKey, action, audioUrl, transcriptId, fileUrl, format, words, transcriptIds, prompt, requestId } = await req.json();
    
    if (!apiKey) {
      throw new Error("AssemblyAI API key is required");
    }

    const headers = {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    };

    let response;
    let result;

    console.log('AssemblyAI action:', action);

    switch (action) {
      case 'uploadFile':
        if (!fileUrl) {
          throw new Error("File URL is required for uploadFile action");
        }
        
        // Download the file first
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }
        const fileData = await fileResponse.arrayBuffer();
        
        response = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
          },
          body: fileData,
        });
        break;

      case 'transcribe':
        if (!audioUrl) {
          throw new Error("Audio URL is required for transcribe action");
        }
        
        response = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            audio_url: audioUrl,
          }),
        });
        break;

      case 'getTranscript':
        if (!transcriptId) {
          throw new Error("Transcript ID is required for getTranscript action");
        }
        
        response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers,
        });
        break;

      case 'getSentences':
        if (!transcriptId) {
          throw new Error("Transcript ID is required for getSentences action");
        }
        
        response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`, {
          headers,
        });
        break;

      case 'getParagraphs':
        if (!transcriptId) {
          throw new Error("Transcript ID is required for getParagraphs action");
        }
        
        response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/paragraphs`, {
          headers,
        });
        break;

      case 'getSubtitles':
        if (!transcriptId) {
          throw new Error("Transcript ID is required for getSubtitles action");
        }
        if (!format) {
          throw new Error("Format is required for getSubtitles action");
        }
        
        response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/${format}`, {
          headers,
        });
        
        // Subtitles return plain text, not JSON
        const subtitles = await response.text();
        return new Response(JSON.stringify({ subtitles }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'deleteTranscript':
        if (!transcriptId) {
          throw new Error("Transcript ID is required for deleteTranscript action");
        }
        
        response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          method: 'DELETE',
          headers,
        });
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AssemblyAI API error:', response.status, errorText);
      
      let errorMessage = `AssemblyAI API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    result = await response.json();
    console.log('AssemblyAI result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AssemblyAI error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
