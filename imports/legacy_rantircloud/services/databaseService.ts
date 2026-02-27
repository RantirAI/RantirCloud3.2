
import { supabase } from "@/integrations/supabase/client";
import { activityService } from "./activityService";

export interface DatabaseProject {
  id: string;
  name: string;
  description: string | null;
  color?: string;
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const databaseService = {
  /**
   * Get databases for a user, optionally filtered by workspace
   * When workspaceId is provided, returns ALL workspace databases (for shared access)
   * When no workspaceId, returns only user's own databases
   */
  async getUserDatabases(userId: string, workspaceId?: string | null) {
    let query = supabase
      .from("databases")
      .select("*");

    if (workspaceId) {
      // Workspace context: show ALL databases in this workspace (for team members)
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Personal context: show only user's own databases
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getDatabase(id: string): Promise<DatabaseProject> {
    const { data, error } = await supabase
      .from("databases")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error("Database not found");
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      workspace_id: data.workspace_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  async createDatabase(database: {
    name: string;
    description?: string;
    color?: string;
    user_id: string;
    workspace_id?: string;
  }): Promise<DatabaseProject> {
    const { data, error } = await supabase.from("databases").insert({
      name: database.name,
      description: database.description,
      color: database.color || '#3B82F6',
      user_id: database.user_id,
      workspace_id: database.workspace_id
    }).select().maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error("Failed to create database");
    }

    // Log the activity
    try {
      await activityService.logActivity({
        type: 'database_created',
        description: `Created database: ${data.name}`,
        resourceType: 'database',
        resourceId: data.id,
        resourceName: data.name
      });
    } catch (error) {
      console.error('Failed to log database creation activity:', error);
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  async updateDatabase(id: string, updates: {
    name?: string;
    description?: string;
    color?: string;
  }): Promise<DatabaseProject> {
    const { data, error } = await supabase
      .from("databases")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error("Database not found");
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  async deleteDatabase(id: string) {
    const { error } = await supabase
      .from("databases")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return true;
  }
};
