import { supabase } from "@/integrations/supabase/client";
import { ViewSettings } from "@/types/viewTypes";
import { activityService } from './activityService';
import { generateRecordId } from '@/utils/generateRecordId';

export interface TableField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'image' | 'pdf' | 'codescript' | 'reference' | 'multireference' | 'document' | 'multidocument' | 'json' | 'email' | 'password' | 'timestamp';
  options?: any;
  required?: boolean;
  description?: string;
  hideInForm?: boolean;
  formula?: string;
  computedBy?: string;
  validationRules?: ValidationRule[];
  defaultValue?: any;
  system?: boolean;
}

interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface TableSchema {
  id: string;
  name: string;
  fields: TableField[];
}

export interface TableRecord {
  id: string;
  [key: string]: any;
}

export interface TableProject {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  schema: TableSchema;
  records: TableRecord[];
  database_id?: string | null;
  subscription_enabled?: boolean;
  formConfig?: {
    title?: string;
    description?: string;
    primaryColor?: string;
    submitButtonText?: string;
    style?: string;
    theme?: string;
    redirectUrl?: string;
    inputBorderRadius?: string;
    buttonBorderRadius?: string;
    formPadding?: string;
    fieldGap?: string;
    fontFamily?: string;
    titleFont?: string;
    descriptionFont?: string;
    allCaps?: boolean;
  };
  view_settings?: {
    [viewType: string]: ViewSettings;
  };
  updated_at?: string;
}

export const safeParseJson = <T>(json: any, defaultValue: T): T => {
  if (typeof json === 'string') {
    try {
      return JSON.parse(json) as T;
    } catch (e) {
      return defaultValue;
    }
  }
  return json as T || defaultValue;
};

type TableProjectData = {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  records: any;
  schema: any;
  database_id?: string | null;
  formConfig?: any;
  updated_at: string;
  user_id: string;
};

// In-memory cache to prevent double-fetch on Preview open.
// Short TTL so edits propagate quickly.
const TABLE_PROJECT_CACHE_TTL_MS = 15_000;
const tableProjectCache = new Map<string, { value: TableProject; ts: number }>();
const tableProjectPromiseCache = new Map<string, Promise<TableProject>>();

// Export cache clearing function for external use
export const clearTableCache = (tableId?: string) => {
  if (tableId) {
    tableProjectCache.delete(tableId);
    tableProjectPromiseCache.delete(tableId);
  } else {
    tableProjectCache.clear();
    tableProjectPromiseCache.clear();
  }
};

// Helper function to convert field IDs to field names in a record
const convertFieldIdsToNames = (record: any, schema: TableSchema): TableRecord => {
  if (!record || !schema?.fields) return record;
  
  // CRITICAL: Ensure every record has a valid ID
  let recordId = record.id;
  if (!recordId || recordId === null || recordId === undefined) {
    // Generate a new ID if the record doesn't have one
    recordId = generateRecordId(record, schema);
    console.warn('Record missing ID, generating new one:', recordId);
  }
  
  const convertedRecord: TableRecord = { id: recordId };
  
  // Create a mapping from field ID to field name
  const fieldIdToNameMap: { [key: string]: string } = {};
  schema.fields.forEach(field => {
    fieldIdToNameMap[field.id] = field.name;
  });
  
  // Convert all field IDs to field names
  Object.keys(record).forEach(key => {
    if (key === 'id') {
      // ID is already handled above
      return;
    } else if (fieldIdToNameMap[key]) {
      // This is a field ID, convert to field name
      convertedRecord[fieldIdToNameMap[key]] = record[key];
    } else {
      // This might already be a field name or some other property, keep it as is
      convertedRecord[key] = record[key];
    }
  });
  
  return convertedRecord;
};

