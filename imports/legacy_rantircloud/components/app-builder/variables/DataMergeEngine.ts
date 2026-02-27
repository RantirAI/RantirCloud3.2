interface TableData {
  id: string;
  name: string;
  schema: {
    fields: Array<{
      name: string;
      type: string;
    }>;
  };
  records?: any[];
  source?: 'table_project' | 'database';
}

interface JoinConfig {
  type: 'inner' | 'left' | 'right' | 'full';
  leftField: string;
  rightField: string;
  alias?: string;
}

interface ConnectionInfo {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceField: string;
  targetField: string;
  joinConfig: JoinConfig;
}

export class DataMergeEngine {
  private tables: Map<string, TableData> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();

  /**
   * Add a table to the merge context
   */
  addTable(nodeId: string, table: TableData) {
    this.tables.set(nodeId, table);
  }

  /**
   * Add a connection between tables
   */
  addConnection(connectionId: string, connection: ConnectionInfo) {
    this.connections.set(connectionId, connection);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
  }

  /**
   * Get all connected table nodes as a graph
   */
  private buildTableGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    // Initialize all table nodes
    for (const tableId of this.tables.keys()) {
      graph.set(tableId, new Set());
    }
    
    // Add connections
    for (const connection of this.connections.values()) {
      const sourceConnections = graph.get(connection.sourceTableId) || new Set();
      const targetConnections = graph.get(connection.targetTableId) || new Set();
      
      sourceConnections.add(connection.targetTableId);
      targetConnections.add(connection.sourceTableId);
      
      graph.set(connection.sourceTableId, sourceConnections);
      graph.set(connection.targetTableId, targetConnections);
    }
    
