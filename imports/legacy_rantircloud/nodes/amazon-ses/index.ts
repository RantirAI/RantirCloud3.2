import { NodePlugin } from '@/types/node-plugin';

export const amazonSESNode: NodePlugin = {
  type: 'amazon-ses',
  name: 'Amazon SES',
  description: 'Send emails using Amazon Simple Email Service',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/amazon-ses.png',
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
        { label: 'US West (Oregon)', value: 'us-west-2' },
        { label: 'EU (Ireland)', value: 'eu-west-1' },
        { label: 'EU (Frankfurt)', value: 'eu-central-1' },
        { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2' },
      ],
      description: 'AWS region for SES',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Email', value: 'sendEmail', description: 'Send an email' },
        { label: 'Create Email Template', value: 'createEmailTemplate', description: 'Create an email template' },
        { label: 'Send Templated Email', value: 'sendTemplatedEmail', description: 'Send email using a template' },
        { label: 'Update Email Template', value: 'updateEmailTemplate', description: 'Update an existing email template' },
        { label: 'Create Custom Verification Email Template', value: 'createCustomVerificationEmailTemplate', description: 'Create a custom verification email template' },
        { label: 'Send Custom Verification Email', value: 'sendCustomVerificationEmail', description: 'Send custom verification email' },
        { label: 'Update Custom Verification Email Template', value: 'updateCustomVerificationEmailTemplate', description: 'Update custom verification email template' },
      ],
      description: 'Choose the SES operation to perform',
    },
    {
      name: 'fromEmail',
      label: 'From Email',
      type: 'text',
      required: true,
      description: 'Sender email address (must be verified in SES)',
      placeholder: 'sender@example.com',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Send Email action
    if (action === 'sendEmail') {
      dynamicInputs.push({
        name: 'toEmails',
        label: 'To Emails',
        type: 'text',
        required: true,
        description: 'Recipient email addresses (comma-separated)',
        placeholder: 'recipient1@example.com, recipient2@example.com',
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        description: 'Email subject line',
        placeholder: 'Your email subject',
      },
      {
        name: 'bodyText',
        label: 'Plain Text Body',
        type: 'textarea',
        required: false,
        description: 'Plain text email body',
        placeholder: 'Your email content in plain text...',
      },
      {
        name: 'bodyHtml',
        label: 'HTML Body',
        type: 'textarea',
        required: false,
        description: 'HTML email body',
        placeholder: '<html><body><h1>Your HTML content...</h1></body></html>',
      },
      {
        name: 'ccEmails',
        label: 'CC Emails',
        type: 'text',
        required: false,
        description: 'CC email addresses (comma-separated)',
        placeholder: 'cc1@example.com, cc2@example.com',
      },
      {
        name: 'bccEmails',
        label: 'BCC Emails',
        type: 'text',
        required: false,
        description: 'BCC email addresses (comma-separated)',
        placeholder: 'bcc1@example.com, bcc2@example.com',
      });
    }

    // Template actions
    if (['createEmailTemplate', 'updateEmailTemplate'].includes(action)) {
      dynamicInputs.push({
        name: 'templateName',
        label: 'Template Name',
        type: 'text',
        required: true,
        description: 'Name of the email template',
        placeholder: 'MyEmailTemplate',
      },
      {
        name: 'templateSubject',
        label: 'Template Subject',
        type: 'text',
        required: true,
        description: 'Subject line template with placeholders',
        placeholder: 'Hello {{name}}!',
      },
      {
        name: 'templateHtml',
        label: 'HTML Template',
        type: 'textarea',
        required: false,
        description: 'HTML template with placeholders',
        placeholder: '<html><body><h1>Hello {{name}}!</h1></body></html>',
      },
      {
        name: 'templateText',
        label: 'Text Template',
        type: 'textarea',
        required: false,
        description: 'Plain text template with placeholders',
        placeholder: 'Hello {{name}}!',
      });
    }

    // Send Templated Email action
    if (action === 'sendTemplatedEmail') {
      dynamicInputs.push({
        name: 'templateName',
        label: 'Template Name',
        type: 'text',
        required: true,
        description: 'Name of the email template to use',
        placeholder: 'MyEmailTemplate',
      },
      {
        name: 'toEmails',
        label: 'To Emails',
        type: 'text',
        required: true,
        description: 'Recipient email addresses (comma-separated)',
        placeholder: 'recipient1@example.com, recipient2@example.com',
      },
      {
        name: 'templateData',
        label: 'Template Data',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON object with template variables',
        placeholder: '{\n  "name": "John Doe",\n  "company": "Example Corp"\n}',
      });
    }

    // Custom verification email template actions
    if (['createCustomVerificationEmailTemplate', 'updateCustomVerificationEmailTemplate'].includes(action)) {
      dynamicInputs.push({
        name: 'templateName',
        label: 'Template Name',
        type: 'text',
        required: true,
        description: 'Name of the verification email template',
        placeholder: 'MyVerificationTemplate',
      },
      {
        name: 'templateSubject',
        label: 'Template Subject',
        type: 'text',
        required: true,
        description: 'Subject line for verification email',
        placeholder: 'Please verify your email address',
      },
      {
        name: 'templateHtml',
        label: 'HTML Template',
        type: 'textarea',
        required: false,
        description: 'HTML template for verification email',
        placeholder: '<html><body><h1>Please verify your email</h1><a href="{{verificationLink}}">Click here</a></body></html>',
      },
      {
        name: 'templateText',
        label: 'Text Template',
        type: 'textarea',
        required: false,
        description: 'Plain text template for verification email',
        placeholder: 'Please verify your email by clicking: {{verificationLink}}',
      },
      {
        name: 'successRedirectionURL',
        label: 'Success Redirection URL',
        type: 'text',
        required: false,
        description: 'URL to redirect after successful verification',
        placeholder: 'https://example.com/verified',
      },
      {
        name: 'failureRedirectionURL',
        label: 'Failure Redirection URL',
        type: 'text',
        required: false,
        description: 'URL to redirect after failed verification',
        placeholder: 'https://example.com/verification-failed',
      });
    }

    // Send Custom Verification Email action
    if (action === 'sendCustomVerificationEmail') {
      dynamicInputs.push({
        name: 'templateName',
        label: 'Template Name',
        type: 'text',
        required: true,
        description: 'Name of the verification email template to use',
        placeholder: 'MyVerificationTemplate',
      },
      {
        name: 'emailAddress',
        label: 'Email Address',
        type: 'text',
        required: true,
        description: 'Email address to send verification to',
        placeholder: 'user@example.com',
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
      description: 'Message ID for sent email',
    },
    {
      name: 'messageIds',
      type: 'array',
      description: 'Array of message IDs for bulk emails',
    },
    {
      name: 'identities',
      type: 'array',
      description: 'List of verified identities',
    },
    {
      name: 'statistics',
      type: 'object',
      description: 'Sending statistics',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from SES',
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
      fromEmail,
      toEmails,
      subject,
      bodyText,
      bodyHtml,
      ccEmails,
      bccEmails,
      recipients,
      identity
    } = inputs;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    if (!fromEmail) {
      throw new Error('From email is required');
    }

    try {
      let parsedRecipients = null;
      if (recipients) {
        try {
          parsedRecipients = JSON.parse(recipients);
        } catch (e) {
          throw new Error('Recipients must be valid JSON array');
        }
      }

      const requestData = {
        action,
        accessKeyId,
        secretAccessKey,
        region,
        fromEmail,
        toEmails,
        subject,
        bodyText,
        bodyHtml,
        ccEmails,
        bccEmails,
        recipients: parsedRecipients,
        identity,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Amazon SES integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/amazon-ses-proxy`, {
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
        messageIds: result.messageIds,
        identities: result.identities,
        statistics: result.statistics,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        messageId: null,
        messageIds: null,
        identities: null,
        statistics: null,
        data: null,
        error: error.message,
      };
    }
  },
};