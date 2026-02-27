import { NodePlugin, NodeInput } from '@/types/node-plugin';
import { tableService } from '@/services/tableService';
import { databaseService } from '@/services/databaseService';
import { Database } from 'lucide-react';
import { applyFilters, applySort, applyLimit } from './filter-utils';

// Declare window globals for caching
declare global {
  interface Window {
    flowDataTables?: Record<string, any[]>;
    flowDatabases?: Record<string, any[]>;
    fetchingDatabases?: boolean;
    fetchingTables?: Record<string, boolean>;
  }
}

// Initialize cache if not already present
if (typeof window !== 'undefined') {
  if (!window.flowDataTables) {
    window.flowDataTables = {};
  }
  if (!window.flowDatabases) {
    window.flowDatabases = {};
  }
  if (!window.fetchingTables) {
    window.fetchingTables = {};
  }
}

// Helper function to get user ID from local storage
const getUserId = (): string | null => {
  try {
    const userDataStr = localStorage.getItem('supabase.auth.token');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return userData.currentSession?.user?.id || null;
    }
  } catch (error) {
    console.error('Error retrieving user ID:', error);
  }
  return null;
};

// Helper function to fetch databases
const fetchDatabases = async (): Promise<any[]> => {
  const userId = getUserId();
  if (!userId) {
    console.log('No user ID found, cannot fetch databases');
    return [];
  }

  // Don't fetch if already fetching
  if (window.fetchingDatabases) {
    console.log('Already fetching databases, skipping');
    return window.flowDatabases?.[userId] || [];
  }

  try {
    window.fetchingDatabases = true;
    console.log('Fetching databases for user:', userId);
    
    const databases = await databaseService.getUserDatabases(userId);
    console.log('Fetched databases:', databases);
    
    // Store in window cache
    if (!window.flowDatabases) {
      window.flowDatabases = {};
    }
    window.flowDatabases[userId] = databases;
    
    return databases;
  } catch (error) {
    console.error('Error fetching databases:', error);
    return [];
  } finally {
    window.fetchingDatabases = false;
  }
};

// Helper function to fetch tables for a specific database
const fetchTables = async (databaseId: string): Promise<any[]> => {
  const userId = getUserId();
  if (!userId) {
    console.log('No user ID found, cannot fetch tables');
    return [];
  }
  
  if (!databaseId) {
    console.log('No database ID provided, cannot fetch tables');
    return [];
  }

  // Don't fetch if already fetching this database's tables
  if (window.fetchingTables?.[databaseId]) {
    console.log(`Already fetching tables for database ${databaseId}, skipping`);
    return window.flowDataTables?.[databaseId] || [];
  }

  try {
    // Update fetching flag
    if (!window.fetchingTables) {
      window.fetchingTables = {};
    }
    window.fetchingTables[databaseId] = true;
    
    console.log('Fetching tables for database:', databaseId);
    
    const tables = await tableService.getUserTableProjects(userId, databaseId);
    console.log('Fetched tables:', tables);
    
    // Store in window cache
    if (!window.flowDataTables) {
      window.flowDataTables = {};
    }
    window.flowDataTables[databaseId] = tables;
    
    return tables;
  } catch (error) {
    console.error(`Error fetching tables for database ${databaseId}:`, error);
    return [];
  } finally {
    if (window.fetchingTables) {
      window.fetchingTables[databaseId] = false;
    }
  }
};

