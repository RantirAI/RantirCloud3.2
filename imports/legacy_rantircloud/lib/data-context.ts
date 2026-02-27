
// Data context system for tracking live data throughout the flow
export interface DataSample {
  value: any;
  type: string;
  description?: string;
  sampleCount?: number;
}

export interface NodeDataContext {
  nodeId: string;
  nodeName: string;
  outputs: Record<string, DataSample>;
  timestamp: number;
}

export interface FlowDataContext {
  nodes: Map<string, NodeDataContext>;
  lastUpdated: number;
}

class DataContextManager {
  private context: FlowDataContext = {
    nodes: new Map(),
    lastUpdated: Date.now()
  };

  // Store data from a node execution
  storeNodeData(nodeId: string, nodeName: string, outputs: Record<string, any>) {
    const processedOutputs: Record<string, DataSample> = {};
    
    Object.entries(outputs).forEach(([key, value]) => {
      processedOutputs[key] = {
        value: this.createSampleValue(value),
        type: this.determineType(value),
        description: this.generateDescription(key, value),
        sampleCount: Array.isArray(value) ? value.length : undefined
      };
    });

    this.context.nodes.set(nodeId, {
      nodeId,
      nodeName,
      outputs: processedOutputs,
      timestamp: Date.now()
    });

    this.context.lastUpdated = Date.now();
    
    // Emit event for components to update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dataContextUpdated', { 
        detail: { nodeId, outputs: processedOutputs } 
      }));
    }
  }

  // Get data for a specific node
  getNodeData(nodeId: string): NodeDataContext | undefined {
    return this.context.nodes.get(nodeId);
  }

  // Get all available data in the flow
  getAllAvailableData(): Map<string, NodeDataContext> {
    return this.context.nodes;
  }

  // Get data structure for loop configuration with enhanced samples
  getArrayFieldsFromNode(nodeId: string): Array<{name: string, sample: any[], description: string}> {
    const nodeData = this.getNodeData(nodeId);
    if (!nodeData) return [];

    const arrayFields: Array<{name: string, sample: any[], description: string}> = [];
    
    Object.entries(nodeData.outputs).forEach(([key, dataSample]) => {
      if (dataSample.type === 'array' && Array.isArray(dataSample.value)) {
        arrayFields.push({
          name: key,
          sample: dataSample.value.slice(0, 5), // First 5 items as sample (increased from 3)
          description: dataSample.description || `Array with ${dataSample.sampleCount} items`
        });
      }
    });

    return arrayFields;
  }

  // Generate variable suggestions with live data
  generateVariableSuggestions(connectedNodeIds: string[]): Array<{
    label: string;
    value: string;
    description?: string;
    sample?: any;
    type?: string;
  }> {
    const suggestions: Array<{
      label: string;
      value: string;
      description?: string;
      sample?: any;
      type?: string;
    }> = [];

    connectedNodeIds.forEach(nodeId => {
      const nodeData = this.getNodeData(nodeId);
      if (!nodeData) return;

      Object.entries(nodeData.outputs).forEach(([outputKey, dataSample]) => {
        suggestions.push({
          label: `${nodeData.nodeName} > ${outputKey}`,
          value: `{{${nodeId}.${outputKey}}}`,
          description: dataSample.description,
          sample: dataSample.value,
          type: dataSample.type
        });
      });
    });

    return suggestions;
  }

  private createSampleValue(value: any): any {
    if (Array.isArray(value)) {
      // For arrays, keep first 5 items as samples (increased from 3)
      return value.slice(0, 5);
    } else if (typeof value === 'object' && value !== null) {
      // For objects, create a sample with limited depth
      return this.limitObjectDepth(value, 3); // Increased depth from 2 to 3
    }
    return value;
  }

  private limitObjectDepth(obj: any, maxDepth: number): any {
    if (maxDepth <= 0 || typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const limited: any = {};
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (count >= 15) break; // Increased from 10 to 15 properties
      limited[key] = this.limitObjectDepth(value, maxDepth - 1);
      count++;
    }
    return limited;
  }

  private determineType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  private generateDescription(key: string, value: any): string {
    if (Array.isArray(value)) {
      return `Array with ${value.length} items`;
    } else if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      return `Object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
    }
    return `${typeof value} value`;
  }

  // Clear data for a node
  clearNodeData(nodeId: string) {
    this.context.nodes.delete(nodeId);
    this.context.lastUpdated = Date.now();
  }

  // Clear all data
  clearAll() {
    this.context.nodes.clear();
    this.context.lastUpdated = Date.now();
  }

  // Get live data for specific fields with path support
  getFieldData(nodeId: string, fieldPath: string): any {
    const nodeData = this.getNodeData(nodeId);
    if (!nodeData) return undefined;

    const pathParts = fieldPath.split('.');
    let data: any = nodeData.outputs;
    
    for (const part of pathParts) {
      if (data && typeof data === 'object' && part in data) {
        // If we're accessing a DataSample, get its value
        if (data[part] && typeof data[part] === 'object' && 'value' in data[part]) {
          data = data[part].value;
        } else {
          data = data[part];
        }
      } else {
        return undefined;
      }
    }
    
    return data;
  }

  // Check if node has array data suitable for looping
  hasLoopableData(nodeId: string): boolean {
    return this.getArrayFieldsFromNode(nodeId).length > 0;
  }
}

export const dataContextManager = new DataContextManager();

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).dataContextManager = dataContextManager;
}
