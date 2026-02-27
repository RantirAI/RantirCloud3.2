import { supabase } from '@/integrations/supabase/client';
import type { 
  WorkspaceMember, 
  BillingPlan, 
  WorkspacePlan, 
  EnterpriseKey, 
  EnterpriseAudit,
  EnterpriseUpgradeResult,
  ApiKeyGenerationResult
} from '@/types/enterprise';

export const enterpriseService = {
  async checkIsEnterprise(workspaceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('is_enterprise')
      .eq('id', workspaceId)
      .single();
    
    if (error) {
      console.error('Error checking enterprise status:', error);
      return false;
    }
    
    return data?.is_enterprise || false;
  },

  async checkUserIsEnterprise(userId: string, workspaceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_group')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error) {
      console.error('Error checking user enterprise status:', error);
      return false;
    }
    
    return data?.user_group === 'enterprise';
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data: membersData, error: membersError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    
    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
      return [];
    }

    if (!membersData || membersData.length === 0) {
      return [];
    }

    // Fetch profiles separately
    const userIds = membersData.map(m => m.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Merge profiles data with members
    const members = membersData.map(member => ({
      ...member,
      profiles: profilesData?.find(p => p.id === member.user_id)
    }));

    return members as WorkspaceMember[];
  },

  async inviteEnterpriseUser(workspaceId: string, email: string, role: string = 'member'): Promise<{ invitationLink: string }> {
    const { data, error } = await supabase.functions.invoke('send-workspace-invitation', {
      body: { workspaceId, email, role }
    });

    if (error) {
      console.error('Error inviting user:', error);
      throw new Error(error.message || 'Failed to send invitation');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to send invitation');
    }

    return { invitationLink: data.invitationLink };
  },

  async generateApiKey(workspaceId: string, scopes: string[] = ['read', 'write']): Promise<string> {
    const { data, error } = await supabase.rpc('generate_enterprise_key', {
      target_workspace_id: workspaceId,
      key_scopes: scopes
    });
    
    if (error) {
      console.error('Error generating API key:', error);
      throw new Error(error.message || 'Failed to generate API key');
    }
    
    const result = data as unknown as ApiKeyGenerationResult;
    if (!result.success) {
      throw new Error('Failed to generate API key');
    }
    
    return result.api_key;
  },

  async getEnterpriseKeys(workspaceId: string): Promise<EnterpriseKey[]> {
    const { data, error } = await supabase
      .from('enterprise_keys')
      .select(`
        *,
        profiles:created_by (name)
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching enterprise keys:', error);
      return [];
    }
    
    return (data || []) as EnterpriseKey[];
  },

  async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_enterprise_key', {
      key_id: keyId
    });
    
    if (error) {
      console.error('Error revoking API key:', error);
      throw new Error(error.message || 'Failed to revoke API key');
    }
  },

  async getWorkspacePlan(workspaceId: string): Promise<WorkspacePlan | null> {
    const { data, error } = await supabase
      .from('workspace_plans')
      .select(`
        *,
        billing_plans (*)
      `)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error) {
      console.error('Error fetching workspace plan:', error);
      return null;
    }
    
    return data as WorkspacePlan;
  },

  async getBillingPlans(): Promise<BillingPlan[]> {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('Error fetching billing plans:', error);
      return [];
    }
    
    return (data || []) as BillingPlan[];
  },

  async upgradeWorkspace(workspaceId: string): Promise<string> {
    const { data, error } = await supabase.rpc('make_workspace_enterprise', {
      target_workspace_id: workspaceId
    });
    
    if (error) {
      console.error('Error upgrading workspace:', error);
      throw new Error(error.message || 'Failed to upgrade workspace');
    }
    
    const result = data as unknown as EnterpriseUpgradeResult;
    if (!result.success) {
      throw new Error('Failed to upgrade workspace');
    }
    
    return result.api_key;
  },

  async getAuditLogs(workspaceId: string, limit: number = 50): Promise<EnterpriseAudit[]> {
    const { data, error } = await supabase
      .from('enterprise_audit')
      .select(`
        *,
        profiles:actor_id (name)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    
    return (data || []) as EnterpriseAudit[];
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error removing member:', error);
      throw new Error('Failed to remove member');
    }
  },

  async updateMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating member role:', error);
      throw new Error('Failed to update member role');
    }
  }
};