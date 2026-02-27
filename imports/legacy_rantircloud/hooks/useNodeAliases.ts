/**
 * React hook for node alias utilities.
 * Bridges the NodeAliasRegistry with React components.
 */

import { useEffect, useMemo } from 'react';
import { useFlowStore } from '@/lib/flow-store';
import { NodeAliasRegistry } from '@/lib/node-alias-registry';

export function useNodeAliases() {
  const { nodes } = useFlowStore();
  
  // Create a stable registry instance that rebuilds when nodes change
  const registry = useMemo(() => new NodeAliasRegistry(), []);

  // Rebuild mappings when nodes change
  useEffect(() => {
    registry.rebuildFromNodes(nodes);
  }, [nodes, registry]);

  return {
    /**
     * Convert storage format to display format.
     * e.g., "{{node-123.body}}" → "Webhook Handler.body"
     */
    toDisplayPath: (variableBinding: string): string => {
      // Handle full variable binding format {{...}}
      const match = variableBinding.match(/^\{\{(.+)\}\}$/);
      if (match) {
        const innerPath = match[1];
        
        // Don't translate env variables or flow variables
        if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
          return innerPath;
        }
        
        // Handle loop variables specially
        if (innerPath.includes('._loop.')) {
          const [nodeId, ...rest] = innerPath.split('.');
          const alias = registry.getDisplayAlias(nodeId);
          return [alias, ...rest].join('.');
        }
        
        return registry.nodeIdToAliasPath(innerPath);
      }
      
      // Handle raw path without brackets
      if (variableBinding.includes('.')) {
        const firstPart = variableBinding.split('.')[0];
        if (registry.isNodeIdFormat(firstPart)) {
          return registry.nodeIdToAliasPath(variableBinding);
        }
      }
      
      return variableBinding;
    },

    /**
     * Convert display format to storage format.
     * e.g., "Webhook Handler.body" → "{{node-123.body}}"
     */
    toStoragePath: (aliasPath: string): string => {
      const nodeIdPath = registry.aliasToNodeIdPath(aliasPath);
      return nodeIdPath ? `{{${nodeIdPath}}}` : `{{${aliasPath}}}`;
    },

    /**
     * Get display name for a node ID.
     */
    getNodeAlias: (nodeId: string): string => {
      return registry.getDisplayAlias(nodeId);
    },

    /**
     * Check if a path uses node ID format vs alias format.
     */
    isNodeIdFormat: (path: string): boolean => {
      if (!path) return false;
      const firstPart = path.split('.')[0];
      return registry.isNodeIdFormat(firstPart);
    },

    /**
     * Format a variable for display with node label.
     * e.g., "node-123.body" → "Webhook Handler > body"
     */
    formatForDisplay: (variablePath: string, separator: string = ' > '): string => {
      // Handle bracketed variables
      const cleanPath = variablePath.replace(/^\{\{|\}\}$/g, '');
      
      // Don't format env or simple flow variables
      if (cleanPath.startsWith('env.') || !cleanPath.includes('.')) {
        return cleanPath.replace('env.', 'ENV: ');
      }
      
      const aliasPath = registry.nodeIdToAliasPath(cleanPath);
      const parts = aliasPath.split('.');
      
      // Return formatted: "Node Label > field.path"
      if (parts.length > 1) {
        return `${parts[0]}${separator}${parts.slice(1).join('.')}`;
      }
      
      return aliasPath;
    },

    /**
     * Get the registry for direct access if needed.
     */
    registry
  };
}
