import { supabase } from '@/integrations/supabase/client';
import { StyleClass } from '@/types/classes';

export class ClassService {
  static async loadClasses(appProjectId: string): Promise<StyleClass[]> {
    const { data, error } = await supabase
      .from('style_classes')
      .select('*')
      .eq('app_project_id', appProjectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading classes:', error);
      throw error;
    }

    return data?.map(item => ({
      id: item.id,
      name: item.name,
      styles: (item.styles as Record<string, any>) || {},
      stateStyles: ((item as any).state_styles as Record<string, any>) || {
        none: (item.styles as Record<string, any>) || {},
        hover: {},
        pressed: {},
        focused: {},
        'focus-visible': {},
        'focus-within': {}
      },
      appliedTo: Array.isArray(item.applied_to) ? (item.applied_to as string[]) : [],
      inheritsFrom: Array.isArray((item as any).inherits_from) ? ((item as any).inherits_from as string[]) : [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    })) || [];
  }

  static async saveClass(appProjectId: string, styleClass: Omit<StyleClass, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('style_classes')
      .insert({
        user_id: user.id,
        app_project_id: appProjectId,
        name: styleClass.name,
        styles: styleClass.styles,
        applied_to: styleClass.appliedTo
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving class:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      styles: (data.styles as Record<string, any>) || {},
      stateStyles: {
        none: (data.styles as Record<string, any>) || {},
        hover: {},
        pressed: {},
        focused: {},
        'focus-visible': {},
        'focus-within': {}
      },
      appliedTo: Array.isArray(data.applied_to) ? (data.applied_to as string[]) : [],
      inheritsFrom: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isAutoClass: styleClass.isAutoClass || false
    };
  }

  static async updateClass(classId: string, updates: Partial<Pick<StyleClass, 'name' | 'styles' | 'appliedTo' | 'stateStyles' | 'inheritsFrom'>>) {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.styles !== undefined) updateData.styles = updates.styles;
    if (updates.appliedTo !== undefined) updateData.applied_to = updates.appliedTo;

    const { data, error } = await supabase
      .from('style_classes')
      .update(updateData)
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      styles: (data.styles as Record<string, any>) || {},
      stateStyles: {
        none: (data.styles as Record<string, any>) || {},
        hover: {},
        pressed: {},
        focused: {},
        'focus-visible': {},
        'focus-within': {}
      },
      appliedTo: Array.isArray(data.applied_to) ? (data.applied_to as string[]) : [],
      inheritsFrom: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  static async deleteClass(classId: string) {
    const { error } = await supabase
      .from('style_classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  }
}