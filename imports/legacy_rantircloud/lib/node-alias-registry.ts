/**
 * Node Alias Registry
 * 
 * Provides bidirectional mapping between node IDs and human-readable aliases.
 * This allows users to see "Webhook Handler.body" instead of "node-123.body"
 * while internally still using node IDs for reliable execution.
 */

import { FlowNode } from '@/types/flowTypes';

interface AliasMapping {
  aliasToNodeId: Map<string, string>;
  nodeIdToAlias: Map<string, string>;
}

export class NodeAliasRegistry {
  private mappings: AliasMapping = {
    aliasToNodeId: new Map(),
    nodeIdToAlias: new Map()
  };

  /**
   * Rebuild mappings from current flow nodes.
   * Handles duplicate labels by auto-numbering (e.g., "API Request 2")
   */
  rebuildFromNodes(nodes: FlowNode[]) {
    this.mappings.aliasToNodeId.clear();
    this.mappings.nodeIdToAlias.clear();

    // Track duplicate labels for auto-numbering
    const labelCounts = new Map<string, number>();
    
    // Sort nodes by ID to ensure consistent numbering across rebuilds
    const sortedNodes = [...nodes].sort((a, b) => 
      a.id.localeCompare(b.id)
    );

    for (const node of sortedNodes) {
      const baseLabel = node.data?.label || 'Node';
      const count = labelCounts.get(baseLabel) || 0;
      labelCounts.set(baseLabel, count + 1);

      // Use numbered suffix for duplicates (e.g., "API Request 2")
      const alias = count === 0 ? baseLabel : `${baseLabel} ${count + 1}`;
      
      this.mappings.aliasToNodeId.set(alias, node.id);
      this.mappings.nodeIdToAlias.set(node.id, alias);
    }
  }

  /**
   * Convert alias path to node ID path.
   * e.g., "Webhook Handler.body" → "node-123.body"
   */
  aliasToNodeIdPath(aliasPath: string): string | null {
    // Handle bracket notation for array access
    const parts = this.splitPath(aliasPath);
    if (parts.length === 0) return null;
    
    const alias = parts[0];
    const nodeId = this.mappings.aliasToNodeId.get(alias);
    if (!nodeId) return null;
    
    return [nodeId, ...parts.slice(1)].join('.');
  }

  /**
   * Convert node ID path to alias path.
   * e.g., "node-123.body" → "Webhook Handler.body"
   */
  nodeIdToAliasPath(nodeIdPath: string): string {
    const parts = this.splitPath(nodeIdPath);
    if (parts.length === 0) return nodeIdPath;
    
    const nodeId = parts[0];
    const alias = this.mappings.nodeIdToAlias.get(nodeId) || nodeId;
    
    return [alias, ...parts.slice(1)].join('.');
  }

  /**
   * Get display alias for a node ID.
   */
  getDisplayAlias(nodeId: string): string {
    return this.mappings.nodeIdToAlias.get(nodeId) || nodeId;
  }

  /**
   * Get node ID for an alias.
   */
  getNodeId(alias: string): string | null {
    return this.mappings.aliasToNodeId.get(alias) || null;
  }

  /**
   * Check if a string looks like a node ID (e.g., starts with "node-" followed by digits)
   */
  isNodeIdFormat(value: string): boolean {
    return /^node-\d+/.test(value) || /^[a-f0-9-]{36}$/.test(value);
  }

  /**
   * Split a path while preserving bracket notation.
   * e.g., "node.body[0].name" → ["node", "body[0]", "name"]
   */
  private splitPath(path: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inBracket = false;
    
    for (const char of path) {
      if (char === '[') {
        inBracket = true;
        current += char;
      } else if (char === ']') {
        inBracket = false;
        current += char;
      } else if (char === '.' && !inBracket) {
        if (current) parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) parts.push(current);
    return parts;
  }
}

// Singleton instance for global use
export const nodeAliasRegistry = new NodeAliasRegistry();
