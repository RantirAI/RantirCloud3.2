import { supabase } from "@/integrations/supabase/client";
import { databaseService } from "./databaseService";
import { tableService } from "./tableService";

export interface DatabaseConnection {
  id: string;
  name: string;
  description: string | null;
  color?: string;
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  id: string;
  name: string;
  schema: DatabaseTableSchema;
  recordCount: number;
}

export interface DatabaseTableSchema {
  id: string;
  name: string;
  fields: DatabaseField[];
}

export interface DatabaseField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'image' | 'pdf' | 'json' | 'email';
  required?: boolean;
  description?: string;
  options?: any;
}

export interface DataBinding {
  connectionId: string;
  tableName: string;
  query?: string;
  filters?: DataFilter[];
  sorting?: DataSort[];
  pagination?: DataPagination;
  realTime?: boolean;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'like' | 'contains';
  value: any;
}

export interface DataSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataPagination {
  page: number;
  pageSize: number;
  total?: number;
}

export const databaseConnectionService = {
  async getUserDatabaseConnections(userId: string): Promise<DatabaseConnection[]> {
    try {
      const databases = await databaseService.getUserDatabases(userId);
      
      const connections: DatabaseConnection[] = [];
      
      for (const db of databases) {
        const tables = await tableService.getUserTableProjects(userId, db.id);
        
        const databaseTables: DatabaseTable[] = tables.map(table => {
          const schema = table.schema as any;
          const records = table.records as any;
          
          return {
            id: table.id,
            name: table.name,
            schema: {
              id: schema?.id || 'unknown',
              name: schema?.name || table.name,
              fields: (schema?.fields || []).map((field: any) => ({
                id: field?.id || 'unknown',
                name: field?.name || 'unknown',
                type: field?.type || 'text',
                required: field?.required || false,
                description: field?.description || '',
                options: field?.options || null
              }))
            },
            recordCount: Array.isArray(records) ? records.length : 0
          };
        });
        
        connections.push({
          id: db.id,
          name: db.name,
          description: db.description,
          color: db.color,
          tables: databaseTables
        });
      }
      
      return connections;
    } catch (error) {
      console.error('Failed to get database connections:', error);
      throw error;
    }
  },

  async getConnectionData(connectionId: string, tableName: string, options: {
    filters?: DataFilter[];
    sorting?: DataSort[];
    pagination?: DataPagination;
  } = {}): Promise<{ data: any[]; total: number; }> {
    try {
      const tableProject = await tableService.getTableProject(tableName);
      
      const records = tableProject.records as any;
      let data = Array.isArray(records) ? [...records] : [];
      
      // Apply filters
      if (options.filters) {
        data = data.filter(record => {
          return options.filters!.every(filter => {
            const fieldValue = record[filter.field];
            
            switch (filter.operator) {
              case 'eq':
                return fieldValue === filter.value;
              case 'ne':
                return fieldValue !== filter.value;
              case 'gt':
                return fieldValue > filter.value;
              case 'lt':
                return fieldValue < filter.value;
              case 'in':
                return Array.isArray(filter.value) && filter.value.includes(fieldValue);
              case 'like':
              case 'contains':
                return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
              default:
                return true;
            }
          });
        });
      }
      
      // Apply sorting
      if (options.sorting) {
        options.sorting.forEach(sort => {
          data.sort((a, b) => {
            const aValue = a[sort.field];
            const bValue = b[sort.field];
            
            if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
            return 0;
          });
        });
      }
      
      const total = data.length;
      
      // Apply pagination
      if (options.pagination) {
        const start = (options.pagination.page - 1) * options.pagination.pageSize;
        const end = start + options.pagination.pageSize;
        data = data.slice(start, end);
      }
      
      return { data, total };
    } catch (error) {
      console.error('Failed to get connection data:', error);
      throw error;
    }
  },

  async testConnection(connectionId: string): Promise<{ success: boolean; message: string; }> {
    try {
      const connection = await databaseService.getDatabase(connectionId);
      
      if (!connection) {
        return { success: false, message: 'Connection not found' };
      }
      
      // Test by trying to get tables
      const tables = await tableService.getUserTableProjects('test', connectionId);
      
      return { 
        success: true, 
        message: `Connection successful. Found ${tables.length} tables.` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error.message}` 
      };
    }
  },

  async createRecord(connectionId: string, tableName: string, record: any): Promise<any> {
    try {
      const tableProject = await tableService.getTableProject(tableName);
      const records = tableProject.records as any;
      const newRecord = await tableService.addRecord(tableName, record, records);
      return newRecord;
    } catch (error) {
      console.error('Failed to create record:', error);
      throw error;
    }
  },

  async updateRecord(connectionId: string, tableName: string, recordId: string, updates: any): Promise<any> {
    try {
      const tableProject = await tableService.getTableProject(tableName);
      const records = tableProject.records as any;
      const updatedRecord = await tableService.updateRecord(tableName, recordId, updates, records);
      return updatedRecord;
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  },

  async deleteRecord(connectionId: string, tableName: string, recordId: string): Promise<boolean> {
    try {
      const tableProject = await tableService.getTableProject(tableName);
      const records = tableProject.records as any;
      const success = await tableService.deleteRecord(tableName, recordId, records);
      return success;
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  }
};