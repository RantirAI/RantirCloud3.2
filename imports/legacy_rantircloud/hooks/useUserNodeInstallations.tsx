import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { integrationsService, NodeIntegration } from '@/services/integrationsService';
import { nodeRegistry } from '@/lib/node-registry';

interface UseUserNodeInstallationsReturn {
  installedNodeTypes: string[];
  availableNodeIntegrations: NodeIntegration[];
  userNodeIntegrations: NodeIntegration[];
  isLoading: boolean;
  error: string | null;
  installNode: (nodeId: string, config?: any) => Promise<void>;
  uninstallNode: (nodeId: string) => Promise<void>;
  refreshInstallations: () => Promise<void>;
}

export function useUserNodeInstallations(): UseUserNodeInstallationsReturn {
  const { user } = useAuth();
  const [installedNodeTypes, setInstalledNodeTypes] = useState<string[]>([]);
  const [availableNodeIntegrations, setAvailableNodeIntegrations] = useState<NodeIntegration[]>([]);
  const [userNodeIntegrations, setUserNodeIntegrations] = useState<NodeIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallations = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all available node integrations
      const available = await integrationsService.getAvailableNodeIntegrations();
      setAvailableNodeIntegrations(available);

      // Fetch user's installed node integrations
      const userInstalled = await integrationsService.getUserNodeIntegrations(user.id);
      setUserNodeIntegrations(userInstalled);

      // Get list of installed node types
      const installedTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
      console.log("useUserNodeInstallations: Fetched installed types from DB:", installedTypes);
      setInstalledNodeTypes(installedTypes);

      // Cache installed node types in window for use by node registry
      if (typeof window !== 'undefined') {
        window.flowUserNodeInstallations = {
          installedNodeTypes: installedTypes,
          userNodeIntegrations: userInstalled,
        };
      }

      // Immediately refresh node registry and notify listeners
      nodeRegistry.registerConditionally(installedTypes);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nodeRegistryUpdated', {
          detail: { plugins: nodeRegistry.getAllPlugins().map(p => p.type) }
        }));
      }
    } catch (err) {
      console.error('Error fetching node installations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch installations');
    } finally {
      setIsLoading(false);
    }
  };

  const installNode = async (nodeId: string, config: any = {}) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await integrationsService.installIntegration(user.id, nodeId, config);
      await fetchInstallations(); // Refresh after installation
      
      // Force immediate UI update by triggering a custom event and refresh workflow
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nodeInstallationChanged', { 
          detail: { action: 'install', nodeId } 
        }));
        window.dispatchEvent(new CustomEvent('flowRefreshRequested', {
          detail: { reason: 'node-install', nodeId }
        }));
      }
    } catch (err) {
      console.error('Error installing node:', err);
      throw err;
    }
  };

  const uninstallNode = async (nodeId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await integrationsService.uninstallIntegration(user.id, nodeId);
      await fetchInstallations(); // Refresh after uninstallation
      
      // Force immediate UI update by triggering a custom event and refresh workflow
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nodeInstallationChanged', { 
          detail: { action: 'uninstall', nodeId } 
        }));
        window.dispatchEvent(new CustomEvent('flowRefreshRequested', {
          detail: { reason: 'node-uninstall', nodeId }
        }));
      }
    } catch (err) {
      console.error('Error uninstalling node:', err);
      throw err;
    }
  };

  const refreshInstallations = async () => {
    await fetchInstallations();
  };

  useEffect(() => {
    fetchInstallations();
  }, [user]);

  return {
    installedNodeTypes,
    availableNodeIntegrations,
    userNodeIntegrations,
    isLoading,
    error,
    installNode,
    uninstallNode,
    refreshInstallations,
  };
}

// Extend window type for caching
declare global {
  interface Window {
    flowUserNodeInstallations?: {
      installedNodeTypes: string[];
      userNodeIntegrations: NodeIntegration[];
    };
  }
}