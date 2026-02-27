import { NodePlugin } from '@/types/node-plugin';

export const amazonS3Node: NodePlugin = {
  type: 'amazon-s3',
  name: 'Amazon S3',
  description: 'Store and retrieve files from Amazon S3 buckets',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/amazon-s3.png',
  color: '#FF9900',
  inputs: [
    {
      name: 'accessKeyId',
      label: 'Access Key ID',
      type: 'text',
      required: true,
      description: 'Your AWS Access Key ID',
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
      isApiKey: true,
    },
    {
      name: 'secretAccessKey',
      label: 'Secret Access Key',
      type: 'text',
      required: true,
      description: 'Your AWS Secret Access Key',
      placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      isApiKey: true,
    },
    {
      name: 'region',
      label: 'Region',
      type: 'select',
      required: true,
      default: 'us-east-1',
      options: [
        { label: 'US East (N. Virginia)', value: 'us-east-1' },
        { label: 'US East (Ohio)', value: 'us-east-2' },
        { label: 'US West (N. California)', value: 'us-west-1' },
        { label: 'US West (Oregon)', value: 'us-west-2' },
        { label: 'EU (Ireland)', value: 'eu-west-1' },
        { label: 'EU (London)', value: 'eu-west-2' },
        { label: 'EU (Frankfurt)', value: 'eu-central-1' },
        { label: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
        { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
      ],
      description: 'AWS region for your S3 bucket',
    },
    {
      name: 'bucketName',
      label: 'Bucket Name',
      type: 'text',
      required: true,
      description: 'S3 bucket name',
      placeholder: 'my-s3-bucket',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Upload File', value: 'upload_file', description: 'Upload a file to S3' },
        { label: 'Read File', value: 'read_file', description: 'Read a file from S3' },
        { label: 'Generate signed URL', value: 'generate_signed_url', description: 'Generate a signed URL' },
        { label: 'Move File', value: 'move_file', description: 'Move a file within S3' },
        { label: 'Delete File', value: 'delete_file', description: 'Delete a file from S3' },
        { label: 'List Files', value: 'list_files', description: 'List files in the bucket' },
      ],
      description: 'Choose the S3 operation to perform',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Object key - required for most operations
    if (['upload_file', 'read_file', 'delete_file', 'generate_signed_url'].includes(action)) {
      dynamicInputs.push({
        name: 'objectKey',
        label: 'Object Key',
        type: 'text',
        required: true,
        description: 'S3 object key (file path)',
        placeholder: 'folder/filename.txt',
      });
    }

    // File content - for upload
    if (action === 'upload_file') {
      dynamicInputs.push({
        name: 'fileContent',
        label: 'File Content',
        type: 'textarea',
        required: true,
        description: 'Content of the file to upload',
        placeholder: 'File content or base64 data',
      },
      {
        name: 'contentType',
        label: 'Content Type',
        type: 'text',
        required: false,
        description: 'MIME type of the file',
        placeholder: 'text/plain, image/jpeg, application/pdf',
      });
    }

    // Move operations
    if (action === 'move_file') {
      dynamicInputs.push({
        name: 'sourceKey',
        label: 'Source Key',
        type: 'text',
        required: true,
        description: 'Source object key to move from',
        placeholder: 'source/file.txt',
      },
      {
        name: 'destinationKey',
        label: 'Destination Key',
        type: 'text',
        required: true,
        description: 'Destination object key to move to',
        placeholder: 'destination/file.txt',
      });
    }

    // List options
    if (action === 'list_files') {
      dynamicInputs.push({
        name: 'prefix',
        label: 'Prefix',
        type: 'text',
        required: false,
        description: 'Filter files by prefix',
        placeholder: 'folder/',
      },
      {
        name: 'maxKeys',
        label: 'Max Keys',
        type: 'number',
        required: false,
        description: 'Maximum number of files to return',
        default: 1000,
      });
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'objects',
      type: 'array',
      description: 'List of objects (for list_objects)',
    },
    {
      name: 'downloadUrl',
      type: 'string',
      description: 'Download URL or presigned URL',
    },
    {
      name: 'fileContent',
      type: 'string',
      description: 'Downloaded file content (for download_file)',
    },
    {
      name: 'etag',
      type: 'string',
      description: 'ETag of the uploaded/copied file',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from S3',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { 
      action, 
      accessKeyId, 
      secretAccessKey, 
      region, 
      bucketName,
      objectKey,
      fileContent,
      contentType,
      sourceKey,
      destinationKey,
      prefix,
      maxKeys
    } = inputs;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    if (!bucketName) {
      throw new Error('Bucket name is required');
    }

    try {
      const requestData = {
        action,
        accessKeyId,
        secretAccessKey,
        region,
        bucketName,
        objectKey,
        fileContent,
        contentType,
        sourceKey,
        destinationKey,
        prefix,
        maxKeys,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Amazon S3 integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/amazon-s3-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        objects: result.objects,
        downloadUrl: result.downloadUrl,
        fileContent: result.fileContent,
        etag: result.etag,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        objects: null,
        downloadUrl: null,
        fileContent: null,
        etag: null,
        data: null,
        error: error.message,
      };
    }
  },
};