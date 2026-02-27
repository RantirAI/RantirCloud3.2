import { NodePlugin } from '@/types/node-plugin';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const acuitySchedulingNode: NodePlugin = {
  type: 'acuity-scheduling',
  name: 'Acuity Scheduling',
  description: 'Connect to Acuity Scheduling for appointment management, client scheduling, and calendar integration',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/acuity-scheduling.png',
  color: '#00A0DC',
  inputs: [
    {
      name: 'userId',
      label: 'User ID',
      type: 'text',
      required: true,
      description: 'Your Acuity Scheduling User ID',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Acuity Scheduling API Key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Blocked Off Time', value: 'add_blocked_time', description: 'Add blocked off time' },
        { label: 'Create Appointment', value: 'create_appointment', description: 'Book a new appointment' },
        { label: 'Create Client', value: 'create_client', description: 'Create a new client' },
        { label: 'Reschedule Appointment', value: 'reschedule_appointment', description: 'Reschedule an appointment' },
        { label: 'Update Client', value: 'update_client', description: 'Update existing client' },
        { label: 'Find Appointment(s)', value: 'find_appointments', description: 'Find appointments' },
        { label: 'Find Client', value: 'find_client', description: 'Find a client' },
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call' },
      ],
      description: 'Choose the Acuity Scheduling action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'add_blocked_time':
        dynamicInputs.push(
          {
            name: 'startTime',
            label: 'Start Time',
            type: 'text',
            required: true,
            description: 'Start time for blocked period (ISO format)',
            placeholder: '2024-01-01T10:00:00',
          },
          {
            name: 'endTime',
            label: 'End Time',
            type: 'text',
            required: true,
            description: 'End time for blocked period (ISO format)',
            placeholder: '2024-01-01T11:00:00',
          },
          {
            name: 'calendarID',
            label: 'Calendar ID',
            type: 'text',
            required: false,
            description: 'Calendar to block time on',
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            required: false,
            description: 'Notes for the blocked time',
          }
        );
        break;

      case 'create_appointment':
        dynamicInputs.push(
          {
            name: 'appointmentTypeID',
            label: 'Appointment Type ID',
            type: 'text',
            required: true,
            description: 'ID of the appointment type',
          },
          {
            name: 'datetime',
            label: 'Date & Time',
            type: 'text',
            required: true,
            description: 'Appointment date and time (ISO format)',
            placeholder: '2024-01-01T10:00:00',
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            description: 'Client first name',
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            description: 'Client last name',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Client email address',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Client phone number',
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            required: false,
            description: 'Additional notes for the appointment',
          }
        );
        break;

      case 'create_client':
        dynamicInputs.push(
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            description: 'Client first name',
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            description: 'Client last name',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Client email address',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Client phone number',
          }
        );
        break;

      case 'reschedule_appointment':
        dynamicInputs.push(
          {
            name: 'appointmentId',
            label: 'Appointment ID',
            type: 'text',
            required: true,
            description: 'ID of the appointment to reschedule',
          },
          {
            name: 'datetime',
            label: 'New Date & Time',
            type: 'text',
            required: true,
            description: 'New appointment date and time (ISO format)',
            placeholder: '2024-01-01T10:00:00',
          }
        );
        break;

      case 'update_client':
        dynamicInputs.push(
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: true,
            description: 'ID of the client to update',
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: false,
            description: 'Updated first name',
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: false,
            description: 'Updated last name',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: false,
            description: 'Updated email address',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Updated phone number',
          }
        );
        break;

      case 'find_appointments':
        dynamicInputs.push(
          {
            name: 'minDate',
            label: 'Start Date',
            type: 'text',
            required: false,
            description: 'Filter appointments from this date (YYYY-MM-DD)',
            placeholder: '2024-01-01',
          },
          {
            name: 'maxDate',
            label: 'End Date',
            type: 'text',
            required: false,
            description: 'Filter appointments until this date (YYYY-MM-DD)',
            placeholder: '2024-12-31',
          },
          {
            name: 'appointmentTypeID',
            label: 'Appointment Type ID',
            type: 'text',
            required: false,
            description: 'Filter by specific appointment type',
          },
          {
            name: 'clientId',
            label: 'Client ID',
            type: 'text',
            required: false,
            description: 'Filter by specific client',
          }
        );
        break;

      case 'find_client':
        dynamicInputs.push(
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: false,
            description: 'Find client by email',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Find client by phone number',
          },
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: false,
            description: 'Find client by name',
          }
        );
        break;

      case 'custom_api_call':
        dynamicInputs.push(
          {
            name: 'endpoint',
            label: 'API Endpoint',
            type: 'text',
            required: true,
            description: 'API endpoint path (e.g., /appointments)',
          },
          {
            name: 'method',
            label: 'HTTP Method',
            type: 'select',
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
            ],
            description: 'HTTP method for the request',
          },
          {
            name: 'requestBody',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body (for POST/PUT requests)',
          },
          {
            name: 'queryParams',
            label: 'Query Parameters',
            type: 'text',
            required: false,
            description: 'Query parameters (e.g., ?param1=value1&param2=value2)',
          }
        );
        break;
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
      name: 'data',
      type: 'object',
      description: 'The response data from Acuity Scheduling',
    },
    {
      name: 'appointments',
      type: 'array',
      description: 'List of appointments (for get_appointments action)',
    },
    {
      name: 'appointment',
      type: 'object',
      description: 'Single appointment data (for specific appointment operations)',
    },
    {
      name: 'clients',
      type: 'array',
      description: 'List of clients (for get_clients action)',
    },
    {
      name: 'client',
      type: 'object',
      description: 'Single client data (for specific client operations)',
    },
    {
      name: 'availability',
      type: 'array',
      description: 'Available time slots (for get_availability action)',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { userId, apiKey, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedUserId = resolveVariable(userId);
    const resolvedApiKey = resolveVariable(apiKey);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedUserId) {
      throw new Error('Acuity Scheduling User ID is required');
    }

    if (!resolvedApiKey) {
      throw new Error('Acuity Scheduling API Key is required');
    }

    try {
      const baseUrl = 'https://acuityscheduling.com/api/v1';
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;
      let queryParams = '';

      const auth = typeof btoa !== 'undefined' ? btoa(`${resolvedUserId}:${resolvedApiKey}`) : Buffer.from(`${resolvedUserId}:${resolvedApiKey}`).toString('base64');

      switch (action) {
        case 'add_blocked_time':
          endpoint = '/blocks';
          method = 'POST';
          requestBody = {
            start: resolvedInputs.startTime,
            end: resolvedInputs.endTime,
            calendarID: resolvedInputs.calendarID || '',
            notes: resolvedInputs.notes || '',
          };
          break;

        case 'create_appointment':
          endpoint = '/appointments';
          method = 'POST';
          requestBody = {
            appointmentTypeID: resolvedInputs.appointmentTypeID,
            datetime: resolvedInputs.datetime,
            firstName: resolvedInputs.firstName,
            lastName: resolvedInputs.lastName,
            email: resolvedInputs.email,
            phone: resolvedInputs.phone || '',
            notes: resolvedInputs.notes || '',
          };
          break;

        case 'create_client':
          endpoint = '/clients';
          method = 'POST';
          requestBody = {
            firstName: resolvedInputs.firstName,
            lastName: resolvedInputs.lastName,
            email: resolvedInputs.email,
            phone: resolvedInputs.phone || '',
          };
          break;

        case 'reschedule_appointment':
          endpoint = `/appointments/${resolvedInputs.appointmentId}/reschedule`;
          method = 'PUT';
          requestBody = {
            datetime: resolvedInputs.datetime,
          };
          break;

        case 'update_client':
          endpoint = `/clients/${resolvedInputs.clientId}`;
          method = 'PUT';
          requestBody = {};
          if (resolvedInputs.firstName) requestBody.firstName = resolvedInputs.firstName;
          if (resolvedInputs.lastName) requestBody.lastName = resolvedInputs.lastName;
          if (resolvedInputs.email) requestBody.email = resolvedInputs.email;
          if (resolvedInputs.phone) requestBody.phone = resolvedInputs.phone;
          break;

        case 'find_appointments':
          endpoint = '/appointments';
          const appointmentParams = new URLSearchParams();
          if (resolvedInputs.minDate) appointmentParams.append('minDate', resolvedInputs.minDate);
          if (resolvedInputs.maxDate) appointmentParams.append('maxDate', resolvedInputs.maxDate);
          if (resolvedInputs.appointmentTypeID) appointmentParams.append('appointmentTypeID', resolvedInputs.appointmentTypeID);
          if (resolvedInputs.clientId) appointmentParams.append('clientID', resolvedInputs.clientId);
          queryParams = appointmentParams.toString();
          break;

        case 'find_client':
          endpoint = '/clients';
          const clientParams = new URLSearchParams();
          if (resolvedInputs.email) clientParams.append('email', resolvedInputs.email);
          if (resolvedInputs.phone) clientParams.append('phone', resolvedInputs.phone);
          if (resolvedInputs.name) clientParams.append('name', resolvedInputs.name);
          queryParams = clientParams.toString();
          break;

        case 'custom_api_call':
          endpoint = resolvedInputs.endpoint;
          method = resolvedInputs.method || 'GET';
          if (resolvedInputs.requestBody) {
            try {
              requestBody = JSON.parse(resolvedInputs.requestBody);
            } catch (e) {
              throw new Error('Invalid JSON in request body');
            }
          }
          if (resolvedInputs.queryParams) {
            queryParams = resolvedInputs.queryParams.startsWith('?') 
              ? resolvedInputs.queryParams.substring(1) 
              : resolvedInputs.queryParams;
          }
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for Acuity Scheduling API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('acuity-proxy', {
        body: {
          userId: resolvedUserId,
          apiKey: resolvedApiKey,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Acuity proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        appointments: null,
        appointment: null,
        clients: null,
        client: null,
        availability: null,
        error: error.message,
      };
    }
  },
};