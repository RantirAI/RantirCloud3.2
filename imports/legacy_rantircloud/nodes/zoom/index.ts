import { NodePlugin } from '@/types/node-plugin';

export const zoomNode: NodePlugin = {
  type: 'zoom',
  name: 'Zoom',
  description: 'Create and manage Zoom meetings and webinars',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/zoom.png',
  color: '#2D8CFF',
  inputs: [
    {
      name: 'apiKey',
      label: 'JWT Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Zoom JWT token or OAuth access token',
      placeholder: 'Enter your Zoom JWT/OAuth token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Meeting', value: 'zoomCreateMeeting' },
        { label: 'Create Meeting Registrant', value: 'zoomCreateMeetingRegistrant' },
        { label: 'Custom API Call', value: 'createCustomApiCallAction' }
      ],
      description: 'Choose the Zoom action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'zoomCreateMeeting':
        dynamicInputs.push(
          {
            name: 'userId',
            label: 'User ID/Email',
            type: 'text',
            required: true,
            description: 'Zoom user ID or email address',
            placeholder: 'user@example.com or user_id'
          },
          {
            name: 'topic',
            label: 'Meeting Topic',
            type: 'text',
            required: true,
            description: 'The topic/title of the meeting'
          },
          {
            name: 'startTime',
            label: 'Start Time',
            type: 'text',
            required: false,
            description: 'Meeting start time (ISO 8601 format)',
            placeholder: '2024-12-25T10:00:00Z'
          },
          {
            name: 'duration',
            label: 'Duration (minutes)',
            type: 'number',
            required: false,
            default: 60,
            description: 'Meeting duration in minutes'
          },
          {
            name: 'meetingType',
            label: 'Meeting Type',
            type: 'select',
            required: false,
            options: [
              { label: 'Instant Meeting', value: '1' },
              { label: 'Scheduled Meeting', value: '2' },
              { label: 'Recurring Meeting (No Fixed Time)', value: '3' },
              { label: 'Recurring Meeting (Fixed Time)', value: '8' }
            ],
            default: '2',
            description: 'Type of meeting to create'
          },
          {
            name: 'password',
            label: 'Meeting Password',
            type: 'text',
            required: false,
            description: 'Password to join the meeting'
          },
          {
            name: 'agenda',
            label: 'Agenda',
            type: 'textarea',
            required: false,
            description: 'Meeting agenda'
          }
        );
        break;

      case 'zoomCreateMeetingRegistrant':
        dynamicInputs.push(
          {
            name: 'meetingId',
            label: 'Meeting ID',
            type: 'text',
            required: true,
            description: 'The meeting ID to register for'
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Registrant email address'
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            description: 'Registrant first name'
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            description: 'Registrant last name'
          },
          {
            name: 'address',
            label: 'Address',
            type: 'text',
            required: false,
            description: 'Registrant address'
          },
          {
            name: 'city',
            label: 'City',
            type: 'text',
            required: false,
            description: 'Registrant city'
          },
          {
            name: 'country',
            label: 'Country',
            type: 'text',
            required: false,
            description: 'Registrant country'
          },
          {
            name: 'zip',
            label: 'Zip Code',
            type: 'text',
            required: false,
            description: 'Registrant zip code'
          },
          {
            name: 'state',
            label: 'State',
            type: 'text',
            required: false,
            description: 'Registrant state'
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Registrant phone number'
          },
          {
            name: 'industry',
            label: 'Industry',
            type: 'text',
            required: false,
            description: 'Registrant industry'
          },
          {
            name: 'org',
            label: 'Organization',
            type: 'text',
            required: false,
            description: 'Registrant organization'
          },
          {
            name: 'jobTitle',
            label: 'Job Title',
            type: 'text',
            required: false,
            description: 'Registrant job title'
          },
          {
            name: 'comments',
            label: 'Comments',
            type: 'textarea',
            required: false,
            description: 'Additional comments or questions'
          }
        );
        break;

      case 'createCustomApiCallAction':
        dynamicInputs.push(
          {
            name: 'method',
            label: 'HTTP Method',
            type: 'select',
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' }
            ],
            description: 'HTTP method for the API call'
          },
          {
            name: 'endpoint',
            label: 'Endpoint',
            type: 'text',
            required: true,
            description: 'API endpoint path (e.g., /users/me/meetings)',
            placeholder: '/users/me/meetings'
          },
          {
            name: 'body',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body for POST/PUT/PATCH requests'
          },
          {
            name: 'queryParams',
            label: 'Query Parameters',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Query parameters as JSON object',
            placeholder: '{"type": "scheduled", "page_size": 30}'
          }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The result of the Zoom operation'
    },
    {
      name: 'meetingId',
      type: 'string',
      description: 'The meeting ID'
    },
    {
      name: 'joinUrl',
      type: 'string',
      description: 'URL to join the meeting'
    },
    {
      name: 'startUrl',
      type: 'string',
      description: 'URL to start the meeting'
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action } = inputs;
    
    if (!apiKey) {
      throw new Error('Zoom API key is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('zoom-proxy', {
        body: {
          apiKey,
          action,
          inputs
        }
      });

      if (error) {
        throw new Error(`Failed to call Zoom API: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`Zoom operation failed: ${error.message}`);
    }
  }
};