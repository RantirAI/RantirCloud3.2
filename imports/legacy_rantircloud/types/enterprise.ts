export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  user_group: 'standard' | 'enterprise';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name?: string;
    avatar_url?: string;
  };
}

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly' | 'one-time';
  seat_limit?: number;
  features: string[];
  is_enterprise: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePlan {
  id: string;
  workspace_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  seats: number;
  current_period_start?: string;
  current_period_end?: string;
  external_subscription_id?: string;
  created_at: string;
  updated_at: string;
  billing_plans?: BillingPlan;
}

export interface EnterpriseKey {
  id: string;
  workspace_id: string;
  key_hash: string;
  last4: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'archived';
  created_by?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name?: string;
  };
}

export interface EnterpriseAudit {
  id: string;
  workspace_id: string;
  actor_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  created_at: string;
  profiles?: {
    name?: string;
  };
}

export interface EnterpriseUpgradeResult {
  success: boolean;
  api_key: string;
  workspace_id: string;
}

export interface ApiKeyGenerationResult {
  success: boolean;
  api_key: string;
}