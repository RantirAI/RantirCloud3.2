import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("Deepgram API key is required");

    const baseUrl = 'https://api.deepgram.com';
    const headers: Record<string, string> = {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('Deepgram action:', action);

    switch (action) {
      case 'createSummary': {
        const queryParams = new URLSearchParams();
        queryParams.set('summarize', 'v2');
        if (params.model) queryParams.set('model', params.model);
        if (params.language) queryParams.set('language', params.language);

        response = await fetch(`${baseUrl}/v1/listen?${queryParams.toString()}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: params.audioUrl }),
        });
        break;
      }

      case 'createTranscriptionCallback': {
        const queryParams = new URLSearchParams();
        if (params.model) queryParams.set('model', params.model);
        if (params.language) queryParams.set('language', params.language);
        if (params.punctuate === 'true') queryParams.set('punctuate', 'true');
        if (params.diarize === 'true') queryParams.set('diarize', 'true');
        if (params.callbackUrl) queryParams.set('callback', params.callbackUrl);

        response = await fetch(`${baseUrl}/v1/listen?${queryParams.toString()}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: params.audioUrl }),
        });
        break;
      }

      case 'listProjects': {
        response = await fetch(`${baseUrl}/v1/projects`, {
          headers,
        });
        break;
      }

      case 'textToSpeech': {
        const voice = params.voice || 'aura-asteria-en';

        response = await fetch(`${baseUrl}/v1/speak?model=${voice}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: params.text }),
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

          return new Response(JSON.stringify({
            audioBase64: base64Audio,
            contentType: response.headers.get('content-type') || 'audio/mpeg',
            status: 'ok',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        const fetchOptions: RequestInit = { method, headers };
        if (params.body && (method === 'POST' || method === 'PUT')) {
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }

        response = await fetch(`${baseUrl}${path}`, fetchOptions);
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error('Deepgram API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response!.json();
    return new Response(JSON.stringify({ ...result, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deepgram proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
