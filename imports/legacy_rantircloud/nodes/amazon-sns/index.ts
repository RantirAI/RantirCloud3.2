import { NodePlugin } from '@/types/node-plugin';

export const amazonSNSNode: NodePlugin = {
  type: 'amazon-sns',
  name: 'Amazon SNS',
  description: 'Send notifications using Amazon Simple Notification Service',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/amazon-sns.png',
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
      description: 'AWS region for SNS',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Publish Message', value: 'publish', description: 'Publish a message to a topic or phone number' },
        { label: 'Create Topic', value: 'create_topic', description: 'Create a new SNS topic' },
        { label: 'List Topics', value: 'list_topics', description: 'List all SNS topics' },
        { label: 'Subscribe', value: 'subscribe', description: 'Subscribe to a topic' },
        { label: 'Unsubscribe', value: 'unsubscribe', description: 'Unsubscribe from a topic' },
        { label: 'List Subscriptions', value: 'list_subscriptions', description: 'List subscriptions' },
        { label: 'Send SMS', value: 'send_sms', description: 'Send SMS message directly' },
      ],
      description: 'Choose the SNS operation to perform',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Topic ARN - required for most operations
    if (['publish', 'subscribe', 'unsubscribe', 'list_subscriptions'].includes(action)) {
      dynamicInputs.push({
        name: 'topicArn',
        label: 'Topic ARN',
        type: 'text',
        required: action !== 'list_subscriptions',
        description: 'Amazon Resource Name of the SNS topic',
        placeholder: 'arn:aws:sns:us-east-1:123456789012:MyTopic',
      });
    }

    // Message - for publish and SMS
    if (['publish', 'send_sms'].includes(action)) {
      dynamicInputs.push({
        name: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        description: 'Message content to send',
        placeholder: 'Your notification message...',
      });

      if (action === 'publish') {
        dynamicInputs.push({
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: false,
          description: 'Message subject (for email notifications)',
          placeholder: 'Notification Subject',
        },
        {
          name: 'messageStructure',
          label: 'Message Structure',
          type: 'select',
          required: false,
          options: [
            { label: 'Default', value: 'default' },
            { label: 'JSON', value: 'json' },
          ],
          description: 'Message structure format',
        });
      }
    }

    // Phone number for SMS
    if (action === 'send_sms') {
      dynamicInputs.push({
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        description: 'Phone number with country code',
        placeholder: '+1234567890',
      });
    }

    // Topic name for create
    if (action === 'create_topic') {
      dynamicInputs.push({
        name: 'topicName',
        label: 'Topic Name',
        type: 'text',
        required: true,
        description: 'Name for the new topic',
        placeholder: 'MyNotificationTopic',
      });
    }

    // Subscription details
    if (action === 'subscribe') {
      dynamicInputs.push({
        name: 'protocol',
        label: 'Protocol',
        type: 'select',
        required: true,
        options: [
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
          { label: 'HTTP', value: 'http' },
          { label: 'HTTPS', value: 'https' },
          { label: 'SQS', value: 'sqs' },
          { label: 'Lambda', value: 'lambda' },
        ],
        description: 'Subscription protocol',
      },
      {
        name: 'endpoint',
        label: 'Endpoint',
        type: 'text',
        required: true,
        description: 'Subscription endpoint (email, phone, URL, etc.)',
        placeholder: 'user@example.com or +1234567890 or https://example.com/webhook',
      });
    }

    // Subscription ARN for unsubscribe
    if (action === 'unsubscribe') {
      dynamicInputs.push({
        name: 'subscriptionArn',
        label: 'Subscription ARN',
        type: 'text',
        required: true,
        description: 'ARN of the subscription to remove',
        placeholder: 'arn:aws:sns:us-east-1:123456789012:MyTopic:12345678-1234-1234-1234-123456789012',
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
      description: 'Message ID for published message',
    },
    {
      name: 'topicArn',
      type: 'string',
      description: 'ARN of created or referenced topic',
    },
    {
      name: 'subscriptionArn',
      type: 'string',
      description: 'ARN of created subscription',
    },
    {
      name: 'topics',
      type: 'array',
      description: 'List of topics',
    },
    {
      name: 'subscriptions',
      type: 'array',
      description: 'List of subscriptions',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from SNS',
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
      topicArn,
      message,
      subject,
      messageStructure,
      phoneNumber,
      topicName,
      protocol,
      endpoint,
      subscriptionArn
    } = inputs;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    try {
      const requestData = {
        action,
        accessKeyId,
        secretAccessKey,
        region,
        topicArn,
        message,
        subject,
        messageStructure,
        phoneNumber,
        topicName,
        protocol,
        endpoint,
        subscriptionArn,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Amazon SNS integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/amazon-sns-proxy`, {
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
        topicArn: result.topicArn,
        subscriptionArn: result.subscriptionArn,
        topics: result.topics,
        subscriptions: result.subscriptions,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        messageId: null,
        topicArn: null,
        subscriptionArn: null,
        topics: null,
        subscriptions: null,
        data: null,
        error: error.message,
      };
    }
  },
};