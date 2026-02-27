import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, templateUid, modifications, imageUid } = await req.json();
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const baseUrl = 'https://api.bannerbear.com/v2';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;
    let imageUrl;

    if (action === 'create_image') {
      if (!templateUid) {
        throw new Error('Template UID is required');
      }

      const parsedModifications = typeof modifications === 'string' 
        ? JSON.parse(modifications) 
        : modifications;

      const response = await fetch(`${baseUrl}/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template: templateUid,
          modifications: parsedModifications,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Bannerbear API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
      imageUrl = result.image_url;
    } else if (action === 'get_image') {
      if (!imageUid) throw new Error('Image UID is required');

      const response = await fetch(`${baseUrl}/images/${imageUid}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Bannerbear API error: ${response.status}`);
      }

      result = await response.json();
      imageUrl = result.image_url;
    } else if (action === 'list_templates') {
      const response = await fetch(`${baseUrl}/templates`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Bannerbear API error: ${response.status}`);
      }

      result = await response.json();
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      imageUrl,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bannerbear error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      imageUrl: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
