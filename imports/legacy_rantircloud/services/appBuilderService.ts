import { supabase } from "@/integrations/supabase/client";
import { AppProject, AppPage, AppComponent } from "@/types/appBuilder";
import { parseStyleClassesConfig, StyleClassesConfig } from "@/types/styleClasses";
import { activityService } from "./activityService";

export const appBuilderService = {
  /**
   * Get app projects for a user, optionally filtered by workspace
   * When workspaceId is provided, returns ALL workspace apps (for shared access)
   * When no workspaceId, returns only user's own apps
   */
  async getUserAppProjects(userId: string, workspaceId?: string | null): Promise<AppProject[]> {
    let query = supabase
      .from("app_projects")
      .select("*");

    if (workspaceId) {
      // Workspace context: show ALL apps in this workspace (for team members)
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Personal context: show only user's own apps
      query = query.eq("user_id", userId);
    }
    
    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      pages: Array.isArray(item.pages) ? item.pages as unknown as AppPage[] : [],
      global_styles: typeof item.global_styles === 'object' ? item.global_styles as Record<string, any> : {},
      settings: typeof item.settings === 'object' ? item.settings as any : {},
      style_classes: parseStyleClassesConfig((item as any).style_classes)
    }));
  },

  async getAppProject(id: string): Promise<AppProject | null> {
    const { data, error } = await supabase
      .from("app_projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    return {
      ...data,
      pages: Array.isArray(data.pages) ? data.pages as unknown as AppPage[] : [],
      global_styles: typeof data.global_styles === 'object' ? data.global_styles as Record<string, any> : {},
      settings: typeof data.settings === 'object' ? data.settings as any : {},
      style_classes: parseStyleClassesConfig((data as any).style_classes)
    };
  },

  async createAppProject(project: Omit<AppProject, 'id' | 'created_at' | 'updated_at'>): Promise<AppProject> {
    const { data, error } = await supabase
      .from("app_projects")
      .insert({
        user_id: project.user_id,
        workspace_id: project.workspace_id,
        name: project.name,
        description: project.description,
        pages: project.pages as any,
        global_styles: project.global_styles as any,
        settings: project.settings as any,
        style_classes: project.style_classes as any
      })
      .select()
      .single();

    if (error) throw error;
    
    // Log activity
    await activityService.logActivity({
      type: 'app_created',
      description: `Created app: ${data.name}`,
      resourceType: 'app',
      resourceId: data.id,
      resourceName: data.name
    });

    // Notify UI (e.g., compact sidebar hover lists) to refresh immediately.
    // This centralizes the event so ANY code path that creates an app triggers it.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-created', { detail: { projectId: data.id } }));
      window.dispatchEvent(
        new CustomEvent('project-created', {
          detail: { projectId: data.id, projectType: 'app' },
        })
      );
    }
    
    return {
      ...data,
      pages: Array.isArray(data.pages) ? data.pages as unknown as AppPage[] : [],
      global_styles: typeof data.global_styles === 'object' ? data.global_styles as Record<string, any> : {},
      settings: typeof data.settings === 'object' ? data.settings as any : {},
      style_classes: parseStyleClassesConfig((data as any).style_classes)
    };
  },

  async updateAppProject(id: string, updates: Partial<AppProject>): Promise<AppProject> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.pages) updateData.pages = updates.pages as any;
    if (updates.global_styles) updateData.global_styles = updates.global_styles as any;
    if (updates.settings) updateData.settings = updates.settings as any;
    if (updates.style_classes) updateData.style_classes = updates.style_classes as any;
    
    const { data, error } = await supabase
      .from("app_projects")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      pages: Array.isArray(data.pages) ? data.pages as unknown as AppPage[] : [],
      global_styles: typeof data.global_styles === 'object' ? data.global_styles as Record<string, any> : {},
      settings: typeof data.settings === 'object' ? data.settings as any : {},
      style_classes: parseStyleClassesConfig((data as any).style_classes)
    };
  },

  async deleteAppProject(id: string): Promise<void> {
    const { error } = await supabase
      .from("app_projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Component Management
  async saveComponent(projectId: string, userId: string, name: string, componentData: AppComponent) {
    const { data, error } = await supabase
      .from("app_components")
      .insert({
        user_id: userId,
        app_project_id: projectId,
        name,
        component_data: componentData as any
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserComponents(projectId: string, userId: string) {
    const { data, error } = await supabase
      .from("app_components")
      .select("*")
      .eq("app_project_id", projectId)
      .eq("user_id", userId);

    if (error) throw error;
    return data || [];
  },

  // AI Integration
  async generateWithAI(prompt: string, context?: any) {
    const { data, error } = await supabase.functions.invoke('generate-app-component', {
      body: { prompt, context }
    });

    if (error) {
      throw new Error(`Failed to generate component: ${error.message}`);
    }

    return data;
  },

  // Database Integration
  async getDatabaseTables(userId: string) {
    const { data, error } = await supabase
      .from("databases")
      .select(`
        id,
        name,
        table_projects (
          id,
          name,
          schema,
          records
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return data || [];
  },

  async getTableData(tableProjectId: string, limit = 100, offset = 0) {
    const { data: tableProject, error } = await supabase
      .from("table_projects")
      .select("records")
      .eq("id", tableProjectId)
      .single();

    if (error) throw error;
    
    const records = Array.isArray(tableProject?.records) ? tableProject.records : [];
    return {
      data: records.slice(offset, offset + limit),
      total: records.length
    };
  }
};