    return graph;
  }

  /**
   * Find connected components (groups of connected tables)
   */
  private findConnectedComponents(): string[][] {
    const graph = this.buildTableGraph();
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const nodeId of this.tables.keys()) {
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        this.dfsVisit(nodeId, graph, visited, component);
        components.push(component);
      }
    }

    return components;
  }

  private dfsVisit(
    nodeId: string, 
    graph: Map<string, Set<string>>, 
    visited: Set<string>, 
    component: string[]
  ) {
    visited.add(nodeId);
    component.push(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsVisit(neighbor, graph, visited, component);
      }
    }
  }

  /**
   * Generate SQL for merging tables
   */
  generateMergeSQL(startTableId: string): string {
    const visited = new Set<string>();
    const joinClauses: string[] = [];
    const selectFields: string[] = [];
    
    const startTable = this.tables.get(startTableId);
    if (!startTable) {
      throw new Error(`Table ${startTableId} not found`);
    }

    // Start with the base table
    let sql = `SELECT `;
    
    // Add fields from start table
    startTable.schema.fields.forEach(field => {
      selectFields.push(`${startTable.name}.${field.name} AS "${startTable.name}_${field.name}"`);
    });
    
    // Build joins recursively
    this.buildJoinSQL(startTableId, visited, joinClauses, selectFields);
    
    sql += selectFields.join(',\n       ');
    sql += `\nFROM ${startTable.name}`;
    
    if (joinClauses.length > 0) {
      sql += '\n' + joinClauses.join('\n');
    }
    
    return sql;
  }

  private buildJoinSQL(
    tableId: string, 
    visited: Set<string>, 
    joinClauses: string[], 
    selectFields: string[]
  ) {
    visited.add(tableId);
    
    const currentTable = this.tables.get(tableId);
    if (!currentTable) return;

    // Find all connections from this table
    for (const connection of this.connections.values()) {
      let targetTableId: string | null = null;
      let isSource = false;

      if (connection.sourceTableId === tableId && !visited.has(connection.targetTableId)) {
        targetTableId = connection.targetTableId;
        isSource = true;
      } else if (connection.targetTableId === tableId && !visited.has(connection.sourceTableId)) {
        targetTableId = connection.sourceTableId;
        isSource = false;
      }

      if (targetTableId) {
        const targetTable = this.tables.get(targetTableId);
        if (!targetTable) continue;

        // Add fields from target table to select
        targetTable.schema.fields.forEach(field => {
          selectFields.push(`${targetTable.name}.${field.name} AS "${targetTable.name}_${field.name}"`);
        });

        // Determine join type and fields
        const joinType = this.getJoinTypeSQL(connection.joinConfig.type);
        const leftTable = isSource ? currentTable.name : targetTable.name;
        const rightTable = isSource ? targetTable.name : currentTable.name;
        const leftField = isSource ? connection.sourceField : connection.targetField;
        const rightField = isSource ? connection.targetField : connection.sourceField;

        // Add join clause
        joinClauses.push(
          `${joinType} ${rightTable} ON ${leftTable}.${leftField} = ${rightTable}.${rightField}`
        );

        // Recursively process connected table
        this.buildJoinSQL(targetTableId, visited, joinClauses, selectFields);
      }
    }
  }

  private getJoinTypeSQL(joinType: string): string {
    switch (joinType) {
      case 'inner': return 'INNER JOIN';
      case 'left': return 'LEFT JOIN';
      case 'right': return 'RIGHT JOIN';
      case 'full': return 'FULL OUTER JOIN';
      default: return 'INNER JOIN';
    }
  }

  /**
   * Execute merge and return preview data (simulated for now)
   */
  async executeMerge(startTableId: string): Promise<any[]> {
    try {
      const sql = this.generateMergeSQL(startTableId);
      console.log('Generated SQL:', sql);
      
      // For now, return simulated data
      // In production, this would execute the SQL against the database
      return this.simulateMergedData(startTableId);
    } catch (error) {
      console.error('Error executing merge:', error);
      throw error;
    }
  }

  /**
   * Simulate merged data for preview
   */
  private simulateMergedData(startTableId: string): any[] {
    const mockData: any[] = [];
    const connectedTables = this.getConnectedTables(startTableId);
    
    // Generate 10 sample rows
    for (let i = 0; i < 10; i++) {
      const row: any = {};
      
      connectedTables.forEach(tableId => {
        const table = this.tables.get(tableId);
        if (table) {
          table.schema.fields.forEach(field => {
            const columnName = `${table.name}_${field.name}`;
            row[columnName] = this.generateSampleValue(field.type, i);
          });
        }
      });
      
      mockData.push(row);
    }
    
    return mockData;
  }

  private getConnectedTables(startTableId: string): string[] {
    const visited = new Set<string>();
    const connected: string[] = [];
    
    this.visitConnectedTables(startTableId, visited, connected);
    
    return connected;
  }

  private visitConnectedTables(tableId: string, visited: Set<string>, connected: string[]) {
    if (visited.has(tableId)) return;
    
    visited.add(tableId);
    connected.push(tableId);
    
    for (const connection of this.connections.values()) {
      if (connection.sourceTableId === tableId) {
        this.visitConnectedTables(connection.targetTableId, visited, connected);
      } else if (connection.targetTableId === tableId) {
        this.visitConnectedTables(connection.sourceTableId, visited, connected);
      }
    }
  }

  private generateSampleValue(type: string, index: number): any {
    switch (type.toLowerCase()) {
      case 'text':
      case 'varchar':
      case 'string':
        return `Sample ${type} ${index + 1}`;
      case 'number':
      case 'integer':
      case 'int':
        return Math.floor(Math.random() * 1000) + index;
      case 'boolean':
      case 'bool':
        return Math.random() > 0.5;
      case 'date':
      case 'datetime':
      case 'timestamp':
        return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case 'email':
        return `user${index + 1}@example.com`;
      case 'url':
        return `https://example.com/item/${index + 1}`;
      default:
        return `${type} value ${index + 1}`;
    }
  }

  /**
   * Validate merge configuration
   */
  validateMergeConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if we have tables
    if (this.tables.size === 0) {
      errors.push('No tables available for merging');
    }
    
    // Check connection validity
    for (const [connectionId, connection] of this.connections.entries()) {
      const sourceTable = this.tables.get(connection.sourceTableId);
      const targetTable = this.tables.get(connection.targetTableId);
      
      if (!sourceTable) {
        errors.push(`Source table not found for connection ${connectionId}`);
        continue;
      }
      
      if (!targetTable) {
        errors.push(`Target table not found for connection ${connectionId}`);
        continue;
      }
      
      // Check if fields exist
      const sourceFieldExists = sourceTable.schema.fields.some(f => f.name === connection.sourceField);
      const targetFieldExists = targetTable.schema.fields.some(f => f.name === connection.targetField);
      
      if (!sourceFieldExists) {
        errors.push(`Source field '${connection.sourceField}' not found in table '${sourceTable.name}'`);
      }
      
      if (!targetFieldExists) {
        errors.push(`Target field '${connection.targetField}' not found in table '${targetTable.name}'`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get merge statistics
   */
  getMergeStatistics() {
    const components = this.findConnectedComponents();
    const totalTables = this.tables.size;
    const connectedTables = components.reduce((sum, component) => sum + (component.length > 1 ? component.length : 0), 0);
    
    return {
      totalTables,
      connectedTables,
      isolatedTables: totalTables - connectedTables,
      connections: this.connections.size,
      mergeableGroups: components.filter(c => c.length > 1).length
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.tables.clear();
    this.connections.clear();
  }
}