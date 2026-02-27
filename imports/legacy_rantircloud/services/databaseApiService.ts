import { supabase } from '@/integrations/supabase/client';

export type ApiKeyScope = 'read' | 'write' | 'delete' | 'schema' | 'admin';

export interface ApiKey {
  id: string;
  user_id: string;
  database_id: string | null;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreate {
  name: string;
  database_id?: string | null;
  scopes?: ApiKeyScope[];
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  expires_at?: string | null;
}

export interface ApiKeyResponse {
  id: string;
  key: string;
  prefix: string;
  name: string;
  scopes: ApiKeyScope[];
}

export interface Webhook {
  id: string;
  user_id: string;
  database_id: string | null;
  table_id: string | null;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  headers: Record<string, string>;
  is_active: boolean;
  last_triggered_at: string | null;
  total_deliveries: number;
  failed_deliveries: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  database_id?: string | null;
  table_id?: string | null;
  events?: string[];
  headers?: Record<string, string>;
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  avgResponseTimeMs: number;
  logs: UsageLog[];
}

export interface UsageLog {
  id: string;
  api_key_id: string | null;
  user_id: string | null;
  database_id: string | null;
  table_id: string | null;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export const databaseApiService = {
  // ===== API KEYS =====
  
  async listApiKeys(databaseId?: string): Promise<ApiKey[]> {
    let query = supabase
      .from('database_api_keys')
      .select('id, user_id, database_id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at, last_used_at, total_requests, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (databaseId) {
      query = query.eq('database_id', databaseId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as ApiKey[];
  },
  
  async createApiKey(params: ApiKeyCreate): Promise<ApiKeyResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase.rpc('generate_api_key', {
      p_user_id: user.id,
      p_database_id: params.database_id || null,
      p_name: params.name,
      p_scopes: params.scopes || ['read'],
      p_rate_limit_per_minute: params.rate_limit_per_minute || 60,
      p_rate_limit_per_day: params.rate_limit_per_day || 10000,
      p_expires_at: params.expires_at || null,
    });
    
    if (error) throw error;
    return data as unknown as ApiKeyResponse;
  },
  
  async getApiKey(keyId: string): Promise<ApiKey> {
    const { data, error } = await supabase
      .from('database_api_keys')
      .select('id, user_id, database_id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at, last_used_at, total_requests, created_at, updated_at')
      .eq('id', keyId)
      .single();
    
    if (error) throw error;
    return data as ApiKey;
  },
  
  async updateApiKey(keyId: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const { data, error } = await supabase
      .from('database_api_keys')
      .update(updates)
      .eq('id', keyId)
      .select('id, user_id, database_id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at, last_used_at, total_requests, created_at, updated_at')
      .single();
    
    if (error) throw error;
    return data as ApiKey;
  },
  
  async deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('database_api_keys')
      .delete()
      .eq('id', keyId);
    
    if (error) throw error;
  },
  
  async toggleApiKey(keyId: string, isActive: boolean): Promise<ApiKey> {
    const { data, error } = await supabase
      .from('database_api_keys')
      .update({ is_active: isActive })
      .eq('id', keyId)
      .select('id, user_id, database_id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at, last_used_at, total_requests, created_at, updated_at')
      .single();
    
    if (error) throw error;
    return data as ApiKey;
  },
  
  // ===== WEBHOOKS =====
  
  async listWebhooks(databaseId?: string, tableId?: string): Promise<Webhook[]> {
    let query = supabase
      .from('database_webhooks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (databaseId) {
      query = query.eq('database_id', databaseId);
    }
    if (tableId) {
      query = query.eq('table_id', tableId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as Webhook[];
  },
  
  async createWebhook(params: WebhookCreate): Promise<Webhook> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('database_webhooks')
      .insert({
        user_id: user.id,
        name: params.name,
        url: params.url,
        database_id: params.database_id || null,
        table_id: params.table_id || null,
        events: params.events || ['record.created'],
        headers: params.headers || {},
        secret: params.secret || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Webhook;
  },
  
  async getWebhook(webhookId: string): Promise<Webhook> {
    const { data, error } = await supabase
      .from('database_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();
    
    if (error) throw error;
    return data as Webhook;
  },
  
  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<Webhook> {
    const { data, error } = await supabase
      .from('database_webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Webhook;
  },
  
  async deleteWebhook(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from('database_webhooks')
      .delete()
      .eq('id', webhookId);
    
    if (error) throw error;
  },
  
  async toggleWebhook(webhookId: string, isActive: boolean): Promise<Webhook> {
    return this.updateWebhook(webhookId, { is_active: isActive });
  },
  
  async testWebhook(webhookId: string): Promise<{ success: boolean; status?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('database-api', {
      body: {},
      method: 'POST',
      headers: {
        'x-custom-path': `/webhooks/${webhookId}/test`,
      },
    });
    
    if (error) throw error;
    return data;
  },
  
  async getWebhookDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
    const { data, error } = await supabase
      .from('webhook_delivery_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as WebhookDelivery[];
  },
  
  // ===== USAGE STATS =====
  
  async getUsageStats(params?: {
    databaseId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<UsageStats> {
    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (params?.databaseId) {
      query = query.eq('database_id', params.databaseId);
    }
    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const logs = data as UsageLog[];
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.status_code >= 200 && l.status_code < 300).length;
    const avgResponseTime = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
      : 0;
    
    return {
      totalRequests,
      successfulRequests,
      errorRequests: totalRequests - successfulRequests,
      avgResponseTimeMs: avgResponseTime,
      logs: logs.slice(0, 100),
    };
  },
  
  // ===== API BASE URL =====
  
  getApiBaseUrl(): string {
    return 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/database-api';
  },
};
