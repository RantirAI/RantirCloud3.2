import { NodePlugin } from '@/types/node-plugin';

export const cloudinaryNode: NodePlugin = {
  type: 'cloudinary',
  name: 'Cloudinary',
  description: 'Cloud-based image and video management platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cloudinary.png',
  color: '#3448C5',
  inputs: [
    {
      name: 'cloudName',
      label: 'Cloud Name',
      type: 'text',
      required: true,
      description: 'Your Cloudinary cloud name',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cloudinary API key',
      isApiKey: true,
    },
    {
      name: 'apiSecret',
      label: 'API Secret',
      type: 'text',
      required: true,
      description: 'Your Cloudinary API secret',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Upload Resource', value: 'uploadResource' },
        { label: 'Delete Resource', value: 'deleteResource' },
        { label: 'Create Usage Report', value: 'createUsageReport' },
        { label: 'Find Resource By Public ID', value: 'findResourceByPublicId' },
        { label: 'Transform Resource', value: 'transformResource' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'uploadResource') {
      inputs.push(
        { name: 'file', label: 'File URL or Base64', type: 'text' as const, required: true, description: 'URL or Base64-encoded file to upload' },
        { name: 'resourceType', label: 'Resource Type', type: 'select' as const, required: false, default: 'image', options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Raw', value: 'raw' },
          { label: 'Auto', value: 'auto' },
        ]},
        { name: 'folder', label: 'Folder', type: 'text' as const, required: false, description: 'Folder path for the uploaded file' },
        { name: 'publicId', label: 'Public ID', type: 'text' as const, required: false, description: 'Custom public ID for the resource' },
        { name: 'uploadPreset', label: 'Upload Preset', type: 'text' as const, required: false, description: 'Upload preset name' },
        { name: 'transformation', label: 'Transformation', type: 'text' as const, required: false, description: 'Transformation string (e.g., w_500,h_500,c_fill)' }
      );
    } else if (action === 'deleteResource') {
      inputs.push(
        { name: 'publicId', label: 'Public ID', type: 'text' as const, required: true, description: 'Public ID of the resource to delete' },
        { name: 'resourceType', label: 'Resource Type', type: 'select' as const, required: false, default: 'image', options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Raw', value: 'raw' },
        ]}
      );
    } else if (action === 'createUsageReport') {
      inputs.push(
        { name: 'date', label: 'Date (YYYY-MM-DD)', type: 'text' as const, required: false, description: 'Date for the usage report (defaults to today)' }
      );
    } else if (action === 'findResourceByPublicId') {
      inputs.push(
        { name: 'publicId', label: 'Public ID', type: 'text' as const, required: true, description: 'Public ID of the resource to find' },
        { name: 'resourceType', label: 'Resource Type', type: 'select' as const, required: false, default: 'image', options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Raw', value: 'raw' },
        ]}
      );
    } else if (action === 'transformResource') {
      inputs.push(
        { name: 'publicId', label: 'Public ID', type: 'text' as const, required: true, description: 'Public ID of the resource to transform' },
        { name: 'transformation', label: 'Transformation', type: 'text' as const, required: true, description: 'Transformation string (e.g., w_500,h_500,c_fill,e_blur:300)' },
        { name: 'resourceType', label: 'Resource Type', type: 'select' as const, required: false, default: 'image', options: [
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
        ]},
        { name: 'format', label: 'Output Format', type: 'select' as const, required: false, options: [
          { label: 'Auto', value: 'auto' },
          { label: 'PNG', value: 'png' },
          { label: 'JPG', value: 'jpg' },
          { label: 'WEBP', value: 'webp' },
          { label: 'GIF', value: 'gif' },
          { label: 'MP4', value: 'mp4' },
        ]}
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'API endpoint path (e.g., /resources/image)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Request body as JSON' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'url', type: 'string', description: 'Secure URL of the resource' },
    { name: 'publicId', type: 'string', description: 'Public ID of the resource' },
    { name: 'format', type: 'string', description: 'File format' },
    { name: 'width', type: 'number', description: 'Image/video width' },
    { name: 'height', type: 'number', description: 'Image/video height' },
    { name: 'usage', type: 'object', description: 'Usage report data' },
    { name: 'transformedUrl', type: 'string', description: 'Transformed resource URL' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('cloudinary-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
