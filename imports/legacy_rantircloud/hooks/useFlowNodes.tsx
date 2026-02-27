
import { useCallback } from "react";
import { useFlowStore } from "@/lib/flow-store";

// This hook is now a wrapper around our store for backward compatibility
export function useFlowNodes(flowProjectId: string | undefined) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect
  } = useFlowStore();

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
}
