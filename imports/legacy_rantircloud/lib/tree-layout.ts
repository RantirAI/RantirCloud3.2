import { FlowNode, FlowEdge } from '@/types/flowTypes';
import { Edge } from '@xyflow/react';

export interface TreeLayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  branchOffset: number;
  nodeWidth: number;
  minBranchGap: number; // Minimum gap between adjacent branches
}

export interface TreePosition {
  x: number;
  y: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  collidingNode?: FlowNode;
  requiredShift?: number;
}

export class TreeLayoutManager {
  private config: TreeLayoutConfig;

  constructor(config: Partial<TreeLayoutConfig> = {}) {
    this.config = {
      horizontalSpacing: 250,
      verticalSpacing: 350,
      branchOffset: 150,
      nodeWidth: 200,
      minBranchGap: 100, // Minimum 100px gap between branches for better visual separation
      ...config
    };
  }

  /**
   * Detect if a position would collide with existing nodes
   */
  public detectCollision(
    position: { x: number; y: number },
    nodeWidth: number,
    existingNodes: FlowNode[],
    excludeNodeId?: string
  ): CollisionResult {
    const buffer = this.config.minBranchGap;
    
    for (const node of existingNodes) {
      if (node.id === excludeNodeId) continue;
      
      // Check vertical proximity (same row = within 150px vertically)
      if (Math.abs(node.position.y - position.y) > 150) continue;
      
      // Check horizontal overlap with buffer
      const existingLeft = node.position.x - buffer;
      const existingRight = node.position.x + nodeWidth + buffer;
      const newLeft = position.x;
      const newRight = position.x + nodeWidth;
      
      if (newRight > existingLeft && newLeft < existingRight) {
        const overlapAmount = Math.min(newRight, existingRight) - Math.max(newLeft, existingLeft);
        return { 
          hasCollision: true, 
          collidingNode: node,
          requiredShift: overlapAmount + buffer
        };
      }
    }
    return { hasCollision: false };
  }

  /**
   * Get all nodes in a subtree starting from a given node
   */
  public getSubtreeNodes(
    rootNodeId: string,
    edges: Edge[],
    nodes: FlowNode[]
  ): FlowNode[] {
    const subtreeNodeIds = new Set<string>();
    
    const collect = (nodeId: string) => {
      subtreeNodeIds.add(nodeId);
      edges
        .filter(e => e.source === nodeId)
        .forEach(e => collect(e.target));
    };
    collect(rootNodeId);
    
    return nodes.filter(n => subtreeNodeIds.has(n.id));
  }

  /**
   * Shift an entire subtree by a given X offset
   */
  public shiftSubtree(
    rootNodeId: string,
    xOffset: number,
    nodes: FlowNode[],
    edges: Edge[]
  ): FlowNode[] {
    const subtreeNodeIds = new Set<string>();
    
    const collect = (nodeId: string) => {
      subtreeNodeIds.add(nodeId);
      edges
        .filter(e => e.source === nodeId)
        .forEach(e => collect(e.target));
    };
    collect(rootNodeId);
    
    return nodes.map(node => {
      if (subtreeNodeIds.has(node.id)) {
        return {
          ...node,
          position: {
            ...node.position,
            x: node.position.x + xOffset
          }
        };
      }
      return node;
    });
  }

  /**
   * Calculate the horizontal extent (bounding box) of a branch
   */
  public getBranchExtent(
    conditionalNodeId: string,
    branchType: 'true' | 'false',
    nodes: FlowNode[],
    edges: Edge[]
  ): { minX: number; maxX: number } | null {
    const branchNodes = this.getBranchNodes(conditionalNodeId, branchType, edges, nodes);
    
    if (branchNodes.length === 0) return null;
    
    const xPositions = branchNodes.map(n => n.position.x);
    return {
      minX: Math.min(...xPositions),
      maxX: Math.max(...xPositions) + this.config.nodeWidth
    };
  }

