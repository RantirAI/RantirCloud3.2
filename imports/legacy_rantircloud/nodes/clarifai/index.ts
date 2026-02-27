import { NodePlugin } from '@/types/node-plugin';

export const clarifaiNode: NodePlugin = {
  type: 'clarifai',
  name: 'Clarifai',
  description: 'AI-powered image and video recognition platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clarifai.png',
  color: '#0066FF',
  inputs: [
    {
      name: 'apiKey',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Clarifai Personal Access Token (PAT)',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask LLM', value: 'clarifaiAskLLM' },
        { label: 'Generate Image', value: 'clarifaiGenerateIGM' },
        { label: 'Visual Classifier Model Predict', value: 'visualClassifierModelPredict' },
        { label: 'Text Classifier Model Predict', value: 'textClassifierModelPredict' },
        { label: 'Image to Text Model Predict', value: 'imageToTextModelPredict' },
        { label: 'Text to Text Model Predict', value: 'textToTextModelPredict' },
        { label: 'Audio to Text Model Predict', value: 'audioToTextModelPredict' },
        { label: 'Post Inputs', value: 'postInputs' },
        { label: 'Workflow Predict', value: 'workflowPredict' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'clarifaiAskLLM') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true, description: 'Clarifai user ID' },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true, description: 'LLM model ID (e.g., gpt-4)' },
        { name: 'prompt', label: 'Prompt', type: 'textarea' as const, required: true },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number' as const, required: false, default: 1024 }
      );
    } else if (action === 'clarifaiGenerateIGM') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true, description: 'Image generation model ID' },
        { name: 'prompt', label: 'Prompt', type: 'textarea' as const, required: true, description: 'Image generation prompt' }
      );
    } else if (action === 'visualClassifierModelPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true },
        { name: 'imageUrl', label: 'Image URL', type: 'text' as const, required: false },
        { name: 'imageBase64', label: 'Image Base64', type: 'textarea' as const, required: false }
      );
    } else if (action === 'textClassifierModelPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true },
        { name: 'text', label: 'Text', type: 'textarea' as const, required: true }
      );
    } else if (action === 'imageToTextModelPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true },
        { name: 'imageUrl', label: 'Image URL', type: 'text' as const, required: false },
        { name: 'imageBase64', label: 'Image Base64', type: 'textarea' as const, required: false }
      );
    } else if (action === 'textToTextModelPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true },
        { name: 'text', label: 'Text', type: 'textarea' as const, required: true }
      );
    } else if (action === 'audioToTextModelPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'modelId', label: 'Model ID', type: 'text' as const, required: true },
        { name: 'audioUrl', label: 'Audio URL', type: 'text' as const, required: false },
        { name: 'audioBase64', label: 'Audio Base64', type: 'textarea' as const, required: false }
      );
    } else if (action === 'postInputs') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'inputs', label: 'Inputs (JSON)', type: 'code' as const, language: 'json' as const, required: true, description: 'Array of input objects, e.g., [{"data": {"text": {"raw": "example"}}}]' }
      );
    } else if (action === 'workflowPredict') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'appId', label: 'App ID', type: 'text' as const, required: true },
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true },
        { name: 'imageUrl', label: 'Image URL', type: 'text' as const, required: false },
        { name: 'imageBase64', label: 'Image Base64', type: 'textarea' as const, required: false },
        { name: 'text', label: 'Text', type: 'textarea' as const, required: false }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'POST', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data with predictions' },
    { name: 'concepts', type: 'array', description: 'Detected concepts/labels' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clarifai-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
