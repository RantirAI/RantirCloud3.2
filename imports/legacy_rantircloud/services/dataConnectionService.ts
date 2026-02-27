import { supabase } from '@/integrations/supabase/client';

export interface DataConnection {
  id: string;
  table_project_id: string;
  user_id: string;
  name: string;
  connection_type: string;
  config: {
    tableName: string;
    select?: string;
    filters?: Record<string, any>;
    limit?: number;
  };
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QueryResult {
  data: any[];
  rowCount: number;
}

export const dataConnectionService = {
  async listConnections(tableProjectId: string): Promise<DataConnection[]> {
    const { data, error } = await supabase
      .from('data_connections')
      .select('*')
      .eq('table_project_id', tableProjectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DataConnection[];
  },

  async createConnection(
    tableProjectId: string,
    name: string,
    tableName: string,
    config: DataConnection['config']
  ): Promise<DataConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('data_connections')
      .insert({
        table_project_id: tableProjectId,
        user_id: user.id,
        name,
        connection_type: 'supabase_table',
        config: { tableName, ...config },
        status: 'disconnected',
      })
      .select()
      .single();

    if (error) throw error;
    return data as DataConnection;
  },

  async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('data_connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  },

  async queryConnection(connectionId: string, connection: DataConnection): Promise<QueryResult> {
    const { data, error } = await supabase.functions.invoke('query-data-connection', {
      body: {
        connectionId,
        tableName: connection.config.tableName,
        select: connection.config.select || '*',
        filters: connection.config.filters || {},
        limit: connection.config.limit || 100,
      },
    });

    if (error) throw error;
    return data;
  },

  async testConnection(connectionId: string, connection: DataConnection): Promise<boolean> {
    try {
      const result = await this.queryConnection(connectionId, connection);
      return result.data !== undefined;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  },
};
