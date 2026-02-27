
import dagre from 'dagre';
import { FlowNode, FlowEdge } from '@/types/flowTypes';

export type RankDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface DagreLayoutOptions {
  rankdir?: RankDirection; // top-bottom, left-right, etc.
  nodesep?: number;        // separation between nodes
  ranksep?: number;        // separation between ranks (levels)
  marginx?: number;
  marginy?: number;
  defaultNodeWidth?: number;
  defaultNodeHeight?: number;
}

const defaultOptions: Required<DagreLayoutOptions> = {
  rankdir: 'TB',
  nodesep: 80,
  ranksep: 120,
  marginx: 20,
  marginy: 20,
  defaultNodeWidth: 200,
  defaultNodeHeight: 80,
};

export function applyDagreLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: DagreLayoutOptions = {}
): FlowNode[] {
  const opts = { ...defaultOptions, ...options };

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.rankdir,
    nodesep: opts.nodesep,
    ranksep: opts.ranksep,
    marginx: opts.marginx,
    marginy: opts.marginy,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with dimensions
  nodes.forEach((node) => {
    const width = (node as any).width || (node as any).style?.width || opts.defaultNodeWidth;
    const height = (node as any).height || (node as any).style?.height || opts.defaultNodeHeight;
    g.setNode(node.id, { width: Number(width) || opts.defaultNodeWidth, height: Number(height) || opts.defaultNodeHeight });
  });

  // Add edges
  edges.forEach((e) => {
    if (e.source && e.target) {
      g.setEdge(e.source, e.target);
    }
  });

  // Run layout
  dagre.layout(g);

  // Determine handle positions based on rank direction
  const rd = opts.rankdir;
  const handlePositions = rd === 'LR'
    ? { targetPosition: 'left', sourcePosition: 'right' }
    : rd === 'RL'
    ? { targetPosition: 'right', sourcePosition: 'left' }
    : rd === 'BT'
    ? { targetPosition: 'bottom', sourcePosition: 'top' }
    : { targetPosition: 'top', sourcePosition: 'bottom' };

  // Map positions back to nodes (dagre positions are centers)
  const laidOut = nodes.map((n) => {
    const nodeWithPos = g.node(n.id);
    if (!nodeWithPos) return n;

    const width = (n as any).width || (n as any).style?.width || opts.defaultNodeWidth;
    const height = (n as any).height || (n as any).style?.height || opts.defaultNodeHeight;

    return {
      ...n,
      targetPosition: (n as any).targetPosition ?? (handlePositions as any).targetPosition,
      sourcePosition: (n as any).sourcePosition ?? (handlePositions as any).sourcePosition,
      position: {
        x: nodeWithPos.x - (Number(width) || opts.defaultNodeWidth) / 2,
        y: nodeWithPos.y - (Number(height) || opts.defaultNodeHeight) / 2,
      },
    } as FlowNode;
  });

  return laidOut;
}
