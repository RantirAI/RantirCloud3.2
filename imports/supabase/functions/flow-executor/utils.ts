// Safe JSON stringify that handles circular references
export function safeStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}

// Deep clone to break circular references when storing outputs
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  
  const cloned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    try {
      cloned[key] = deepClone(obj[key]);
    } catch {
      cloned[key] = '[Uncloneable]';
    }
  }
  return cloned;
}

// Variable resolver: handles {{nodeId.outputField}} syntax
export function resolveVariables(value: any, context: Record<string, any>): any {
  if (typeof value !== "string") return value;
  
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split(".");
    let result: any = context;
    
    for (const part of parts) {
      if (result && typeof result === "object") {
        // Try exact match first, then case-insensitive match
        if (part in result) {
          result = result[part];
        } else {
          const lowerPart = part.toLowerCase();
          const matchedKey = Object.keys(result).find(k => k.toLowerCase() === lowerPart);
          if (matchedKey) {
            result = result[matchedKey];
          } else {
            return ""; // Return empty string for unresolved variables
          }
        }
      } else {
        return ""; // Return empty string for unresolved variables
      }
    }
    
    return typeof result === "object" ? JSON.stringify(result) : String(result);
  });
}

// Resolve all input values for a node
export function resolveNodeInputs(inputs: Record<string, any>, context: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(inputs || {})) {
    if (typeof value === "string") {
      resolved[key] = resolveVariables(value, context);
    } else if (typeof value === "object" && value !== null) {
      resolved[key] = JSON.parse(resolveVariables(JSON.stringify(value), context));
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

// Execute transformation code safely
export function executeTransformCode(code: string, data: { body: any; headers: any; query: any; method: string }): any {
  try {
    const fn = new Function("body", "headers", "query", "method", code);
    return fn(data.body, data.headers, data.query, data.method);
  } catch (err: any) {
    console.error("Transform code error:", err);
    return { error: err.message };
  }
}

// Build execution order from nodes and edges (topological sort)
export function buildExecutionOrder(nodes: any[], edges: any[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  
  // Build graph
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }
  
  // Find start nodes (no incoming edges)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }
  
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    
    for (const neighbor of adjacency.get(current) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return order;
}

// Get next nodes to execute based on edges and condition results
export function getNextNodes(
  currentNodeId: string, 
  edges: any[], 
  conditionResult?: boolean
): string[] {
  return edges
    .filter(edge => {
      if (edge.source !== currentNodeId) return false;
      
      // For condition nodes, filter by handle
      if (conditionResult !== undefined) {
        if (conditionResult && edge.sourceHandle === "true") return true;
        if (!conditionResult && edge.sourceHandle === "false") return true;
        return false;
      }
      
      return true;
    })
    .map(edge => edge.target);
}
