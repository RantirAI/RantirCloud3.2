import { supabase } from '@/integrations/supabase/client';

export interface DesignSystemTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preview_color: string;
  tokens: {
    colors?: Array<{ name: string; value: string; category: string }>;
    fonts?: Array<{ name: string; value: string; category: string }>;
    spacing?: Array<{ name: string; value: string; category: string }>;
    shadows?: Array<{ name: string; value: string; category: string }>;
  };
  button_presets: Array<{
    name: string;
    variant: string;
    styles: Record<string, any>;
    states?: Record<string, any>;
  }>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

class DesignTemplateService {
  async getTemplates(): Promise<DesignSystemTemplate[]> {
    const { data, error } = await supabase
      .from('design_system_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading design templates:', error);
      throw error;
    }

    return (data || []).map(template => ({
      ...template,
      tokens: template.tokens as DesignSystemTemplate['tokens'],
      button_presets: template.button_presets as DesignSystemTemplate['button_presets']
    }));
  }

  async applyTemplateToProject(
    templateId: string,
    appProjectId: string
  ): Promise<{ tokensCreated: number; presetsCreated: number; templateName: string }> {
    // Get current session for auth header
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be signed in to apply design templates');
    }

    // Call the edge function with auth header
    const { data, error } = await supabase.functions.invoke('apply-design-template', {
      body: { appProjectId, templateId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to apply template');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to apply template');
    }

    return {
      tokensCreated: data.tokensCreated,
      presetsCreated: data.presetsCreated,
      templateName: data.templateName
    };
  }

  async getDesignSystemStatus(appProjectId: string): Promise<{ tokensCount: number; presetsCount: number }> {
    const [tokensResult, presetsResult] = await Promise.all([
      supabase
        .from('design_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('app_project_id', appProjectId),
      supabase
        .from('button_presets')
        .select('id', { count: 'exact', head: true })
        .eq('app_project_id', appProjectId)
    ]);

    return {
      tokensCount: tokensResult.count || 0,
      presetsCount: presetsResult.count || 0
    };
  }
}

export const designTemplateService = new DesignTemplateService();
