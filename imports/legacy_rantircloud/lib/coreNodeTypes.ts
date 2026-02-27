/**
 * Core/built-in nodes that don't require installation.
 * They're always available in the node palette by default.
 * 
 * This is the SINGLE SOURCE OF TRUTH for core node definitions.
 * Used by: node-registry, integrationsService, detectRequiredIntegrations, projectGenerationService
 */
export const CORE_NODE_TYPES = new Set([
  // Basic flow control
  'http-request',
  'api-request',
  'condition',
  'loop',
  'for-each-loop', // New branching loop node
  'delay',
  'wait',
  'code',
  'javascript',
  
  // Data processing
  'data-filter',
  'data-transformer',
  'json-parser',
  'text-processing',
  'calculator',
  'set-variable',
  
  // AI nodes (built-in)
  'ai-agent',
  'ai-mapper',
  'data-table',
  
  // Triggers
  'webhook',
  'webhook-trigger',
  'scheduler',
  
  // Flow utilities
  'split',
  'merge',
  'end',
  'response',
  'logger',
  
  // Email
  'resend',
]);

/**
 * Check if a node type is a core/built-in node
 * Core nodes don't require installation and are always available
 */
export function isCoreNode(nodeType: string): boolean {
  return CORE_NODE_TYPES.has(nodeType);
}
