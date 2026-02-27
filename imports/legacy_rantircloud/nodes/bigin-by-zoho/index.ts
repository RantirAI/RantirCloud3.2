import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const biginByZohoNode: NodePlugin = {
  type: 'bigin-by-zoho',
  name: 'Bigin by Zoho',
  description: 'Manage contacts and pipeline in Bigin CRM',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bigin-by-zoho.png',
  color: '#E42527',
  inputs: [
    {
      name: 'apiKey',
      label: 'OAuth Access Token',
      type: 'text',
      required: true,
      description: 'Bigin by Zoho OAuth 2.0 access token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Company', value: 'createCompany' },
        { label: 'Update Company', value: 'updateCompany' },
        { label: 'Create Contact', value: 'createContact' },
        { label: 'Update Contact', value: 'updateContact' },
        { label: 'Create Task', value: 'createTask' },
        { label: 'Update Task', value: 'updateTask' },
        { label: 'Create Call', value: 'createCall' },
        { label: 'Create Event', value: 'createEvent' },
        { label: 'Update Event', value: 'updateEvent' },
        { label: 'Create Pipeline Record', value: 'createPipelineRecord' },
        { label: 'Update Pipeline Record', value: 'updatePipelineRecord' },
        { label: 'Search Pipeline Record', value: 'searchPipelineRecord' },
        { label: 'Search Company Record', value: 'searchCompanyRecord' },
        { label: 'Search Contact Record', value: 'searchContactRecord' },
        { label: 'Search Product Record', value: 'searchProductRecord' },
        { label: 'Search User', value: 'searchUser' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'createCompany' || currentInputs.action === 'updateCompany') {
      if (currentInputs.action === 'updateCompany') {
        inputs.push({
          name: 'companyId',
          label: 'Company ID',
          type: 'text',
          required: true,
          description: 'ID of the company to update',
        });
      }
      inputs.push(
        {
          name: 'companyName',
          label: 'Company Name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: false,
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'text',
          required: false,
        }
      );
    } else if (currentInputs.action === 'createContact' || currentInputs.action === 'updateContact') {
      if (currentInputs.action === 'updateContact') {
        inputs.push({
          name: 'contactId',
          label: 'Contact ID',
          type: 'text',
          required: true,
          description: 'ID of the contact to update',
        });
      }
      inputs.push(
        {
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
        },
        {
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: false,
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'text',
          required: false,
        }
      );
    } else if (currentInputs.action === 'createTask' || currentInputs.action === 'updateTask') {
      if (currentInputs.action === 'updateTask') {
        inputs.push({
          name: 'taskId',
          label: 'Task ID',
          type: 'text',
          required: true,
          description: 'ID of the task to update',
        });
      }
      inputs.push(
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
        },
        {
          name: 'dueDate',
          label: 'Due Date',
          type: 'text',
          required: false,
          description: 'Format: YYYY-MM-DD',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          required: false,
          options: [
            { label: 'High', value: 'High' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Low', value: 'Low' },
          ],
        }
      );
    } else if (currentInputs.action === 'createCall') {
      inputs.push(
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
        },
        {
          name: 'callType',
          label: 'Call Type',
          type: 'select',
          required: true,
          options: [
            { label: 'Inbound', value: 'Inbound' },
            { label: 'Outbound', value: 'Outbound' },
          ],
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
        }
      );
    } else if (currentInputs.action === 'createEvent' || currentInputs.action === 'updateEvent') {
      if (currentInputs.action === 'updateEvent') {
        inputs.push({
          name: 'eventId',
          label: 'Event ID',
          type: 'text',
          required: true,
          description: 'ID of the event to update',
        });
      }
      inputs.push(
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
        },
        {
          name: 'startDateTime',
          label: 'Start Date Time',
          type: 'text',
          required: true,
          description: 'Format: YYYY-MM-DD HH:MM:SS',
        },
        {
          name: 'endDateTime',
          label: 'End Date Time',
          type: 'text',
          required: true,
          description: 'Format: YYYY-MM-DD HH:MM:SS',
        }
      );
    } else if (currentInputs.action === 'createPipelineRecord' || currentInputs.action === 'updatePipelineRecord') {
      if (currentInputs.action === 'updatePipelineRecord') {
        inputs.push({
          name: 'recordId',
          label: 'Record ID',
          type: 'text',
          required: true,
          description: 'ID of the pipeline record to update',
        });
      }
      inputs.push(
        {
          name: 'dealName',
          label: 'Deal Name',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          label: 'Amount',
          type: 'number',
          required: false,
        },
        {
          name: 'stage',
          label: 'Stage',
          type: 'text',
          required: false,
        }
      );
    } else if (currentInputs.action === 'searchPipelineRecord' || 
               currentInputs.action === 'searchCompanyRecord' || 
               currentInputs.action === 'searchContactRecord' ||
               currentInputs.action === 'searchProductRecord' ||
               currentInputs.action === 'searchUser') {
      inputs.push(
        {
          name: 'searchTerm',
          label: 'Search Term',
          type: 'text',
          required: true,
          description: 'Search query',
        },
        {
          name: 'searchField',
          label: 'Search Field',
          type: 'text',
          required: false,
          description: 'Specific field to search in',
        }
      );
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
      description: 'Response data from Bigin',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bigin-by-zoho-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
