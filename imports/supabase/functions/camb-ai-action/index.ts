import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { apiKey, action, text, voice, sourceLanguage, targetLanguage, audioUrl, endpoint, method = 'GET', body } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    // Handle custom API call
    if (action === 'createCustomApiCall') {
      if (!endpoint) {
        throw new Error('API endpoint is required for custom API call');
      }

      const url = `https://client.camb.ai/apis${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      console.log(`Camb.ai Custom API: ${method} ${url}`);

      const options: RequestInit = {
        method,
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Camb.ai API error: ${response.status}, Content-Type: ${contentType}, Body: ${errorText.substring(0, 80)}`);
        throw new Error(`Camb.ai API error: ${response.status} ${errorText}`);
      }

      // Robust response parsing for custom API calls
      let data;
      console.log(`Custom API response Content-Type: ${contentType}`);
      
      if (contentType?.includes('text/plain')) {
        const textResult = await response.text();
        data = { result: textResult };
      } else {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.warn('Failed to parse JSON, falling back to text:', jsonError);
          const textResult = await response.text();
          data = { result: textResult };
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle standard actions with validation
    let url = 'https://client.camb.ai/apis';
    let requestBody: any = {};
    let requestMethod = 'POST';

    switch (action) {
      case 'createTextToSound':
        if (!text) throw new Error('Text is required for text-to-sound');
        url += '/text-to-sound';
        requestBody = { text };
        break;
      case 'createTextToSpeech':
        if (!text) throw new Error('Text is required for text-to-speech');
        url += '/tts';
        requestBody = { text, voice_id: voice };
        break;
      case 'createTranslation':
        if (!text) throw new Error('Text is required for translation');
        if (!sourceLanguage) throw new Error('Source language is required for translation');
        if (!targetLanguage) throw new Error('Target language is required for translation');
        url += '/translation/stream';
        requestBody = { 
          text, 
          source_language: parseInt(sourceLanguage), 
          target_language: parseInt(targetLanguage) 
        };
        break;
      case 'createTranscription':
        if (!audioUrl) throw new Error('Audio URL is required for transcription');
        url += '/transcription';
        requestBody = { audio_url: audioUrl };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Camb.ai: ${requestMethod} ${url}`);

    const response = await fetch(url, {
      method: requestMethod,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Camb.ai API error: ${response.status}, Content-Type: ${contentType}, Body: ${errorText.substring(0, 80)}`);
      throw new Error(`Camb.ai API error: ${response.status} ${errorText}`);
    }

    // Robust response parsing for standard actions
    let data;
    console.log(`Response Content-Type: ${contentType}`);
    
    if (action === 'createTranslation' || contentType?.includes('text/plain')) {
      const textResult = await response.text();
      data = { result: textResult };
    } else {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.warn('Failed to parse JSON, falling back to text:', jsonError);
        const textResult = await response.text();
        data = { result: textResult };
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in camb-ai-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