export const dataTableNode: NodePlugin = {
  type: 'data-table',
  name: 'Data Table',
  description: 'Connect to and perform CRUD operations on data tables',
  category: 'action',
  icon: Database,
  color: '#0ea5e9',
  
  getDynamicInputs(currentInputs: Record<string, any>) {
    const operation = currentInputs.operation;
    const tableId = currentInputs.tableId;
    const databaseId = currentInputs.databaseId;
    
    // Only generate field map inputs for create/update when table is selected
    if (!['create', 'update'].includes(operation) || !tableId || !databaseId) {
      return [];
    }
    
    // Look up table schema from window cache
    if (typeof window === 'undefined' || !window.flowDataTables) return [];
    
    const tables = window.flowDataTables[databaseId];
    if (!tables || !Array.isArray(tables)) return [];
    
    const table = tables.find((t: any) => t.id === tableId);
    if (!table?.schema?.fields) return [];
    
    const fields: NodeInput[] = [];
    for (const field of table.schema.fields) {
      // Skip system/timestamp fields — they're auto-populated
      if (field.type === 'timestamp') continue;
      
      fields.push({
        name: `fieldMap.${field.id}`,
        label: field.name || field.id,
        type: 'text',
        required: false,
        description: `Field type: ${field.type}`,
        placeholder: `Enter value or bind variable for ${field.name}`,
      });
    }
    
    return fields;
  },

  inputs: [
    {
      name: 'databaseId',
      label: 'Database',
      type: 'databaseSelector', // Use our custom database selector component
      required: true,
      description: 'The database to use'
    },
    {
      name: 'tableId',
      label: 'Table',
      type: 'tableSelector', // Use our custom table selector component
      required: true,
      description: 'The table to operate on',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        // This will be handled by TableSelectorField component directly,
        // which takes the databaseId as a prop and loads the tables for that database
        return [];
      }
    },
    {
      name: 'operation',
      label: 'Operation',
      type: 'select',
      required: true,
      description: 'The operation to perform on the table',
      options: [
        { label: 'Get Records', value: 'get' },
        { label: 'Create Record', value: 'create' },
        { label: 'Update Record', value: 'update' },
        { label: 'Delete Record', value: 'delete' }
      ]
    },
    {
      name: 'recordId',
      label: 'Record ID',
      type: 'text',
      required: false,
      description: 'The ID of the record (required for update and delete operations)',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        return ['update', 'delete'].includes(currentInputs.operation || '') ? [] : null;
      }
    },
    {
      name: 'filter',
      label: 'Filter (JSON)',
      type: 'code',
      language: 'json',
      required: false,
      description: 'JSON filter criteria for get operations. Can be a single filter object or an array of filters.',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        return currentInputs.operation === 'get' ? [] : null;
      }
    },
    {
      name: 'sort',
      label: 'Sort (JSON)',
      type: 'code',
      language: 'json',
      required: false,
      description: 'JSON sort criteria, e.g., {"field": "name", "direction": "asc"}',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        return currentInputs.operation === 'get' ? [] : null;
      }
    },
    {
      name: 'limit',
      label: 'Limit',
      type: 'number',
      required: false,
      description: 'Maximum number of records to return for get operations',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        return currentInputs.operation === 'get' ? [] : null;
      }
    },
    {
      name: 'data',
      label: 'Data (JSON)',
      type: 'code',
      language: 'json',
      required: false,
      description: 'JSON data for create or update operations',
      dynamic: true,
      dynamicOptions: (nodes, edges, currentNodeId, currentInputs) => {
        return ['create', 'update'].includes(currentInputs.operation || '') ? [] : null;
      }
    },
    {
      name: 'returnReadableFields',
      label: 'Return Readable Fields',
      type: 'boolean',
      required: false,
      description: 'If true, field IDs will be replaced with their names in the output',
      default: true
    }
  ],
  
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The operation result'
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'count',
      type: 'number',
      description: 'Number of records affected or returned'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    },
    {
      name: 'schema',
      type: 'object',
      description: 'The table schema information'
    }
  ],
  
  async execute(inputs, context) {
    let { operation, databaseId, tableId, recordId, filter, sort, limit, data, returnReadableFields = true } = inputs;
    
    // Compose data from fieldMap.* inputs if data is not provided
    if (operation === 'create' || operation === 'update') {
      const fieldMapData: Record<string, any> = {};
      let hasFieldMap = false;
      for (const [key, value] of Object.entries(inputs)) {
        if (key.startsWith('fieldMap.') && value !== undefined && value !== '') {
          const fieldId = key.substring('fieldMap.'.length);
          fieldMapData[fieldId] = value;
          hasFieldMap = true;
        }
      }
      if (hasFieldMap) {
        data = JSON.stringify(fieldMapData);
      }
    }
    
    try {
      // First, validate that we have a database ID
      if (!databaseId) {
        throw new Error('Database ID is required');
      }
      
      // Force fresh fetch of databases and tables to ensure they're up to date
      const userId = getUserId();
      if (userId) {
        await fetchDatabases();
        if (databaseId) {
          await fetchTables(databaseId);
        }
      }
      
      // Validate required inputs based on operation
      if (!tableId) {
        throw new Error('Table ID is required');
      }
      
      if ((operation === 'update' || operation === 'delete') && !recordId) {
        throw new Error('Record ID is required for update and delete operations');
      }
      
      if ((operation === 'create' || operation === 'update') && !data) {
        throw new Error('Data is required for create and update operations');
      }
      
      // Get the table project to access schema and records
      console.log(`Fetching table project with ID: ${tableId}`);
      const tableProject = await tableService.getTableProject(tableId);
      console.log('Retrieved table project:', tableProject.name);

      // Create a map from field IDs to field names for easier reference
      const fieldIdToNameMap = {};
      const fieldNameToIdMap = {};
      
      tableProject.schema.fields.forEach(field => {
        fieldIdToNameMap[field.id] = field.name;
        fieldNameToIdMap[field.name] = field.id;
      });
      
      // Function to convert record with ID keys to record with name keys
      const transformToReadableFields = (record) => {
        const result = { id: record.id };
        
        Object.keys(record).forEach(key => {
          if (key === 'id') return; // Skip the ID field
          
          const fieldName = fieldIdToNameMap[key];
          if (fieldName) {
            result[fieldName] = record[key];
          } else {
            result[key] = record[key]; // Keep the original key if no mapping found
          }
        });
        
        return result;
      };
      
      // Process based on operation type
      switch (operation) {
        case 'get': {
          // Apply filtering, sorting, and limiting using our utility functions
          let records = [...tableProject.records];
          
          if (filter) {
            try {
              const filterCriteria = typeof filter === 'string' ? JSON.parse(filter) : filter;
              records = applyFilters(records, filterCriteria);
            } catch (error) {
              throw new Error(`Invalid filter format: ${error.message}`);
            }
          }
          
          if (sort) {
            try {
              const sortCriteria = typeof sort === 'string' ? JSON.parse(sort) : sort;
              records = applySort(records, sortCriteria);
            } catch (error) {
              throw new Error(`Invalid sort format: ${error.message}`);
            }
          }
          
          if (limit) {
            records = applyLimit(records, Number(limit));
          }
          
          // Transform records to use field names if requested
          const transformedRecords = returnReadableFields 
            ? records.map(transformToReadableFields)
            : records;
          
          return {
            result: transformedRecords,
            success: true,
            count: records.length,
            error: null,
            schema: {
              fields: tableProject.schema.fields,
              fieldIdToNameMap,
              fieldNameToIdMap
            }
          };
        }
        
        case 'create': {
          let recordData = {};
          
          try {
            recordData = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (error) {
            throw new Error(`Invalid data format: ${error.message}`);
          }
          
          const newRecord = await tableService.addRecord(
            tableId,
            recordData,
            tableProject.records
          );
          
          // Transform record to use field names if requested
          const transformedRecord = returnReadableFields 
            ? transformToReadableFields(newRecord)
            : newRecord;
          
          return {
            result: transformedRecord,
            success: true,
            count: 1,
            error: null,
            schema: {
              fields: tableProject.schema.fields,
              fieldIdToNameMap,
              fieldNameToIdMap
            }
          };
        }
        
        case 'update': {
          let updateData = {};
          
          try {
            updateData = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (error) {
            throw new Error(`Invalid data format: ${error.message}`);
          }
          
          // Check if record exists
          const existingRecord = tableProject.records.find(r => r.id === recordId);
          if (!existingRecord) {
            throw new Error(`Record with ID ${recordId} not found`);
          }
          
          const updatedRecord = await tableService.updateRecord(
            tableId,
            recordId,
            updateData,
            tableProject.records
          );
          
          // Transform record to use field names if requested
          const transformedRecord = returnReadableFields 
            ? transformToReadableFields(updatedRecord)
            : updatedRecord;
          
          return {
            result: transformedRecord,
            success: true,
            count: 1,
            error: null,
            schema: {
              fields: tableProject.schema.fields,
              fieldIdToNameMap,
              fieldNameToIdMap
            }
          };
        }
        
        case 'delete': {
          // Check if record exists
          const existingRecord = tableProject.records.find(r => r.id === recordId);
          if (!existingRecord) {
            throw new Error(`Record with ID ${recordId} not found`);
          }
          
          await tableService.deleteRecord(tableId, recordId, tableProject.records);
          
          return {
            result: { id: recordId },
            success: true,
            count: 1,
            error: null,
            schema: {
              fields: tableProject.schema.fields,
              fieldIdToNameMap,
              fieldNameToIdMap
            }
          };
        }
        
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
    } catch (error) {
      console.error('Data Table operation error:', error);
      
      return {
        result: null,
        success: false,
        count: 0,
        error: error.message || 'An unknown error occurred',
        schema: null
      };
    }
  }
};
