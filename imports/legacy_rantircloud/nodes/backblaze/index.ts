import { NodePlugin } from '@/types/node-plugin';

export const backblazeNode: NodePlugin = {
  type: 'backblaze',
  name: 'Backblaze B2',
  description: 'Interact with Backblaze B2 cloud storage',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/backblaze.png',
  color: '#E53935',
  inputs: [
    {
      name: 'keyId',
      label: 'Key ID',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Backblaze B2 Key ID',
    },
    {
      name: 'applicationKey',
      label: 'Application Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Backblaze B2 Application Key',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Upload File to S3', value: 'backBlazes3UploadFile' },
        { label: 'Read Backblaze File', value: 'readBackBlazeFile' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs: any[] = [];

    inputs.push({
      name: 'bucketName',
      label: 'Bucket Name',
      type: 'text',
      required: true,
      description: 'Bucket name',
    });

    if (action === 'backBlazes3UploadFile') {
      inputs.push({
        name: 'fileName',
        label: 'File Name',
        type: 'text',
        required: true,
        description: 'File name to upload',
      });
      inputs.push({
        name: 'fileUrl',
        label: 'File URL',
        type: 'text',
        required: true,
        description: 'URL of the file to upload',
      });
      inputs.push({
        name: 'contentType',
        label: 'Content Type',
        type: 'select',
        required: false,
        options: [
          { label: 'image/png', value: 'image/png' },
          { label: 'image/jpeg', value: 'image/jpeg' },
          { label: 'image/gif', value: 'image/gif' },
          { label: 'audio/mpeg', value: 'audio/mpeg' },
          { label: 'audio/wav', value: 'audio/wav' },
          { label: 'video/mp4', value: 'video/mp4' },
          { label: 'application/pdf', value: 'application/pdf' },
          { label: 'application/msword', value: 'application/msword' },
          { label: 'text/plain', value: 'text/plain' },
          { label: 'application/json', value: 'application/json' },
        ],
        description: 'MIME type of the file',
      });
    }

    if (action === 'readBackBlazeFile') {
      inputs.push({
        name: 'fileName',
        label: 'File Name',
        type: 'text',
        required: true,
        description: 'File name to read',
      });
    }

    return inputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Response data from Backblaze',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      context.envVars?.SUPABASE_URL || '',
      context.envVars?.SUPABASE_ANON_KEY || ''
    );

    const { data, error } = await supabase.functions.invoke('backblaze-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
