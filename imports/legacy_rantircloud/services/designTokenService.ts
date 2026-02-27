import { supabase } from "@/integrations/supabase/client";

export interface DesignToken {
  id: string;
  name: string;
  value: string;
  category: 'color' | 'font' | 'spacing' | 'border' | 'shadow';
  description?: string;
  isActive: boolean;
  appProjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ButtonPreset {
  id: string;
  name: string;
  variant: string;
  styles: Record<string, any>;
  states: {
    hover?: Record<string, any>;
    pressed?: Record<string, any>;
    focused?: Record<string, any>;
  };
  appProjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

class DesignTokenService {
  async loadDesignTokens(appProjectId: string): Promise<DesignToken[]> {
    try {
      const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('app_project_id', appProjectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(token => ({
        id: token.id,
        name: token.name,
        value: token.value,
        category: token.category as DesignToken['category'],
        description: token.description,
        isActive: token.is_active,
        appProjectId: token.app_project_id,
        userId: token.user_id,
        createdAt: new Date(token.created_at),
        updatedAt: new Date(token.updated_at)
      })) || [];
    } catch (error: any) {
      console.error('Error loading design tokens:', error);
      throw new Error(`Failed to load design tokens: ${error.message}`);
    }
  }

  async saveDesignToken(
    appProjectId: string, 
    tokenData: Omit<DesignToken, 'id' | 'appProjectId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<DesignToken> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User must be authenticated to save design tokens');
      }

      const { data, error } = await supabase
        .from('design_tokens')
        .insert({
          app_project_id: appProjectId,
          user_id: userData.user.id,
          name: tokenData.name,
          value: tokenData.value,
          category: tokenData.category,
          description: tokenData.description,
          is_active: tokenData.isActive
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        value: data.value,
        category: data.category as DesignToken['category'],
        description: data.description,
        isActive: data.is_active,
        appProjectId: data.app_project_id,
        userId: data.user_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error: any) {
      console.error('Error saving design token:', error);
      throw new Error(`Failed to save design token: ${error.message}`);
    }
  }

  async updateDesignToken(
    tokenId: string, 
    updates: Partial<Pick<DesignToken, 'name' | 'value' | 'description' | 'isActive'>>
  ): Promise<void> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.value !== undefined) updateData.value = updates.value;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('design_tokens')
        .update(updateData)
        .eq('id', tokenId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating design token:', error);
      throw new Error(`Failed to update design token: ${error.message}`);
    }
  }

  async deleteDesignToken(tokenId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('design_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting design token:', error);
      throw new Error(`Failed to delete design token: ${error.message}`);
    }
  }

  async loadButtonPresets(appProjectId: string): Promise<ButtonPreset[]> {
    try {
      const { data, error } = await supabase
        .from('button_presets')
        .select('*')
        .eq('app_project_id', appProjectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(preset => ({
        id: preset.id,
        name: preset.name,
        variant: preset.variant,
        styles: preset.styles as Record<string, any>,
        states: preset.states as ButtonPreset['states'],
        appProjectId: preset.app_project_id,
        userId: preset.user_id,
        createdAt: new Date(preset.created_at),
        updatedAt: new Date(preset.updated_at)
      })) || [];
    } catch (error: any) {
      console.error('Error loading button presets:', error);
      throw new Error(`Failed to load button presets: ${error.message}`);
    }
  }

  async saveButtonPreset(
    appProjectId: string, 
    presetData: Omit<ButtonPreset, 'id' | 'appProjectId' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<ButtonPreset> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User must be authenticated to save button presets');
      }

      const { data, error } = await supabase
        .from('button_presets')
        .insert({
          app_project_id: appProjectId,
          user_id: userData.user.id,
          name: presetData.name,
          variant: presetData.variant,
          styles: presetData.styles,
          states: presetData.states
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        variant: data.variant,
        styles: data.styles as Record<string, any>,
        states: data.states as ButtonPreset['states'],
        appProjectId: data.app_project_id,
        userId: data.user_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error: any) {
      console.error('Error saving button preset:', error);
      throw new Error(`Failed to save button preset: ${error.message}`);
    }
  }

  async updateButtonPreset(
    presetId: string, 
    updates: Partial<Pick<ButtonPreset, 'name' | 'variant' | 'styles' | 'states'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('button_presets')
        .update(updates)
        .eq('id', presetId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating button preset:', error);
      throw new Error(`Failed to update button preset: ${error.message}`);
    }
  }

  async deleteButtonPreset(presetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('button_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting button preset:', error);
      throw new Error(`Failed to delete button preset: ${error.message}`);
    }
  }
}

export const designTokenService = new DesignTokenService();