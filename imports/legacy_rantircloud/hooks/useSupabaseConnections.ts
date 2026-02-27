import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseConnection {
  id: string;
  project_name: string;
  supabase_url: string;
  created_at: string;
}

export function useSupabaseConnections() {
  const [connections, setConnections] = useState<SupabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('user_supabase_connections')
      .select('id, project_name, supabase_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setConnections((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const initiateOAuth = useCallback(async (returnUrl?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('supabase-oauth-callback', {
      method: 'POST',
      body: { returnUrl: returnUrl || window.location.href },
    });

    if (error) {
      console.error('Failed to initiate Supabase OAuth:', error);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  }, []);

  const addConnection = useCallback(async (projectName: string, supabaseUrl: string, anonKey: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_supabase_connections')
      .insert({
        user_id: user.id,
        project_name: projectName,
        supabase_url: supabaseUrl,
        supabase_anon_key: anonKey,
      })
      .select('id, project_name, supabase_url, created_at')
      .single();

    if (error) { console.error('Failed to add Supabase connection:', error); return null; }
    setConnections(prev => [data as any, ...prev]);
    return data;
  }, []);

  const removeConnection = useCallback(async (id: string) => {
    await supabase.from('user_supabase_connections').delete().eq('id', id);
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  return { connections, loading, initiateOAuth, addConnection, removeConnection, refetch: fetchConnections };
}
