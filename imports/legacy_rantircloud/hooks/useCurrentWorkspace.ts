import { useState, useEffect } from 'react';
import { workspaceService, type Workspace } from '@/services/workspaceService';

/**
 * Hook to get the current workspace context
 * Returns the current workspace and its ID for filtering queries
 */
export function useCurrentWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const ws = await workspaceService.getCurrentWorkspace();
        setWorkspace(ws);
      } catch (error) {
        console.error('Failed to load current workspace:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, []);

  return {
    workspace,
    workspaceId: workspace?.id || null,
    isLoading,
  };
}

/**
 * Get current workspace ID synchronously from cache or fetch
 * Useful for services that need workspace context
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  try {
    const workspace = await workspaceService.getCurrentWorkspace();
    return workspace?.id || null;
  } catch (error) {
    console.error('Failed to get current workspace ID:', error);
    return null;
  }
}
