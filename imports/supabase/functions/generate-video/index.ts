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
    const { prompt, operationName } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    
    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'GOOGLE_API_KEY is not configured. Please add your Google API key to use video generation.',
        requiresSetup: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If checking status of existing operation
    if (operationName) {
      console.log('Checking status for operation:', operationName);
      
      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
        {
          headers: {
            'x-goog-api-key': GOOGLE_API_KEY,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Google API status check error:', statusResponse.status, errorText);
        throw new Error(`Failed to check operation status: ${statusResponse.status}`);
      }

      const operation = await statusResponse.json();
      console.log('Operation status:', JSON.stringify(operation, null, 2));
      
      // Check if operation is complete
      if (operation.done) {
        if (operation.error) {
          return new Response(JSON.stringify({
            success: false,
            status: 'failed',
            error: operation.error.message || 'Video generation failed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Extract video URL from response
        const videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        
        if (videoUri) {
          return new Response(JSON.stringify({
            success: true,
            status: 'succeeded',
            output: videoUri
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            status: 'failed',
            error: 'No video URL in response'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      // Still processing
      return new Response(JSON.stringify({
        success: true,
        status: 'processing',
        output: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start new video generation with Google Veo 3.1
    console.log('Starting video generation with Google Veo 3.1, prompt:', prompt);

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GOOGLE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Veo API error:', response.status, errorText);
      throw new Error(`Google Veo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Video generation started:', JSON.stringify(data, null, 2));

    // Veo returns an operation name for polling
    const newOperationName = data.name;
    
    if (!newOperationName) {
      throw new Error('No operation name returned from Google Veo API');
    }

    return new Response(JSON.stringify({
      success: true,
      operationName: newOperationName,
      status: 'starting',
      message: 'Video generation started. Poll for status updates.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-video:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
