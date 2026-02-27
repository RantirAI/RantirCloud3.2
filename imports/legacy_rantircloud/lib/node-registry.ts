import { NodePlugin } from '@/types/node-plugin';
import { isCoreNode } from './coreNodeTypes';

class NodeRegistry {
  private plugins: Map<string, NodePlugin> = new Map();
  private allPlugins: Map<string, NodePlugin> = new Map();

  register(plugin: NodePlugin) {
    this.allPlugins.set(plugin.type, plugin);
    this.plugins.set(plugin.type, plugin);
    // Notify listeners that registry changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nodeRegistryUpdated', {
        detail: { plugins: Array.from(this.plugins.keys()) }
      }));
    }
  }

  // Register nodes conditionally based on user installations
  registerConditionally(installedNodeTypes: string[] = []) {
    console.log("NodeRegistry: registerConditionally called with:", installedNodeTypes);
    this.plugins.clear();
    
    for (const [type, plugin] of this.allPlugins) {
      // Include nodes that don't require installation or are installed by user
      const shouldInclude = !this.requiresInstallation(type) || installedNodeTypes.includes(type);
      console.log(`NodeRegistry: ${type} - requires installation: ${this.requiresInstallation(type)}, is installed: ${installedNodeTypes.includes(type)}, should include: ${shouldInclude}`);
      
      if (shouldInclude) {
        this.plugins.set(type, plugin);
      }
    }
    console.log("NodeRegistry: Final registered plugins:", Array.from(this.plugins.keys()));
    // Notify listeners that registry changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nodeRegistryUpdated', {
        detail: { plugins: Array.from(this.plugins.keys()) }
      }));
    }
  }

  // Check if a node type requires installation
  requiresInstallation(nodeType: string): boolean {
    // Core nodes never require installation - they're built-in
    if (isCoreNode(nodeType)) {
      return false;
    }
    // All other registered nodes require installation
    return true;
  }

  // Get available plugins based on current user context
  getAvailablePlugins(installedNodeTypes?: string[]): NodePlugin[] {
    if (installedNodeTypes) {
      // Filter based on provided installation context
      return Array.from(this.allPlugins.values()).filter(plugin => 
        !this.requiresInstallation(plugin.type) || installedNodeTypes.includes(plugin.type)
      );
    }
    
    // Use current registered plugins
    return Array.from(this.plugins.values());
  }

  getPlugin(type: string): NodePlugin | undefined {
    // First check active plugins, then fall back to all plugins
    // This ensures existing nodes on canvas can render their icons
    // even if the plugin was filtered out after registerConditionally
    return this.plugins.get(type) || this.allPlugins.get(type);
  }

  getAllPlugins(): NodePlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: NodePlugin['category']): NodePlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.category === category);
  }

  // Get all plugins including those not installed
  getAllAvailablePlugins(): NodePlugin[] {
    return Array.from(this.allPlugins.values());
  }

  // Get all available node types with their info for AI prompts
  getAllNodeTypesForAI(): Array<{ type: string; name: string; description: string; category: string; requiresInstallation: boolean }> {
    const allPlugins = Array.from(this.allPlugins.values());
    return allPlugins.map(plugin => ({
      type: plugin.type,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      requiresInstallation: this.requiresInstallation(plugin.type),
    }));
  }

  // Check if a node type exists in the registry (installed or not)
  hasNodeType(type: string): boolean {
    return this.allPlugins.has(type);
  }
}

export const nodeRegistry = new NodeRegistry();
