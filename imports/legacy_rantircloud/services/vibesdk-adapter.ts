import { supabase } from '@/integrations/supabase/client';

export class VibesdkRantirAdapter {
  async getDatabaseSchema(userId: string) {
    try {
      const { data: databases, error: dbError } = await supabase
        .from('databases')
        .select('id, name, description')
        .eq('user_id', userId);

      if (dbError) throw dbError;

      const schemasPromises = (databases || []).map(async (db) => {
        const { data: tables, error: tableError } = await supabase
          .from('table_projects')
          .select('id, name, schema, description')
          .eq('database_id', db.id);

        if (tableError) {
          console.error(`Error fetching tables for ${db.name}:`, tableError);
          return { ...db, tables: [] };
        }

        return {
          ...db,
          tables: tables || []
        };
      });

      const schemas = await Promise.all(schemasPromises || []);
      return schemas;
    } catch (error) {
      console.error('Error getting database schema:', error);
      return [];
    }
  }

  async getTableData(tableName: string, limit: number = 100) {
    try {
      // Use type assertion since tableName is dynamic
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${tableName}:`, error);
      throw error;
    }
  }

  async getTableSchema(tableProjectId: string) {
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('schema, name')
        .eq('id', tableProjectId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching table schema:', error);
      throw error;
    }
  }

  async getUserDatabases(userId: string) {
    try {
      const { data, error } = await supabase
        .from('databases')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user databases:', error);
      return [];
    }
  }
}

export const vibesdkAdapter = new VibesdkRantirAdapter();
