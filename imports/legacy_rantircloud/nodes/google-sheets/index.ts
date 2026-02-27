import { NodePlugin } from '@/types/node-plugin';
import { Sheet } from 'lucide-react';

export const googleSheetsNode: NodePlugin = {
  type: 'google-sheets',
  name: 'Google Sheets',
  description: 'Interact with Google Sheets - read, write, and manage spreadsheets',
  category: 'action',
  icon: Sheet,
  color: '#34A853',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Google Sheets OAuth2 access token',
      placeholder: 'Enter your Google Sheets access token'
    },
    {
      name: 'operation',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Export Sheet', value: 'exportSheet', description: 'Export sheet data' },
        { label: 'Get Row', value: 'getRow', description: 'Get a specific row' },
        { label: 'Insert Row', value: 'insertRow', description: 'Insert a single row' },
        { label: 'Insert Multiple Rows', value: 'insertMultipleRows', description: 'Insert multiple rows' },
        { label: 'Delete Row', value: 'deleteRow', description: 'Delete a specific row' },
        { label: 'Update Row', value: 'updateRow', description: 'Update a specific row' },
        { label: 'Find Rows', value: 'findRows', description: 'Find rows based on criteria' },
        { label: 'Create Spreadsheet', value: 'createSpreadsheet', description: 'Create a new spreadsheet' },
        { label: 'Create Worksheet', value: 'createWorksheet', description: 'Create a new worksheet' },
        { label: 'Clear Sheet', value: 'clearSheet', description: 'Clear sheet data' },
        { label: 'Custom API Call', value: 'customApiCall', description: 'Make a custom API call' }
      ],
      description: 'Select the action to perform'
    }
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Response data from the action'
    },
    {
      name: 'values',
      type: 'array',
      description: 'Values returned from sheet operations'
    },
    {
      name: 'spreadsheetId',
      type: 'string',
      description: 'ID of the spreadsheet'
    },
    {
      name: 'worksheetId',
      type: 'string',
      description: 'ID of the worksheet'
    },
    {
      name: 'rowCount',
      type: 'number',
      description: 'Number of rows affected'
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the action was successful'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if action failed'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const operation = currentInputs.operation;
    if (!operation) return [];

    const commonInputs = {
      spreadsheetId: {
        name: 'spreadsheetId',
        label: 'Spreadsheet ID',
        type: 'text' as const,
        required: true,
        description: 'The ID of the Google Spreadsheet',
        placeholder: 'Enter spreadsheet ID'
      },
      worksheetName: {
        name: 'worksheetName',
        label: 'Worksheet Name',
        type: 'text' as const,
        required: false,
        description: 'Name of the worksheet (sheet tab)',
        placeholder: 'Sheet1',
        default: 'Sheet1'
      },
      values: {
        name: 'values',
        label: 'Values',
        type: 'code' as const,
        language: 'json' as const,
        required: true,
        description: 'Values to insert/update (JSON array)',
        placeholder: '["value1", "value2", "value3"]'
      }
    };

    switch (operation) {
      case 'exportSheet':
        return [
          commonInputs.spreadsheetId,
          commonInputs.worksheetName
        ];

      case 'insertRow':
        return [
          commonInputs.spreadsheetId,
          commonInputs.worksheetName,
          commonInputs.values
        ];

      case 'createSpreadsheet':
        return [
          {
            name: 'spreadsheetTitle',
            label: 'Spreadsheet Title',
            type: 'text' as const,
            required: true,
            description: 'Title for new spreadsheet',
            placeholder: 'My New Spreadsheet'
          }
        ];

      case 'customApiCall':
        return [
          {
            name: 'customEndpoint',
            label: 'Custom Endpoint',
            type: 'text' as const,
            required: true,
            description: 'Custom API endpoint path',
            placeholder: '/v4/spreadsheets/{spreadsheetId}/values/{range}'
          },
          {
            name: 'customMethod',
            label: 'HTTP Method',
            type: 'select' as const,
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
              { label: 'PATCH', value: 'PATCH' }
            ],
            description: 'HTTP method for custom call',
            default: 'GET'
          },
          {
            name: 'customBody',
            label: 'Custom Request Body',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Request body for custom API call (optional for GET requests)',
            placeholder: '{"key": "value"}'
          }
        ];

      default:
        return [];
    }
  },
  async execute(inputs, context) {
    const { 
      accessToken, 
      operation, 
      spreadsheetId, 
      worksheetName = 'Sheet1',
      worksheetId,
      range,
      rowIndex,
      columnIndex,
      values,
      multipleRows,
      searchColumn,
      searchValue,
      spreadsheetTitle,
      worksheetTitle,
      sourceWorksheetId,
      destinationSpreadsheetId,
      columnTitle,
      customEndpoint,
      customMethod = 'GET',
      customBody,
      fieldMapping,
      findCriteria,
      spreadsheetProperties,
      worksheetProperties
    } = inputs;

    if (!accessToken) {
      throw new Error('Google Sheets access token is required');
    }
    
    try {
      // Use Supabase proxy function for Google Sheets API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('google-sheets-proxy', {
        body: {
          accessToken,
          operation,
          spreadsheetId,
          worksheetName,
          worksheetId,
          range,
          rowIndex,
          values,
          multipleRows,
          searchColumn,
          searchValue,
          spreadsheetTitle,
          worksheetTitle,
          customEndpoint,
          customMethod,
          customBody
        }
      });

      if (error) {
        throw new Error(`Google Sheets proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Google Sheets operation failed: ${error.message}`);
    }
  }
};