import { supabase } from '@/integrations/supabase/client';

export interface DataConnection {
  tableId: string;
  tableName: string;
  databaseId: string;
}

export interface PublishedApp {
  id: string;
  app_project_id: string;
  slug: string;
  custom_domain?: string;
  status: string;
  access_type: 'public' | 'password';
  views: number;
  unique_visitors: number;
  created_at: string;
  updated_at: string;
  // New fields for Database API integration
  read_only_api_key_id?: string;
  api_key_prefix?: string;
  data_connections?: DataConnection[];
}

export interface CustomDomain {
  id: string;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  dns_verified: boolean;
  ssl_status: 'pending' | 'provisioning' | 'active' | 'failed';
}

export interface AppAnalytics {
  id: string;
  published_app_id: string;
  visitor_id: string;
  page_path: string;
  user_agent?: string;
  ip_address?: string;
  country?: string;
  referrer?: string;
  session_duration?: number;
  created_at: string;
}

class PublishingService {
  /**
   * Publish an app project
   */
  async publishApp(params: {
    appProjectId: string;
    slug?: string;
    accessType: 'public' | 'password';
    password?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('publish-app', {
      body: params
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get published app by project ID
   */
  async getPublishedApp(projectId: string): Promise<PublishedApp | null> {
    const { data, error } = await supabase
      .from('published_apps')
      .select('*')
      .eq('app_project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as PublishedApp;
  }

  /**
   * Get all published apps for the current user
   */
  async getUserPublishedApps(): Promise<PublishedApp[]> {
    const { data, error } = await supabase
      .from('published_apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as PublishedApp[];
  }

  /**
   * Unpublish an app
   */
  async unpublishApp(publishedAppId: string) {
    const { error } = await supabase
      .from('published_apps')
      .update({ status: 'unpublished' })
      .eq('id', publishedAppId);

    if (error) throw error;
  }

  /**
   * Delete a published app completely
   */
  async deletePublishedApp(publishedAppId: string) {
    const { error } = await supabase
      .from('published_apps')
      .delete()
      .eq('id', publishedAppId);

    if (error) throw error;
  }

  /**
   * Add a custom domain
   */
  async addCustomDomain(publishedAppId: string, domain: string) {
    const { data, error } = await supabase.functions.invoke('manage-domains', {
      body: {
        publishedAppId,
        domain,
        action: 'add'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Verify a custom domain
   */
  async verifyCustomDomain(domain: string) {
    const { data, error } = await supabase.functions.invoke('manage-domains', {
      body: {
        domain,
        action: 'verify'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Remove a custom domain
   */
  async removeCustomDomain(publishedAppId: string, domain: string) {
    const { data, error } = await supabase.functions.invoke('manage-domains', {
      body: {
        publishedAppId,
        domain,
        action: 'remove'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get custom domains for a published app
   */
  async getCustomDomains(publishedAppId: string): Promise<CustomDomain[]> {
    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('published_app_id', publishedAppId);

    if (error) throw error;
    return (data || []) as CustomDomain[];
  }

  /**
   * Get analytics for a published app
   */
  async getAppAnalytics(publishedAppId: string, limit = 100): Promise<AppAnalytics[]> {
    const { data, error } = await supabase
      .from('app_analytics')
      .select('*')
      .eq('published_app_id', publishedAppId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AppAnalytics[];
  }

  /**
   * Get analytics summary for a published app
   */
  async getAnalyticsSummary(publishedAppId: string) {
    // Get total views
    const { count: totalViews, error: viewsError } = await supabase
      .from('app_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('published_app_id', publishedAppId);

    if (viewsError) throw viewsError;

    // Get unique visitors
    const { data: uniqueVisitors, error: visitorsError } = await supabase
      .from('app_analytics')
      .select('visitor_id')
      .eq('published_app_id', publishedAppId);

    if (visitorsError) throw visitorsError;

    const uniqueVisitorCount = new Set(uniqueVisitors?.map(v => v.visitor_id)).size;

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentViews, error: recentError } = await supabase
      .from('app_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('published_app_id', publishedAppId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) throw recentError;

    return {
      totalViews: totalViews || 0,
      uniqueVisitors: uniqueVisitorCount,
      recentViews: recentViews || 0,
      averageViewsPerVisitor: uniqueVisitorCount > 0 ? (totalViews || 0) / uniqueVisitorCount : 0
    };
  }

  /**
   * Generate app URL
   */
  generateAppUrl(publishedApp: PublishedApp): string {
    if (publishedApp.custom_domain) {
      return `https://${publishedApp.custom_domain}`;
    }
    return `https://${publishedApp.slug}.rantir.cloud`;
  }

  /**
   * Generate embed code
   */
  generateEmbedCode(publishedApp: PublishedApp, width = '100%', height = '600'): string {
    const url = this.generateAppUrl(publishedApp);
    return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0"></iframe>`;
  }
}

export const publishingService = new PublishingService();