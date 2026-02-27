import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GitHubConnection {
  id: string;
  github_username: string;
  github_user_id: number;
  avatar_url: string | null;
  scope: string | null;
  created_at: string;
}

export function useGitHubConnections() {
  const [connections, setConnections] = useState<GitHubConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('user_github_connections')
      .select('id, github_username, github_user_id, avatar_url, scope, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setConnections((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const initiateOAuth = useCallback(async (returnUrl?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('github-oauth-callback', {
      method: 'POST',
      body: { returnUrl: returnUrl || window.location.href },
    });

    if (error) {
      console.error('Failed to initiate GitHub OAuth:', error);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  }, []);

  const removeConnection = useCallback(async (id: string) => {
    await supabase.from('user_github_connections').delete().eq('id', id);
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  return { connections, loading, initiateOAuth, removeConnection, refetch: fetchConnections };
}