  /**
   * Extract branch configuration from a conditional node's data
   * Used to support multi-condition branches (not just true/false)
   */
  public getMultiConditionBranches(
    conditionalNode: FlowNode
  ): { id: string; label: string; index: number }[] {
    const isMultiCondition = conditionalNode.data?.inputs?.multipleConditions === true;
    const returnType = conditionalNode.data?.inputs?.returnType || 'boolean';
    
    if (!isMultiCondition || returnType === 'boolean') {
      return [
        { id: 'true', label: 'TRUE', index: 0 },
        { id: 'false', label: 'FALSE', index: 1 }
      ];
    }
    
    // Multi-condition with string/integer return type
    let cases: any[] = [];
    try {
      const casesValue = conditionalNode.data?.inputs?.cases;
      cases = typeof casesValue === 'string' 
        ? JSON.parse(casesValue || '[]') 
        : (casesValue || []);
    } catch (e) {
      cases = [];
    }
    
    const uniqueValues = [...new Set(cases.map((c: any) => c.returnValue))];
    const branches = uniqueValues.map((value, i) => ({
      id: value,
      label: String(value).toUpperCase(),
      index: i
    }));
    
    // Add ELSE branch at the end
    branches.push({ id: 'else', label: 'ELSE', index: branches.length });
    return branches;
  }

  /**
   * Calculate safe branch offset that prevents collisions
   * Now supports multi-condition branches (string branchType)
   */
  public calculateSafeOffset(
    conditionalNodeId: string,
    branchType: string,  // Changed from 'true' | 'false' to support multi-condition
    nodes: FlowNode[],
    edges: Edge[]
  ): number {
    const conditionalNode = nodes.find(n => n.id === conditionalNodeId);
    if (!conditionalNode) return this.config.branchOffset;

    // For multi-condition nodes, use index-based fixed spacing
    const branches = this.getMultiConditionBranches(conditionalNode);
    if (branches.length > 2) {
      const branchIndex = branches.findIndex(b => b.id === branchType);
      if (branchIndex === -1) return this.config.branchOffset;
      
      const branchCount = branches.length;
      const minBranchSpacing = 220; // Match ConditionalNode.tsx spacing - increased for better visibility
      const totalWidth = (branchCount - 1) * minBranchSpacing;
      return Math.abs(-totalWidth / 2 + branchIndex * minBranchSpacing);
    }

    // Binary TRUE/FALSE - use existing collision detection logic
    const nodeCenterX = conditionalNode.position.x + this.config.nodeWidth / 2;
    const oppositeBranch = branchType === 'true' ? 'false' : 'true';
    const oppositeExtent = this.getBranchExtent(conditionalNodeId, oppositeBranch as 'true' | 'false', nodes, edges);
    
    if (!oppositeExtent) return this.config.branchOffset;
    
    // Calculate required offset to prevent overlap
    if (branchType === 'true') {
      const distanceToOpposite = oppositeExtent.minX - nodeCenterX;
      return Math.max(this.config.branchOffset, -distanceToOpposite + this.config.minBranchGap);
    } else {
      const distanceToOpposite = nodeCenterX - oppositeExtent.maxX;
      return Math.max(this.config.branchOffset, -distanceToOpposite + this.config.minBranchGap);
    }
  }

  /**
   * Expand branches to prevent overlap after adding a new node
   * This is the main algorithm that handles dynamic collision resolution
   */
  public expandBranchesToPreventOverlap(
    nodes: FlowNode[],
    edges: Edge[],
    triggeredByNodeId?: string
  ): FlowNode[] {
    let updatedNodes = [...nodes];
    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Identify multi-condition parents to exclude their children from collision resolution
    const multiConditionParents = new Set<string>();
    nodes.forEach(node => {
      if ((node.data?.type === 'condition' || node.type === 'conditional') &&
          node.data?.inputs?.multipleConditions === true &&
          (node.data?.inputs?.returnType === 'string' || node.data?.inputs?.returnType === 'integer')) {
        multiConditionParents.add(node.id);
      }
    });

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      // Find all conditional nodes
      const conditionalNodes = updatedNodes.filter(n => 
        n.data?.type === 'condition' || n.type === 'conditional'
      );

      for (const condNode of conditionalNodes) {
        // Skip multi-condition nodes - they use fixed index-based positioning
        if (multiConditionParents.has(condNode.id)) {
          continue;
        }

        const trueExtent = this.getBranchExtent(condNode.id, 'true', updatedNodes, edges);
        const falseExtent = this.getBranchExtent(condNode.id, 'false', updatedNodes, edges);

        if (!trueExtent || !falseExtent) continue;

        // Check if branches overlap
        const overlap = trueExtent.maxX - falseExtent.minX + this.config.minBranchGap;
        
        if (overlap > 0) {
          hasChanges = true;
          const shiftAmount = Math.ceil(overlap / 2) + 10; // Split the expansion evenly

          // Find the first child node in each branch to shift the entire subtree
          const trueBranchEdge = edges.find(e => 
            e.source === condNode.id && e.sourceHandle === 'true'
          );
          const falseBranchEdge = edges.find(e => 
            e.source === condNode.id && e.sourceHandle === 'false'
          );

          if (trueBranchEdge) {
            updatedNodes = this.shiftSubtree(trueBranchEdge.target, -shiftAmount, updatedNodes, edges);
          }
          if (falseBranchEdge) {
            updatedNodes = this.shiftSubtree(falseBranchEdge.target, shiftAmount, updatedNodes, edges);
          }
        }
      }

      // Also check for collisions between sibling conditional nodes (different parents)
      // Pass in protected node IDs from multi-condition branches
      updatedNodes = this.resolveNeighborCollisions(updatedNodes, edges, multiConditionParents);
    }

