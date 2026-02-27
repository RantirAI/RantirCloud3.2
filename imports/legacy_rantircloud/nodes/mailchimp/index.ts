import { NodePlugin } from '@/types/node-plugin';

export const mailchimpNode: NodePlugin = {
  type: 'mailchimp',
  name: 'Mailchimp',
  description: 'Add subscribers to Mailchimp lists and send campaigns',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/mailchimp.png',
  color: '#FFE01B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Mailchimp API key',
      placeholder: 'Enter your Mailchimp API key'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Member to List', value: 'addMemberToList' },
        { label: 'Add Note to Subscriber', value: 'addNoteToSubscriber' },
        { label: 'Add Subscriber to Tag', value: 'addSubscriberToTag' },
        { label: 'Remove Subscriber from Tag', value: 'removeSubscriberFromTag' },
        { label: 'Update Subscriber in List', value: 'updateSubscriberInList' },
        { label: 'Create Campaign', value: 'createCampaign' },
        { label: 'Get Campaign Report', value: 'getCampaignReport' },
        { label: 'Create Audience', value: 'createAudience' },
        { label: 'Archive Subscriber', value: 'archiveSubscriber' },
        { label: 'Unsubscribe Email', value: 'unsubscribeEmail' },
        { label: 'Find Campaign', value: 'findCampaign' },
        { label: 'Find Customer', value: 'findCustomer' },
        { label: 'Find Tag', value: 'findTag' },
        { label: 'Find Subscriber', value: 'findSubscriber' }
      ],
      description: 'Choose the Mailchimp action to perform'
    }
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs.action;
    const dynamicInputs: any[] = [];

    // Common fields for subscriber actions
    const emailField = {
      name: 'email',
      label: 'Email Address',
      type: 'text' as const,
      required: true,
      description: 'Subscriber email address'
    };

    const listIdField = {
      name: 'listId',
      label: 'List ID',
      type: 'text' as const,
      required: true,
      description: 'The Mailchimp list/audience ID'
    };

    const firstNameField = {
      name: 'firstName',
      label: 'First Name',
      type: 'text' as const,
      required: false,
      description: 'Subscriber first name'
    };

    const lastNameField = {
      name: 'lastName',
      label: 'Last Name',
      type: 'text' as const,
      required: false,
      description: 'Subscriber last name'
    };

    switch (action) {
      case 'addMemberToList':
        dynamicInputs.push(listIdField, emailField, firstNameField, lastNameField, {
          name: 'phone',
          label: 'Phone Number',
          type: 'text' as const,
          required: false,
          description: 'Subscriber phone number'
        });
        break;

      case 'addNoteToSubscriber':
        dynamicInputs.push(
          listIdField,
          emailField,
          {
            name: 'note',
            label: 'Note',
            type: 'textarea' as const,
            required: true,
            description: 'Note content to add to subscriber'
          }
        );
        break;

      case 'addSubscriberToTag':
      case 'removeSubscriberFromTag':
        dynamicInputs.push(
          listIdField,
          {
            name: 'tagId',
            label: 'Tag/Segment ID',
            type: 'text' as const,
            required: true,
            description: 'The Mailchimp tag or segment ID'
          },
          emailField
        );
        break;

      case 'updateSubscriberInList':
        dynamicInputs.push(listIdField, emailField, firstNameField, lastNameField, {
          name: 'phone',
          label: 'Phone Number',
          type: 'text' as const,
          required: false,
          description: 'Subscriber phone number'
        });
        break;

      case 'createCampaign':
        dynamicInputs.push(
          listIdField,
          {
            name: 'subject',
            label: 'Subject Line',
            type: 'text' as const,
            required: true,
            description: 'Campaign email subject line'
          },
          {
            name: 'fromName',
            label: 'From Name',
            type: 'text' as const,
            required: true,
            description: 'Sender name'
          },
          {
            name: 'replyTo',
            label: 'Reply-To Email',
            type: 'text' as const,
            required: true,
            description: 'Reply-to email address'
          }
        );
        break;

      case 'getCampaignReport':
        dynamicInputs.push({
          name: 'campaignId',
          label: 'Campaign ID',
          type: 'text' as const,
          required: true,
          description: 'The Mailchimp campaign ID'
        });
        break;

      case 'createAudience':
        dynamicInputs.push(
          {
            name: 'audienceName',
            label: 'Audience Name',
            type: 'text' as const,
            required: true,
            description: 'Name for the new audience/list'
          },
          {
            name: 'company',
            label: 'Company',
            type: 'text' as const,
            required: true,
            description: 'Company name'
          },
          {
            name: 'address',
            label: 'Address',
            type: 'text' as const,
            required: true,
            description: 'Street address'
          },
          {
            name: 'city',
            label: 'City',
            type: 'text' as const,
            required: true,
            description: 'City'
          },
          {
            name: 'state',
            label: 'State',
            type: 'text' as const,
            required: true,
            description: 'State or province'
          },
          {
            name: 'zip',
            label: 'Postal Code',
            type: 'text' as const,
            required: true,
            description: 'Postal/ZIP code'
          },
          {
            name: 'country',
            label: 'Country Code',
            type: 'text' as const,
            required: true,
            description: 'Two-letter country code (e.g., US, GB)'
          },
          {
            name: 'permissionReminder',
            label: 'Permission Reminder',
            type: 'text' as const,
            required: true,
            description: 'Reminder of how people signed up'
          },
          {
            name: 'fromName',
            label: 'Default From Name',
            type: 'text' as const,
            required: true,
            description: 'Default sender name'
          },
          {
            name: 'fromEmail',
            label: 'Default From Email',
            type: 'text' as const,
            required: true,
            description: 'Default sender email'
          }
        );
        break;

      case 'archiveSubscriber':
      case 'unsubscribeEmail':
        dynamicInputs.push(listIdField, emailField);
        break;

      case 'findCampaign':
        // No additional fields needed
        break;

      case 'findCustomer':
        dynamicInputs.push(
          {
            name: 'storeId',
            label: 'Store ID',
            type: 'text' as const,
            required: true,
            description: 'The Mailchimp e-commerce store ID'
          },
          emailField
        );
        break;

      case 'findTag':
        dynamicInputs.push(listIdField);
        break;

      case 'findSubscriber':
        dynamicInputs.push(listIdField, emailField);
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The result of the Mailchimp operation'
    },
    {
      name: 'subscriberId',
      type: 'string',
      description: 'The subscriber ID from Mailchimp'
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status'
    }
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data, error } = await supabase.functions.invoke('mailchimp-proxy', {
        body: inputs
      });

      if (error) {
        throw new Error(`Mailchimp proxy error: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`Mailchimp operation failed: ${error.message}`);
    }
  }
};