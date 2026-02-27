import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billing_period: string;
  features: Json;
  max_tables?: number;
  max_records_per_table?: number;
  access_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface GatedContent {
  id: string;
  table_project_id: string;
  content_url: string;
  page_title?: string;
  access_rules: Json;
  required_plans: Json;
  data_ms_conditions: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface AccessLog {
  id: string;
  user_id?: string;
  gated_content_id: string;
  action: string;
  status: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Json;
  created_at: string;
}

export interface EmbedConfiguration {
  id: string;
  table_project_id: string;
  embed_type: string;
  configuration: any;
  embed_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const subscriptionService = {
  // Subscription Plans
  async getSubscriptionPlans(userId: string): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .insert(plan)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from("subscription_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSubscriptionPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from("subscription_plans")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // User Subscriptions
  async getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createUserSubscription(subscription: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<UserSubscription> {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Gated Content
  async getGatedContent(tableProjectId: string): Promise<GatedContent[]> {
    const { data, error } = await supabase
      .from("gated_content")
      .select("*")
      .eq("table_project_id", tableProjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createGatedContent(content: Omit<GatedContent, 'id' | 'created_at' | 'updated_at'>): Promise<GatedContent> {
    const { data, error } = await supabase
      .from("gated_content")
      .insert(content)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGatedContent(id: string, updates: Partial<GatedContent>): Promise<GatedContent> {
    const { data, error } = await supabase
      .from("gated_content")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGatedContent(id: string): Promise<void> {
    const { error } = await supabase
      .from("gated_content")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Access Logs
  async getAccessLogs(gatedContentId?: string, userId?: string): Promise<AccessLog[]> {
    let query = supabase
      .from("access_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (gatedContentId) {
      query = query.eq("gated_content_id", gatedContentId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(log => ({
      ...log,
      ip_address: log.ip_address as string | undefined
    }));
  },

  async logAccess(log: Omit<AccessLog, 'id' | 'created_at'>): Promise<AccessLog> {
    const { data, error } = await supabase
      .from("access_logs")
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      ip_address: data.ip_address as string | undefined
    };
  },

  // Embed Configurations
  async getEmbedConfigurations(tableProjectId: string): Promise<EmbedConfiguration[]> {
    const { data, error } = await supabase
      .from("embed_configurations")
      .select("*")
      .eq("table_project_id", tableProjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createEmbedConfiguration(config: Omit<EmbedConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<EmbedConfiguration> {
    const { data, error } = await supabase
      .from("embed_configurations")
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEmbedConfiguration(id: string, updates: Partial<EmbedConfiguration>): Promise<EmbedConfiguration> {
    const { data, error } = await supabase
      .from("embed_configurations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Utility functions
  async checkAccess(userId: string, gatedContentId: string): Promise<boolean> {
    // Get gated content and required plans
    const { data: gatedContent, error: contentError } = await supabase
      .from("gated_content")
      .select("required_plans")
      .eq("id", gatedContentId)
      .single();

    if (contentError || !gatedContent) return false;

    // Check if user has any of the required plans
    const { data: userSubs, error: subsError } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("status", "active");

    if (subsError || !userSubs) return false;

    const userPlanIds = userSubs.map(sub => sub.plan_id);
    const requiredPlans = gatedContent.required_plans as string[];

    return requiredPlans.some(planId => userPlanIds.includes(planId));
  }
};