    // Push neighbors away from multi-condition bracket footprints
    if (multiConditionParents.size > 0) {
      updatedNodes = this.resolveMultiConditionOverlap(updatedNodes, edges, multiConditionParents);
    }

    return updatedNodes;
  }

  /**
   * Resolve collisions between neighboring conditional branches from different parents
   */
  private resolveNeighborCollisions(
    nodes: FlowNode[],
    edges: Edge[],
    multiConditionParents?: Set<string>
  ): FlowNode[] {
    let updatedNodes = [...nodes];
    
    // Get all nodes that are direct children of multi-condition parents (protected)
    const protectedNodeIds = new Set<string>();
    if (multiConditionParents && multiConditionParents.size > 0) {
      edges.forEach(edge => {
        if (multiConditionParents.has(edge.source)) {
          protectedNodeIds.add(edge.target);
          // Also protect their entire subtrees
          const subtree = this.getBranchNodes(edge.source, edge.sourceHandle || '', edges, nodes);
          subtree.forEach(n => protectedNodeIds.add(n.id));
        }
      });
    }
    
    // Group nodes by their approximate Y position (rows), excluding protected nodes
    const rowMap = new Map<number, FlowNode[]>();
    nodes.forEach(node => {
      // Skip protected nodes from collision resolution
      if (protectedNodeIds.has(node.id)) return;
      
      const rowKey = Math.floor(node.position.y / 100) * 100;
      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, []);
      }
      rowMap.get(rowKey)!.push(node);
    });

    // For each row, check for collisions and shift as needed
    rowMap.forEach((rowNodes) => {
      if (rowNodes.length < 2) return;

      // Sort by X position
      const sortedNodes = rowNodes.sort((a, b) => a.position.x - b.position.x);

      for (let i = 0; i < sortedNodes.length - 1; i++) {
        const leftNode = sortedNodes[i];
        const rightNode = sortedNodes[i + 1];

        const leftRight = leftNode.position.x + this.config.nodeWidth;
        const rightLeft = rightNode.position.x;
        const gap = rightLeft - leftRight;

        if (gap < this.config.minBranchGap) {
          const shiftNeeded = this.config.minBranchGap - gap + 10;
          
          // Shift the right node and its subtree
          updatedNodes = this.shiftSubtree(rightNode.id, shiftNeeded, updatedNodes, edges);
          
          // Update the sorted nodes for the next iteration
          sortedNodes[i + 1] = updatedNodes.find(n => n.id === rightNode.id)!;
        }
      }
    });

    return updatedNodes;
  }

  /**
   * Resolve collisions between multi-condition bracket footprints and neighboring nodes
   * This pushes OUTSIDE nodes away from the multi-condition bracket area
   */
  private resolveMultiConditionOverlap(
    nodes: FlowNode[],
    edges: Edge[],
    multiConditionParents: Set<string>
  ): FlowNode[] {
    let updatedNodes = [...nodes];
    
    for (const mcNodeId of multiConditionParents) {
      const mcNode = updatedNodes.find(n => n.id === mcNodeId);
      if (!mcNode) continue;
      
      // Calculate the total footprint of this multi-condition node
      const branches = this.getMultiConditionBranches(mcNode);
      const branchCount = branches.length;
      const minBranchSpacing = 220; // Match ConditionalNode.tsx spacing
      const nodeHalfWidth = this.config.nodeWidth / 2;
      
      // Calculate left and right extent of the bracket
      const totalWidth = (branchCount - 1) * minBranchSpacing;
      const nodeCenterX = mcNode.position.x + nodeHalfWidth;
      const leftmostX = nodeCenterX - totalWidth / 2 - nodeHalfWidth;
      const rightmostX = nodeCenterX + totalWidth / 2 + nodeHalfWidth;
      
      // Get all protected node IDs (children of this multi-condition)
      const protectedIds = new Set<string>();
      protectedIds.add(mcNodeId);
      edges.forEach(edge => {
        if (edge.source === mcNodeId) {
          protectedIds.add(edge.target);
          // Also protect their entire subtrees
          const subtree = this.getBranchNodes(mcNodeId, edge.sourceHandle || '', edges, updatedNodes);
          subtree.forEach(n => protectedIds.add(n.id));
        }
      });
      
      // Find nodes that overlap with bracket area (excluding protected nodes)
      const nodesToCheck = updatedNodes.filter(node => !protectedIds.has(node.id));
      
      for (const node of nodesToCheck) {
        // Get the full horizontal extent of this node AND its subtree
        const subtreeNodes = this.getSubtreeNodes(node.id, edges, updatedNodes);
        const allXPositions = subtreeNodes.map(n => n.position.x);
        const subtreeLeft = Math.min(...allXPositions);
        const subtreeRight = Math.max(...allXPositions) + this.config.nodeWidth;
        
        const nodeY = node.position.y;
        const mcY = mcNode.position.y;
        
        // Check if node or its subtree could overlap with bracket
        // Include nodes at the SAME Y level (sibling conditional nodes)
        // and nodes in the bracket zone below
        const isAtSameLevel = Math.abs(nodeY - mcY) < 100;
        const isInBracketZone = nodeY > mcY && nodeY < mcY + 500;
        
        if (!isAtSameLevel && !isInBracketZone) continue;
        
        const safeGap = this.config.minBranchGap + 80; // Extra padding for multi-condition
        
        // Check for overlap with left side of bracket
        if (subtreeRight > leftmostX - safeGap && subtreeLeft < nodeCenterX) {
          const shiftNeeded = (leftmostX - safeGap) - subtreeRight;
          if (shiftNeeded < 0) {
            updatedNodes = this.shiftSubtree(node.id, shiftNeeded - 40, updatedNodes, edges);
          }
        }
        
        // Check for overlap with right side of bracket
        if (subtreeLeft < rightmostX + safeGap && subtreeRight > nodeCenterX) {
          const shiftNeeded = (rightmostX + safeGap) - subtreeLeft;
          if (shiftNeeded > 0) {
            updatedNodes = this.shiftSubtree(node.id, shiftNeeded + 40, updatedNodes, edges);
          }
        }
      }
    }
    
    return updatedNodes;
  }

  /**
   * Calculate dynamic branch width based on the nodes in the branch
   */
  public calculateBranchWidth(
    conditionalNodeId: string,
    branchType: 'true' | 'false',
    nodes: FlowNode[],
    edges: Edge[]
  ): number {
    const branchNodes = this.getBranchNodes(conditionalNodeId, branchType, edges, nodes);
    
    if (branchNodes.length === 0) {
      return this.config.nodeWidth / 2 + 50;
    }

    // Find the actual horizontal extent of all nodes in this branch
    const xPositions = branchNodes.map(n => n.position.x);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions) + this.config.nodeWidth;
    
    return Math.max(maxX - minX, this.config.nodeWidth / 2 + 50);
  }

  /**
   * Calculate the exact X position for a branch
   * Now uses index-based positioning for multi-condition nodes
   */
  private calculateBranchXPosition(
    conditionalNode: FlowNode, 
    branchType: string,
    nodes?: FlowNode[],
    edges?: Edge[]
  ): number {
    const nodeWidth = this.config.nodeWidth;
    const nodeHalfWidth = nodeWidth / 2;
    const nodeCenterX = conditionalNode.position.x + nodeHalfWidth;
    
    // Get all branches for this conditional node
    const branches = this.getMultiConditionBranches(conditionalNode);
    const branchIndex = branches.findIndex(b => b.id === branchType);
    
    // If branch not found, fall back to center
    if (branchIndex === -1) {
      console.warn(`Branch "${branchType}" not found in conditional node`);
      return nodeCenterX - nodeHalfWidth;
    }
    
    const branchCount = branches.length;
    const minBranchSpacing = 220; // Match ConditionalNode.tsx spacing - increased for better visibility
    
    // Calculate total width and offset using same formula as visual SVG
    const totalWidth = (branchCount - 1) * minBranchSpacing;
    const xOffset = -totalWidth / 2 + branchIndex * minBranchSpacing;
    
    // Return position so node CENTER aligns with branch line
    return nodeCenterX + xOffset - nodeHalfWidth;
  }

  /**
   * Calculate clean vertical layout for conditional branches
   */
  calculateBranchLayout(
    conditionalNodeId: string,
    branchType: string,
    nodes: FlowNode[],
    edges: Edge[]
  ): Record<string, TreePosition> {
    const conditionalNode = nodes.find(n => n.id === conditionalNodeId);
    if (!conditionalNode) return {};

    const positions: Record<string, TreePosition> = {};
    const branchNodes = this.getBranchNodes(conditionalNodeId, branchType, edges, nodes);
    
    if (branchNodes.length === 0) return positions;

    const branchX = this.calculateBranchXPosition(conditionalNode, branchType, nodes, edges);
    let currentY = conditionalNode.position.y + this.config.verticalSpacing;
    const sortedNodes = this.sortNodesByDepth(branchNodes, edges);
    
    sortedNodes.forEach((node, index) => {
      positions[node.id] = {
        x: branchX,
        y: currentY + (index * this.config.verticalSpacing)
      };
    });

    return positions;
  }

  /**
   * Sort nodes by their depth in the tree
   */
  private sortNodesByDepth(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const result: FlowNode[] = [];

    const rootNodes = nodes.filter(node => {
      const hasIncomingEdge = edges.some(edge => 
        edge.target === node.id && nodeMap.has(edge.source)
      );
      return !hasIncomingEdge;
    });

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = nodeMap.get(nodeId);
      if (!node) return;
      
      visited.add(nodeId);
      result.push(node);

      const childEdges = edges.filter(e => e.source === nodeId);
      childEdges.forEach(edge => {
        if (nodeMap.has(edge.target)) {
          traverse(edge.target);
        }
      });
    };

    rootNodes.forEach(node => traverse(node.id));
    return result;
  }

  /**
   * Get all nodes in a specific branch
   */
  public getBranchNodes(
    sourceNodeId: string,
    sourceHandle: string,
    edges: Edge[],
    nodes: FlowNode[]
  ): FlowNode[] {
    const visited = new Set<string>();
    const branchNodes: FlowNode[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      branchNodes.push(node);

      const childEdges = edges.filter(e => e.source === nodeId);
      childEdges.forEach(edge => {
        traverse(edge.target);
      });
    };

    const directChildren = edges
      .filter(e => e.source === sourceNodeId && e.sourceHandle === sourceHandle)
      .map(e => e.target);

    directChildren.forEach(nodeId => traverse(nodeId));
    return branchNodes;
  }

  /**
   * Calculate optimal positioning for a new node in a branch
   */
  calculateNextNodePosition(
    conditionalNodeId: string,
    branchType: string,
    nodes: FlowNode[],
    edges: Edge[]
  ): TreePosition {
    const conditionalNode = nodes.find(n => n.id === conditionalNodeId);
    if (!conditionalNode) {
      throw new Error(`Conditional node ${conditionalNodeId} not found`);
    }

    const branchX = this.calculateBranchXPosition(conditionalNode, branchType, nodes, edges);
    const baseY = conditionalNode.position.y + this.config.verticalSpacing;
    const branchNodes = this.getBranchNodes(conditionalNodeId, branchType, edges, nodes);

    if (branchNodes.length === 0) {
      return { x: branchX, y: baseY };
    }

    const maxY = Math.max(...branchNodes.map(n => n.position.y));
    return { x: branchX, y: maxY + this.config.verticalSpacing };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TreeLayoutConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TreeLayoutConfig {
    return { ...this.config };
  }
}

export const treeLayoutManager = new TreeLayoutManager();
