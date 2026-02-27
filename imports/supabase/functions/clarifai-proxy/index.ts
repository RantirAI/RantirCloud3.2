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
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key (PAT) is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.clarifai.com/v2';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    // Build input data for image predictions
    const buildImageInputData = () => {
      if (params.imageUrl) {
        return { data: { image: { url: params.imageUrl } } };
      } else if (params.imageBase64) {
        return { data: { image: { base64: params.imageBase64 } } };
      }
      return null;
    };

    // Build input data for text predictions
    const buildTextInputData = () => {
      if (params.text) {
        return { data: { text: { raw: params.text } } };
      }
      return null;
    };

    // Build input data for audio predictions
    const buildAudioInputData = () => {
      if (params.audioUrl) {
        return { data: { audio: { url: params.audioUrl } } };
      } else if (params.audioBase64) {
        return { data: { audio: { base64: params.audioBase64 } } };
      }
      return null;
    };

    switch (action) {
      case 'clarifaiAskLLM': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        body = {
          inputs: [{
            data: {
              text: { raw: params.prompt }
            }
          }],
          model: {
            output_info: {
              params: {
                max_tokens: params.maxTokens || 1024
              }
            }
          }
        };
        break;
      }

      case 'clarifaiGenerateIGM': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        body = {
          inputs: [{
            data: {
              text: { raw: params.prompt }
            }
          }]
        };
        break;
      }

      case 'visualClassifierModelPredict': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        const inputData = buildImageInputData();
        if (!inputData) {
          return new Response(JSON.stringify({ success: false, error: 'Either imageUrl or imageBase64 is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = { inputs: [inputData] };
        break;
      }

      case 'textClassifierModelPredict':
      case 'textToTextModelPredict': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        const inputData = buildTextInputData();
        if (!inputData) {
          return new Response(JSON.stringify({ success: false, error: 'Text is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = { inputs: [inputData] };
        break;
      }

      case 'imageToTextModelPredict': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        const inputData = buildImageInputData();
        if (!inputData) {
          return new Response(JSON.stringify({ success: false, error: 'Either imageUrl or imageBase64 is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = { inputs: [inputData] };
        break;
      }

      case 'audioToTextModelPredict': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/models/${params.modelId}/outputs`;
        const inputData = buildAudioInputData();
        if (!inputData) {
          return new Response(JSON.stringify({ success: false, error: 'Either audioUrl or audioBase64 is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = { inputs: [inputData] };
        break;
      }

      case 'postInputs': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/inputs`;
        const parsedInputs = JSON.parse(params.inputs);
        
        // Handle both array format and object format with 'inputs' key
        if (Array.isArray(parsedInputs)) {
          // User provided an array directly: [{...}, {...}]
          body = { inputs: parsedInputs };
        } else if (parsedInputs.inputs && Array.isArray(parsedInputs.inputs)) {
          // User provided object format: {"inputs": [{...}]}
          body = parsedInputs;
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Invalid inputs format. Provide either an array of inputs or {"inputs": [...]}' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
      }

      case 'workflowPredict': {
        endpoint = `/users/${params.userId}/apps/${params.appId}/workflows/${params.workflowId}/results`;
        let inputData: any = null;
        
        if (params.imageUrl || params.imageBase64) {
          inputData = buildImageInputData();
        } else if (params.text) {
          inputData = buildTextInputData();
        }
        
        if (!inputData) {
          return new Response(JSON.stringify({ success: false, error: 'Either image or text input is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = { inputs: [inputData] };
        break;
      }

      case 'createCustomApiCall':
        endpoint = params.endpoint;
        method = params.method || 'POST';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Clarifai: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok || (data.status?.code && data.status?.code !== 10000)) {
      console.error('Clarifai API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.status?.description || data.message || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract concepts from prediction results
    let concepts: any[] = [];
    if (data.outputs && data.outputs[0]?.data?.concepts) {
      concepts = data.outputs[0].data.concepts;
    } else if (data.outputs && data.outputs[0]?.data?.regions) {
      concepts = data.outputs[0].data.regions;
    } else if (data.outputs && data.outputs[0]?.data?.text) {
      concepts = [{ text: data.outputs[0].data.text.raw }];
    }

    return new Response(JSON.stringify({ success: true, data, concepts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clarifai proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
