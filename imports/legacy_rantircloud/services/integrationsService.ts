import { supabase } from "@/integrations/supabase/client";
import { BotpressIntegration } from "@/types/integration";
import { nodeRegistry } from "@/lib/node-registry";
import { isCoreNode } from "@/lib/coreNodeTypes";

export interface UserIntegration extends BotpressIntegration {
  userId: string;
  configuration?: Record<string, any>;
  apiKey?: string;
  authToken?: string;
  oauthData?: Record<string, any>;
}

// NodeIntegration type for node-specific integrations
export interface NodeIntegration extends BotpressIntegration {
  nodeType: string;
  requiresInstallation: boolean;
  installationConfig: Record<string, any>;
  isCompleted?: boolean;
}

export const integrationsService = {
  /**
   * Get all available integrations
   */
  async getAvailableIntegrations(): Promise<BotpressIntegration[]> {
    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("*")
      .is('node_type', null)
      .order('is_completed', { ascending: false })
      .order('name');
    
    if (error) {
      console.error("Error fetching integrations:", error);
      throw new Error(error.message);
    }
    
    return integrations.map((integration) => ({
      id: integration.integration_id,
      name: integration.name,
      description: integration.description || "",
      icon: integration.icon || "",
      category: integration.category,
      isInstalled: false,
      provider: integration.provider,
      version: integration.version,
      isCompleted: integration.is_completed,
    }));
  },
  
  /**
   * Get a user's installed integrations
   */
  async getUserIntegrations(userId: string): Promise<UserIntegration[]> {
    const { data, error } = await supabase
      .from("user_integrations")
      .select(`
        id,
        user_id,
        integration_id,
        configuration,
        is_enabled,
        created_at,
        updated_at,
        oauth_data,
        integrations(
          id,
          integration_id,
          name,
          description,
          icon,
          category,
          provider,
          version,
          node_type
        )
      `)
      .eq("user_id", userId)
      .is("integrations.node_type", null); // Exclude node integrations
    
    if (error) {
      console.error("Error fetching user integrations:", error);
      throw new Error(error.message);
    }
    
    return data?.map((item) => {
      if (!item.integrations) {
        console.warn('Missing integration data for user integration:', item);
        return null;
      }
      
      return {
        id: item.integrations.integration_id,
        name: item.integrations.name,
        description: item.integrations.description || "",
        icon: item.integrations.icon || "",
        category: item.integrations.category,
        isInstalled: true,
        provider: item.integrations.provider,
        version: item.integrations.version,
        userId: item.user_id,
        configuration: typeof item.configuration === 'object' ? item.configuration as Record<string, any> : {},
        oauthData: typeof item.oauth_data === 'object' ? item.oauth_data as Record<string, any> : undefined,
      };
    }).filter(Boolean) || [];
  },
  
  /**
   * Install an integration for a user
   */
  async installIntegration(
    userId: string,
    integrationId: string,
    config: {
      apiKey?: string;
      authToken?: string;
      oauthData?: Record<string, any>;
      configuration?: Record<string, any>;
    } = {}
  ): Promise<void> {
    console.log(`[IntegrationsService] Installing integration: ${integrationId} for user: ${userId}`);
    
    // PRIORITY 1: Try to find by node_type first (these are the correct, usable integration nodes)
    // This fixes issues with duplicate entries where legacy records have node_type: NULL
    let { data: integration, error: nodeError } = await supabase
      .from("integrations")
      .select("id, node_type")
      .eq("node_type", integrationId)
      .maybeSingle();
    
    // FALLBACK: If not found by node_type, try by integration_id
    if (!integration) {
      console.log(`[IntegrationsService] Not found by node_type, trying integration_id: ${integrationId}`);
      const { data: legacyIntegration, error: legacyError } = await supabase
        .from("integrations")
        .select("id, node_type")
        .eq("integration_id", integrationId)
        .maybeSingle();
      
      if (legacyIntegration) {
        integration = legacyIntegration;
        console.log(`[IntegrationsService] Found by integration_id: ${integrationId}`);
      } else {
        console.error("Error fetching integration:", nodeError || legacyError);
        throw new Error(`Integration not found: ${integrationId}`);
      }
    } else {
      console.log(`[IntegrationsService] Found by node_type: ${integrationId}`);
    }
    
    // Check if the integration is already installed
    const { data: existingInstallation } = await supabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("integration_id", integration.id)
      .single();
    
    if (existingInstallation) {
      // Integration already installed, just update the configuration
      const { error: updateError } = await supabase
        .from("user_integrations")
        .update({
          api_key: config.apiKey,
          auth_token: config.authToken,
          oauth_data: config.oauthData,
          configuration: config.configuration || {},
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("integration_id", integration.id);
        
      if (updateError) {
        console.error("Error updating integration:", updateError);
        throw new Error(`Failed to update integration: ${updateError.message}`);
      }
    } else {
      // Install new integration
      const { error } = await supabase
        .from("user_integrations")
        .insert({
          user_id: userId,
          integration_id: integration.id,
          api_key: config.apiKey,
          auth_token: config.authToken,
          oauth_data: config.oauthData,
          configuration: config.configuration || {},
        });
        
      if (error) {
        console.error("Error installing integration:", error);
        throw new Error(`Failed to install integration: ${error.message}`);
      }
    }
  },
  
  /**
   * Uninstall an integration for a user
   */
  async uninstallIntegration(userId: string, integrationId: string): Promise<void> {
    // PRIORITY 1: Try to find by node_type first (fixes duplicate entry issues)
    let { data: integration } = await supabase
      .from("integrations")
      .select("id")
      .eq("node_type", integrationId)
      .maybeSingle();
    
    // FALLBACK: If not found by node_type, try by integration_id
    if (!integration) {
      const { data: legacyIntegration } = await supabase
        .from("integrations")
        .select("id")
        .eq("integration_id", integrationId)
        .maybeSingle();
      
      if (legacyIntegration) {
        integration = legacyIntegration;
      } else {
        throw new Error(`Integration not found: ${integrationId}`);
      }
    }
    
    const { error } = await supabase
      .from("user_integrations")
      .delete()
      .eq("user_id", userId)
      .eq("integration_id", integration.id);
      
    if (error) {
      console.error("Error uninstalling integration:", error);
      throw new Error(`Failed to uninstall integration: ${error.message}`);
    }
  },
  
  /**
   * Update an integration's configuration
   */
  async updateIntegrationConfig(
    userId: string, 
    integrationId: string, 
    config: {
      apiKey?: string;
      authToken?: string;
      oauthData?: Record<string, any>;
      configuration?: Record<string, any>;
    }
  ): Promise<void> {
    // PRIORITY 1: Try to find by node_type first (fixes duplicate entry issues)
    let { data: integration } = await supabase
      .from("integrations")
      .select("id")
      .eq("node_type", integrationId)
      .maybeSingle();
    
    // FALLBACK: If not found by node_type, try by integration_id
    if (!integration) {
      const { data: legacyIntegration } = await supabase
        .from("integrations")
        .select("id")
        .eq("integration_id", integrationId)
        .maybeSingle();
      
      if (legacyIntegration) {
        integration = legacyIntegration;
      } else {
        throw new Error(`Integration not found: ${integrationId}`);
      }
    }
    
    const updateData: any = {};
    
    if (config.apiKey !== undefined) updateData.api_key = config.apiKey;
    if (config.authToken !== undefined) updateData.auth_token = config.authToken;
    if (config.oauthData !== undefined) updateData.oauth_data = config.oauthData;
    if (config.configuration !== undefined) updateData.configuration = config.configuration;
    
    const { error } = await supabase
      .from("user_integrations")
      .update(updateData)
      .eq("user_id", userId)
      .eq("integration_id", integration.id);
      
    if (error) {
      console.error("Error updating integration configuration:", error);
      throw new Error(`Failed to update integration: ${error.message}`);
    }
  },

  /**
   * Get all available node integrations
   */
  async getAvailableNodeIntegrations(): Promise<NodeIntegration[]> {
    try {
      // First, get node integrations from database
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .not('node_type', 'is', null)
        // Show all node integrations regardless of is_enabled to ensure visibility
        .order('is_completed', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching node integrations:', error);
        throw error;
      }

      const dbNodeIntegrations = integrations?.map(integration => ({
        id: integration.integration_id,
        name: integration.name,
        description: integration.description || '',
        icon: integration.icon || '',
        category: integration.category,
        isInstalled: false, // Will be determined by user installations
        provider: integration.provider,
        version: integration.version,
        nodeType: integration.node_type,
        requiresInstallation: integration.requires_installation,
        installationConfig: (integration.installation_config as Record<string, any>) || {},
        isCompleted: integration.is_completed,
      })) || [];

      // Then, get nodes from registry that might not be in database
      let registryNodes: NodeIntegration[] = [];
      
      // Get nodes from the imported nodeRegistry
      const allNodes = nodeRegistry.getAllPlugins();
      console.debug(`[NodeIntegrations] Found ${allNodes.length} registered nodes:`, allNodes.map(n => n.name));
      
      // Filter out core nodes - they shouldn't appear in the integrations panel
      // Core nodes are always available by default in the node palette
      registryNodes = allNodes
        .filter(node => !dbNodeIntegrations.some(db => db.nodeType === node.type))
        .filter(node => !isCoreNode(node.type)) // Don't show core nodes as integrations
        .map(node => ({
          id: `node-${node.type}`,
          name: node.name,
          description: node.description,
          icon: '/placeholder.svg', // Use placeholder for now
          category: node.category || 'Automation',
          isInstalled: false, // Non-core nodes need to be installed
          provider: 'Rantir',
          version: '1.0.0',
          nodeType: node.type,
          requiresInstallation: true, // All non-core nodes require installation
          installationConfig: {},
          isCompleted: true,
        }));

      console.debug(`[NodeIntegrations] Added ${registryNodes.length} registry nodes:`, registryNodes.map(n => n.name));
      return [...dbNodeIntegrations, ...registryNodes];
    } catch (error) {
      console.error('Error in getAvailableNodeIntegrations:', error);
      throw error;
    }
  },

  /**
   * Get user's installed node integrations  
   * Excludes core nodes that don't require installation
   */
  async getUserNodeIntegrations(userId: string): Promise<NodeIntegration[]> {
    try {
      const { data: userIntegrations, error } = await supabase
        .from('user_integrations')
        .select(`
          *,
          integrations(*)
        `)
        .eq('user_id', userId)
        .not('integrations.node_type', 'is', null);

      if (error) {
        console.error('Error fetching user node integrations:', error);
        throw error;
      }

      return userIntegrations?.map(userIntegration => {
        if (!userIntegration.integrations) {
          console.warn('Missing integration data for user integration:', userIntegration);
          return null;
        }
        
        const nodeType = userIntegration.integrations.node_type;
        
        return {
          id: userIntegration.integrations.integration_id,
          name: userIntegration.integrations.name,
          description: userIntegration.integrations.description || '',
          icon: userIntegration.integrations.icon || '',
          category: userIntegration.integrations.category,
          isInstalled: true,
          provider: userIntegration.integrations.provider,
          version: userIntegration.integrations.version,
          nodeType: nodeType,
          requiresInstallation: userIntegration.integrations.requires_installation,
          installationConfig: (userIntegration.integrations.installation_config as Record<string, any>) || {},
          isCompleted: userIntegration.integrations.is_completed,
        };
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getUserNodeIntegrations:', error);
      throw error;
    }
  },

  /**
   * Check if user has specific nodes installed
   */
  async getUserInstalledNodeTypes(userId: string): Promise<string[]> {
    try {
      const { data: userIntegrations, error } = await supabase
        .from('user_integrations')
        .select(`
          integrations(node_type)
        `)
        .eq('user_id', userId)
        .not('integrations.node_type', 'is', null);

      if (error) {
        console.error('Error fetching user installed node types:', error);
        throw error;
      }

      return userIntegrations?.map(ui => ui.integrations?.node_type).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getUserInstalledNodeTypes:', error);
      throw error;
    }
  },

  /**
   * Batch install multiple node integrations
   * First validates which node types exist in DB, then installs them
   */
  async batchInstallIntegrations(
    userId: string,
    nodeTypes: string[]
  ): Promise<{ installed: string[]; failed: string[]; notFound: string[] }> {
    console.log('[IntegrationsService] Batch installing:', nodeTypes);
    
    // First, filter to only node types that exist in the database
    const validTypes = await this.getInstallableNodeTypes(nodeTypes);
    console.log('[IntegrationsService] Valid node types to install:', validTypes);
    
    const installed: string[] = [];
    const failed: string[] = [];
    const notFound = nodeTypes.filter(t => !validTypes.includes(t));
    
    if (notFound.length > 0) {
      console.log('[IntegrationsService] Node types not found in DB (skipped):', notFound);
    }

    for (const nodeType of validTypes) {
      try {
        console.log(`[IntegrationsService] Installing ${nodeType}...`);
        await this.installIntegration(userId, nodeType, {});
        console.log(`[IntegrationsService] Successfully installed ${nodeType}`);
        installed.push(nodeType);
      } catch (error) {
        console.error(`[IntegrationsService] Failed to install ${nodeType}:`, error);
        failed.push(nodeType);
      }
    }

    console.log('[IntegrationsService] Batch install complete:', { installed, failed, notFound });
    return { installed, failed, notFound };
  },

  /**
   * Check which node types exist in the database and can be installed
   * Returns installable node types from the provided list
   */
  async getInstallableNodeTypes(nodeTypes: string[]): Promise<string[]> {
    if (!nodeTypes.length) return [];
    
    try {
      // Query the database for integrations matching these node types
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('node_type, requires_installation')
        .in('node_type', nodeTypes)
        .eq('requires_installation', true);
      
      if (error) {
        console.error('[IntegrationsService] Error checking installable node types:', error);
        return [];
      }
      
      return integrations?.map(i => i.node_type).filter(Boolean) || [];
    } catch (error) {
      console.error('[IntegrationsService] Error in getInstallableNodeTypes:', error);
      return [];
    }
  },

  /**
   * Check if a node type exists in the integrations database
   */
  async nodeTypeExistsInDatabase(nodeType: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('id')
        .eq('node_type', nodeType)
        .maybeSingle();
      
      return !!data && !error;
    } catch (error) {
      console.error('[IntegrationsService] Error checking node type existence:', error);
      return false;
    }
  }
};
