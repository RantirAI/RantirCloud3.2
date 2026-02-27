import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("ElevenLabs API key is required");

    console.log('ElevenLabs action:', action);

    switch (action) {
      case 'textToSpeech': {
        const { text, voiceId, modelId, stability, similarityBoost } = params;
        if (!text || !voiceId) throw new Error("Text and Voice ID are required");

        const voiceSettings: any = {};
        if (stability !== undefined && stability !== '') voiceSettings.stability = parseFloat(stability);
        if (similarityBoost !== undefined && similarityBoost !== '') voiceSettings.similarity_boost = parseFloat(similarityBoost);

        const body: any = {
          text,
          model_id: modelId || 'eleven_multilingual_v2',
        };
        if (Object.keys(voiceSettings).length > 0) body.voice_settings = voiceSettings;

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TTS error (${response.status}): ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = base64Encode(audioBuffer);

        return new Response(JSON.stringify({ audioBase64, format: 'mp3' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        const headers: Record<string, string> = {
          'xi-api-key': apiKey,
        };

        const fetchOptions: RequestInit = { method, headers };
        if (params.body && (method === 'POST' || method === 'PUT')) {
          headers['Content-Type'] = 'application/json';
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }

        const response = await fetch(`https://api.elevenlabs.io${path}`, fetchOptions);

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response.status }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Try to parse as JSON, fall back to text
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const audioBuffer = await response.arrayBuffer();
          const audioBase64 = base64Encode(audioBuffer);
          return new Response(JSON.stringify({ audioBase64, format: 'binary' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error('ElevenLabs proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