// Helper function to convert field names to field IDs in a record (for storage)
const convertFieldNamesToIds = (record: any, schema: TableSchema): any => {
  if (!record || !schema?.fields) return record;
  
  const convertedRecord: any = { id: record.id };
  
  // Create a mapping from field name to field ID
  const fieldNameToIdMap: { [key: string]: string } = {};
  schema.fields.forEach(field => {
    fieldNameToIdMap[field.name] = field.id;
  });
  
  // Convert all field names to field IDs for storage
  Object.keys(record).forEach(key => {
    if (key === 'id') {
      convertedRecord.id = record.id;
    } else if (fieldNameToIdMap[key]) {
      // This is a field name, convert to field ID for storage
      convertedRecord[fieldNameToIdMap[key]] = record[key];
    } else {
      // This might already be a field ID or some other property, keep it as is
      convertedRecord[key] = record[key];
    }
  });
  
  return convertedRecord;
};

export const tableService = {
  /**
   * Get table projects for a user, optionally filtered by workspace
   * When workspaceId is provided, returns ALL workspace tables (for shared access)
   * When no workspaceId, returns only user's own tables
   */
  async getUserTableProjects(userId: string, databaseId?: string, workspaceId?: string | null) {
    let query = supabase
      .from("table_projects")
      .select("*");

    if (workspaceId) {
      // Workspace context: show ALL tables in this workspace (for team members)
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Personal context: show only user's own tables
      query = query.eq("user_id", userId);
    }
    
    if (databaseId) {
      query = query.eq("database_id", databaseId);
    }
    
    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getTableProjectPublic(id: string): Promise<TableProject> {
    // This method allows public access to table projects for read-only views
    const { data, error } = await supabase
      .from("table_projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error("Table project not found");
    
    // Parse the schema and records safely
    const defaultSchema = {
      id: data.id,
      name: data.name,
      fields: []
    };
    
    const schema = safeParseJson(data.schema, defaultSchema);
    const records = safeParseJson(data.records, []);
    
    // Convert field IDs to names in records for consistency
    const convertedRecords = records.map((record: any) => 
      convertFieldIdsToNames(record, schema)
    );
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      user_id: data.user_id,
      schema,
      records: convertedRecords,
      database_id: data.database_id,
      subscription_enabled: data.subscription_enabled,
      formConfig: safeParseJson((data as any).form_config, {}),
      view_settings: safeParseJson(data.view_settings, {}),
      updated_at: data.updated_at
    } as TableProject;
  },

  // New method to get tables by database
  async getTablesByDatabase(databaseId: string) {
    const { data, error } = await supabase
      .from("table_projects")
      .select("*")
      .eq("database_id", databaseId);

    if (error) throw error;
    return data;
  },

  async getTableProject(id: string): Promise<TableProject> {
    // Fast path: cached value
    const cached = tableProjectCache.get(id);
    if (cached && Date.now() - cached.ts < TABLE_PROJECT_CACHE_TTL_MS) {
      return cached.value;
    }

    // Deduplicate in-flight fetches
    const inflight = tableProjectPromiseCache.get(id);
    if (inflight) return inflight;

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("table_projects")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error("Table project not found");
        }

        const defaultSchema: TableSchema = {
          id: crypto.randomUUID(),
          name: data.name,
          fields: []
        };

        const schema = safeParseJson<TableSchema>(data.schema, defaultSchema);
        const rawRecords = safeParseJson<any[]>(data.records, []);
        const formConfig = safeParseJson<any>((data as any).form_config, undefined);
        const viewSettings = safeParseJson<{ [viewType: string]: ViewSettings }>(data.view_settings, {});

        // Convert all records from field IDs to field names
        const records = rawRecords.map(record => convertFieldIdsToNames(record, schema));

        const result: TableProject = {
          id: data.id,
          name: data.name,
          description: data.description,
          user_id: data.user_id,
          schema: schema,
          records: records,
          database_id: data.database_id,
          subscription_enabled: data.subscription_enabled,
          formConfig: formConfig,
          view_settings: viewSettings,
          updated_at: data.updated_at
        };

        tableProjectCache.set(id, { value: result, ts: Date.now() });
        return result;
      } finally {
        tableProjectPromiseCache.delete(id);
      }
    })();

    tableProjectPromiseCache.set(id, fetchPromise);
    return fetchPromise;
  },

  async prefetchTableProjects(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    await Promise.all(uniqueIds.map((tid) => this.getTableProject(tid).catch(() => undefined)));
  },

  async createTableProject(project: {
    name: string;
    description?: string;
    user_id: string;
    schema: TableSchema;
    records: TableRecord[];
    database_id?: string;
  }): Promise<TableProject> {
    // Convert records to use field IDs for storage
    const recordsForStorage = project.records.map(record => 
      convertFieldNamesToIds(record, project.schema)
    );

    const { data, error } = await supabase.from("table_projects").insert({
      name: project.name,
      description: project.description,
      user_id: project.user_id,
      schema: project.schema as any,
      records: recordsForStorage as any,
      database_id: project.database_id
    }).select().maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error("Failed to create table project");
    }
    
    const schema = safeParseJson<TableSchema>(data.schema, project.schema);
    const rawRecords = safeParseJson<any[]>(data.records, recordsForStorage);
    
    // Convert records back to field names for return
    const records = rawRecords.map(record => convertFieldIdsToNames(record, schema));
    
    // Log activity
    await activityService.logActivity({
      type: 'table_created',
      description: `Created table: ${data.name}`,
      resourceType: 'table',
      resourceId: data.id,
      resourceName: data.name,
      metadata: { databaseId: project.database_id }
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      user_id: project.user_id,
      schema: schema,
      records: records,
      database_id: data.database_id,
      subscription_enabled: data.subscription_enabled
    };
  },

  async updateTableProject(id: string, updates: {
    name?: string;
    description?: string;
    schema?: TableSchema;
    records?: TableRecord[];
    database_id?: string;
    subscription_enabled?: boolean;
    formConfig?: any;
    view_settings?: {[viewType: string]: ViewSettings};
  }): Promise<TableProject> {
    const supabaseUpdates: any = { ...updates };
    
    // Map formConfig to form_config for database
    if (updates.formConfig !== undefined) {
      supabaseUpdates.form_config = updates.formConfig;
      delete supabaseUpdates.formConfig;
    }
    
    // If we're updating records, convert field names to IDs for storage
    if (updates.records && updates.schema) {
      supabaseUpdates.records = updates.records.map(record => 
        convertFieldNamesToIds(record, updates.schema!)
      );
    } else if (updates.records) {
      // If no schema provided, we need to get the current schema to do the conversion
      const currentProject = await this.getTableProject(id);
      supabaseUpdates.records = updates.records.map(record => 
        convertFieldNamesToIds(record, currentProject.schema)
      );
    }
    
    const { data, error } = await supabase
      .from("table_projects")
      .update(supabaseUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    // Invalidate cache after update so subsequent reads get fresh data
    tableProjectCache.delete(id);

    if (error) throw error;
    
    if (!data) {
      throw new Error("Table project not found");
    }
    
    // Ensure we correctly parse JSON data from database
    const schema = safeParseJson<TableSchema>(data.schema, updates.schema || { id: crypto.randomUUID(), name: data.name, fields: [] });
    const rawRecords = safeParseJson<any[]>(data.records, []);
    const formConfig = safeParseJson<any>((data as any).form_config, updates.formConfig);
    const viewSettings = safeParseJson<{[viewType: string]: ViewSettings}>(data.view_settings, updates.view_settings || {});
    
    // Convert records back to field names
    const records = rawRecords.map(record => convertFieldIdsToNames(record, schema));
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      user_id: data.user_id,
      schema: schema,
      records: records,
      database_id: data.database_id,
      subscription_enabled: data.subscription_enabled,
      formConfig: formConfig,
      view_settings: viewSettings,
      updated_at: data.updated_at
    };
  },

  async deleteTableProject(id: string) {
    const { error } = await supabase
      .from("table_projects")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return true;
  },

  async addRecord(tableProjectId: string, record: any, existingRecords: TableRecord[]): Promise<TableRecord> {
    try {
      // Get the current project to access schema
      const project = await this.getTableProject(tableProjectId);
      
      // Log project data for debugging
      console.log('Add record - project schema:', project.schema);
      console.log('Add record - existing records count:', existingRecords.length);
      
      // Ensure record has an ID and uses field names
      const newRecord = {
        id: record.id || generateRecordId(record, project.schema),
        ...record
      };

      // Auto-populate timestamp fields from schema
      if (project.schema?.fields) {
        for (const field of project.schema.fields) {
          if (field.type === 'timestamp') {
            const key = field.id || field.name;
            const nameKey = field.name;
            if (!newRecord[key] && !newRecord[nameKey]) {
              newRecord[nameKey] = new Date().toISOString();
            }
          }
        }
      }
      
      console.log('Add record - new record:', newRecord);
      
      // Convert to field names if needed (in case record comes with field IDs)
      const recordWithFieldNames = convertFieldIdsToNames(newRecord, project.schema);
      
      console.log('Add record - converted record:', recordWithFieldNames);
      
      const records = [...existingRecords, recordWithFieldNames];
      
      console.log('Add record - total records to save:', records.length);
      
      await this.updateTableProject(tableProjectId, { records });
      return recordWithFieldNames;
    } catch (error) {
      console.error('Error in addRecord:', error);
      throw error;
    }
  },

  async addRecords(tableProjectId: string, newRecords: any[], existingRecords: TableRecord[]): Promise<TableRecord[]> {
    try {
      // Get the current project to access schema
      const project = await this.getTableProject(tableProjectId);
      
      console.log('Add records - project schema:', project.schema);
      console.log('Add records - existing records count:', existingRecords.length);
      console.log('Add records - new records count:', newRecords.length);
      
      // Process all new records
      const processedRecords: TableRecord[] = newRecords.map(record => {
        const newRecord = {
          id: record.id || generateRecordId(record, project.schema),
          ...record
        };
        // Auto-populate timestamp fields from schema
        if (project.schema?.fields) {
          for (const field of project.schema.fields) {
            if (field.type === 'timestamp') {
              const key = field.id || field.name;
              const nameKey = field.name;
              if (!newRecord[key] && !newRecord[nameKey]) {
                newRecord[nameKey] = new Date().toISOString();
              }
            }
          }
        }
        return convertFieldIdsToNames(newRecord, project.schema);
      });
      
      console.log('Add records - processed records:', processedRecords);
      
      // Combine existing and new records
      const allRecords = [...existingRecords, ...processedRecords];
      
      console.log('Add records - total records to save:', allRecords.length);
      
      await this.updateTableProject(tableProjectId, { records: allRecords });
      return processedRecords;
    } catch (error) {
      console.error('Error in addRecords:', error);
      throw error;
    }
  },

  async updateRecord(tableProjectId: string, recordId: string, updates: any, existingRecords: TableRecord[]): Promise<TableRecord> {
    try {
      console.log('updateRecord - starting update for recordId:', recordId);
      console.log('updateRecord - updates:', updates);
      console.log('updateRecord - existingRecords count:', existingRecords.length);
      
      // Get the current project to access schema
      const project = await this.getTableProject(tableProjectId);
      console.log('updateRecord - project schema fields:', project.schema.fields.map(f => ({ id: f.id, name: f.name })));
      
      // Convert field IDs to field names in updates WITHOUT modifying the ID
      const fieldIdToNameMap: { [key: string]: string } = {};
      project.schema.fields.forEach(field => {
        fieldIdToNameMap[field.id] = field.name;
      });
      
      const updatesWithFieldNames: any = {};
      Object.keys(updates).forEach(key => {
        if (key === 'id') {
          // Skip ID field in updates - we should never update the record ID
          return;
        } else if (fieldIdToNameMap[key]) {
          // Convert field ID to field name
          updatesWithFieldNames[fieldIdToNameMap[key]] = updates[key];
        } else {
          // Already a field name, keep as is
          updatesWithFieldNames[key] = updates[key];
        }
      });
      
      console.log('updateRecord - updatesWithFieldNames:', updatesWithFieldNames);
      
      const updatedRecords = existingRecords.map(record => 
        record.id === recordId ? { ...record, ...updatesWithFieldNames } : record
      );
      
      console.log('updateRecord - updatedRecords count:', updatedRecords.length);
      console.log('updateRecord - updated record:', updatedRecords.find(r => r.id === recordId));
      
      await this.updateTableProject(tableProjectId, { records: updatedRecords });
      
      return updatedRecords.find(r => r.id === recordId)!;
    } catch (error) {
      console.error('Error in updateRecord:', error);
      throw error;
    }
  },

  async deleteRecord(tableProjectId: string, recordId: string, existingRecords: TableRecord[]): Promise<boolean> {
    console.log('deleteRecord - starting deletion for recordId:', recordId);
    console.log('deleteRecord - tableProjectId:', tableProjectId);
    console.log('deleteRecord - existingRecords count before:', existingRecords.length);
    console.log('deleteRecord - existing record IDs:', existingRecords.map(r => r.id));
    
    const filteredRecords = existingRecords.filter(record => record.id !== recordId);
    console.log('deleteRecord - filteredRecords count after:', filteredRecords.length);
    
    if (filteredRecords.length === existingRecords.length) {
      console.warn('deleteRecord - no record was filtered out, record ID might not exist:', recordId);
    }
    
    await this.updateTableProject(tableProjectId, { records: filteredRecords });
    console.log('deleteRecord - updateTableProject completed successfully');
    return true;
  },

  async deleteRecords(tableProjectId: string, recordIds: string[], existingRecords: TableRecord[]): Promise<number> {
    console.log('deleteRecords - starting bulk deletion for recordIds:', recordIds);
    console.log('deleteRecords - existingRecords count before:', existingRecords.length);
    
    const recordIdSet = new Set(recordIds);
    const filteredRecords = existingRecords.filter(record => !recordIdSet.has(record.id));
    const deletedCount = existingRecords.length - filteredRecords.length;
    
    console.log('deleteRecords - filteredRecords count after:', filteredRecords.length);
    console.log('deleteRecords - deleted count:', deletedCount);
    
    await this.updateTableProject(tableProjectId, { records: filteredRecords });
    console.log('deleteRecords - updateTableProject completed successfully');
    return deletedCount;
  },

  async updateRecords(tableProjectId: string, recordIds: string[], updates: any, existingRecords: TableRecord[]): Promise<TableRecord[]> {
    try {
      console.log('updateRecords - starting bulk update for recordIds:', recordIds);
      console.log('updateRecords - updates:', updates);
      
      // Get the current project to access schema
      const project = await this.getTableProject(tableProjectId);
      
      // Convert field IDs to field names in updates
      const fieldIdToNameMap: { [key: string]: string } = {};
      project.schema.fields.forEach(field => {
        fieldIdToNameMap[field.id] = field.name;
      });
      
      const updatesWithFieldNames: any = {};
      Object.keys(updates).forEach(key => {
        if (key === 'id') return; // Skip ID field
        if (fieldIdToNameMap[key]) {
          updatesWithFieldNames[fieldIdToNameMap[key]] = updates[key];
        } else {
          updatesWithFieldNames[key] = updates[key];
        }
      });
      
      const recordIdSet = new Set(recordIds);
      const updatedRecords = existingRecords.map(record => 
        recordIdSet.has(record.id) ? { ...record, ...updatesWithFieldNames } : record
      );
      
      console.log('updateRecords - updated records count:', recordIds.length);
      
      await this.updateTableProject(tableProjectId, { records: updatedRecords });
      return updatedRecords.filter(r => recordIdSet.has(r.id));
    } catch (error) {
      console.error('Error in updateRecords:', error);
      throw error;
    }
  },

  // Method to update only view settings
  async updateViewSettings(tableProjectId: string, viewType: string, settings: ViewSettings): Promise<void> {
    // Get current project to preserve existing view settings
    const currentProject = await this.getTableProject(tableProjectId);
    const currentViewSettings = currentProject.view_settings || {};
    
    // Update only the specific view type
    const updatedViewSettings = {
      ...currentViewSettings,
      [viewType]: settings
    };

    const { error } = await supabase
      .from("table_projects")
      .update({ view_settings: updatedViewSettings })
      .eq("id", tableProjectId);

    if (error) throw error;
  },

  generateTableId: () => {
    return crypto.randomUUID();
  }
};
