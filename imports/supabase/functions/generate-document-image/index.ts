import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, documentId, databaseId, userId } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Generating image with OpenAI DALL-E, prompt:', prompt);

    // Use OpenAI DALL-E API for image generation
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${prompt}. Make it professional, modern, and visually appealing.`,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: 'Invalid OpenAI API key.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    
    // Extract base64 image from DALL-E response
    const imageBase64 = aiData.data?.[0]?.b64_json;

    if (!imageBase64) {
      console.error('No image generated in response:', JSON.stringify(aiData));
      throw new Error('No image generated');
    }

    console.log('Image generated successfully with OpenAI DALL-E');

    let storedUrl = `data:image/png;base64,${imageBase64}`;
    
    // If user context provided, store in Supabase storage
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Use app-assets bucket for app-builder, databases bucket otherwise
        const bucketName = databaseId === 'app-builder' ? 'app-assets' : 'databases';
        const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        const fileName = `generated/${userId}/${Date.now()}.png`;
        
        console.log(`Uploading image to ${bucketName}/${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, binaryData, {
            contentType: 'image/png',
            upsert: false
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          storedUrl = urlData.publicUrl;
          console.log('Image stored successfully:', storedUrl);
        } else {
          console.error('Upload error:', uploadError);
        }
      } catch (storageError) {
        console.error('Failed to store image, using base64:', storageError);
        // Continue with base64 URL if storage fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      imageUrl: storedUrl,
      description: 'Generated image'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-document-image:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
