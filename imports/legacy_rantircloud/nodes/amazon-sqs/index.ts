import { NodePlugin } from '@/types/node-plugin';

export const amazonSQSNode: NodePlugin = {
  type: 'amazon-sqs',
  name: 'Amazon SQS',
  description: 'Send and receive messages using Amazon Simple Queue Service',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/aws-sqs.png',
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
      description: 'AWS region for SQS',
    },
    {
      name: 'queueUrl',
      label: 'Queue URL',
      type: 'text',
      required: true,
      description: 'SQS queue URL',
      placeholder: 'https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Message', value: 'send_message', description: 'Send a message to the queue' },
      ],
      description: 'Choose the SQS operation to perform',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Message body for send_message
    if (action === 'send_message') {
      dynamicInputs.push({
        name: 'messageBody',
        label: 'Message Body',
        type: 'textarea',
        required: true,
        description: 'Content of the message to send',
        placeholder: 'Your message content...',
      },
      {
        name: 'messageAttributes',
        label: 'Message Attributes',
        type: 'code',
        language: 'json',
        required: false,
        description: 'JSON object with message attributes',
        placeholder: '{\n  "AttributeName": {\n    "DataType": "String",\n    "StringValue": "AttributeValue"\n  }\n}',
      },
      {
        name: 'delaySeconds',
        label: 'Delay Seconds',
        type: 'number',
        required: false,
        description: 'Number of seconds to delay message delivery',
        default: 0,
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
      name: 'messageId',
      type: 'string',
      description: 'ID of sent message',
    },
    {
      name: 'messages',
      type: 'array',
      description: 'Array of received messages',
    },
    {
      name: 'attributes',
      type: 'object',
      description: 'Queue attributes',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from SQS',
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
      queueUrl,
      messageBody,
      messageAttributes,
      delaySeconds,
      maxMessages,
      waitTimeSeconds,
      visibilityTimeoutSeconds,
      receiptHandle,
      attributes
    } = inputs;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    if (!queueUrl) {
      throw new Error('Queue URL is required');
    }

    try {
      let parsedMessageAttributes = null;
      if (messageAttributes) {
        try {
          parsedMessageAttributes = JSON.parse(messageAttributes);
        } catch (e) {
          throw new Error('Message attributes must be valid JSON');
        }
      }

      let parsedAttributes = null;
      if (attributes) {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (e) {
          throw new Error('Attributes must be valid JSON');
        }
      }

      const requestData = {
        action,
        accessKeyId,
        secretAccessKey,
        region,
        queueUrl,
        messageBody,
        messageAttributes: parsedMessageAttributes,
        delaySeconds,
        maxMessages,
        waitTimeSeconds,
        visibilityTimeoutSeconds,
        receiptHandle,
        attributes: parsedAttributes,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Amazon SQS integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/amazon-sqs-proxy`, {
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
        messageId: result.messageId,
        messages: result.messages,
        attributes: result.attributes,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        messageId: null,
        messages: null,
        attributes: null,
        data: null,
        error: error.message,
      };
    }
  },
};