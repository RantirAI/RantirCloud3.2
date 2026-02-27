import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useFlowStore } from '@/lib/flow-store';

// Snapshot types for different contexts
export interface FlowSnapshot {
  nodes: any[];
  edges: any[];
}

export interface TableSnapshot {
  records: any[];
  schema: any;
}

export interface DocumentSnapshot {
  content: any;
  title: string;
}

export interface Snapshot {
  id: string;
  messageIndex: number;
  contextType: 'flow' | 'database' | 'table' | 'document';
  contextId: string;
  timestamp: number;
  flowData?: FlowSnapshot;
  tableData?: TableSnapshot;
  documentData?: DocumentSnapshot;
}

interface SnapshotState {
  snapshots: Map<string, Snapshot>; // key: `${contextType}-${contextId}-${messageIndex}`
  
  // Actions
  captureFlowSnapshot: (contextId: string, messageIndex: number) => string;
  captureTableSnapshot: (tableId: string, messageIndex: number) => Promise<string>;
  captureDocumentSnapshot: (documentId: string, messageIndex: number) => Promise<string>;
  getSnapshot: (snapshotId: string) => Snapshot | undefined;
  getSnapshotByMessage: (contextType: string, contextId: string, messageIndex: number) => Snapshot | undefined;
  restoreFlowSnapshot: (snapshot: Snapshot) => void;
  restoreTableSnapshot: (snapshot: Snapshot) => Promise<void>;
  restoreDocumentSnapshot: (snapshot: Snapshot) => Promise<void>;
  clearSnapshots: (contextId?: string) => void;
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: new Map(),

  captureFlowSnapshot: (contextId: string, messageIndex: number) => {
    const { nodes, edges } = useFlowStore.getState();
    const snapshotId = `flow-${contextId}-${messageIndex}-${Date.now()}`;
    
    const snapshot: Snapshot = {
      id: snapshotId,
      messageIndex,
      contextType: 'flow',
      contextId,
      timestamp: Date.now(),
      flowData: {
        nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
        edges: JSON.parse(JSON.stringify(edges))
      }
    };
    
    set((state) => {
      const newSnapshots = new Map(state.snapshots);
      newSnapshots.set(snapshotId, snapshot);
      return { snapshots: newSnapshots };
    });
    
    console.log('[SnapshotStore] Captured flow snapshot:', snapshotId, {
      nodeCount: nodes.length,
      edgeCount: edges.length
    });
    
    return snapshotId;
  },

  captureTableSnapshot: async (tableId: string, messageIndex: number) => {
    const { data, error } = await supabase
      .from('table_projects')
      .select('records, schema')
      .eq('id', tableId)
      .single();
    
    if (error) {
      console.error('[SnapshotStore] Error fetching table data:', error);
      throw error;
    }
    
    const snapshotId = `table-${tableId}-${messageIndex}-${Date.now()}`;
    
    const snapshot: Snapshot = {
      id: snapshotId,
      messageIndex,
      contextType: 'table',
      contextId: tableId,
      timestamp: Date.now(),
      tableData: {
        records: (data?.records as any[]) || [],
        schema: data?.schema || {}
      }
    };
    
    set((state) => {
      const newSnapshots = new Map(state.snapshots);
      newSnapshots.set(snapshotId, snapshot);
      return { snapshots: newSnapshots };
    });
    
    console.log('[SnapshotStore] Captured table snapshot:', snapshotId, {
      recordCount: (data?.records as any[])?.length || 0
    });
    
    return snapshotId;
  },

  captureDocumentSnapshot: async (documentId: string, messageIndex: number) => {
    const { data, error } = await supabase
      .from('documents')
      .select('content, title')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('[SnapshotStore] Error fetching document data:', error);
      throw error;
    }
    
    const snapshotId = `document-${documentId}-${messageIndex}-${Date.now()}`;
    
    const snapshot: Snapshot = {
      id: snapshotId,
      messageIndex,
      contextType: 'document',
      contextId: documentId,
      timestamp: Date.now(),
      documentData: {
        content: data?.content || {},
        title: data?.title || ''
      }
    };
    
    set((state) => {
      const newSnapshots = new Map(state.snapshots);
      newSnapshots.set(snapshotId, snapshot);
      return { snapshots: newSnapshots };
    });
    
    console.log('[SnapshotStore] Captured document snapshot:', snapshotId);
    
    return snapshotId;
  },

  getSnapshot: (snapshotId: string) => {
    return get().snapshots.get(snapshotId);
  },

  getSnapshotByMessage: (contextType: string, contextId: string, messageIndex: number) => {
    const snapshots = get().snapshots;
    for (const [, snapshot] of snapshots) {
      if (
        snapshot.contextType === contextType &&
        snapshot.contextId === contextId &&
        snapshot.messageIndex === messageIndex
      ) {
        return snapshot;
      }
    }
    return undefined;
  },

  restoreFlowSnapshot: (snapshot: Snapshot) => {
    if (!snapshot.flowData) {
      console.error('[SnapshotStore] No flow data in snapshot');
      return;
    }
    
    const { setNodes, setEdges, setShouldSaveImmediately } = useFlowStore.getState();
    
    setNodes(snapshot.flowData.nodes);
    setEdges(snapshot.flowData.edges);
    setShouldSaveImmediately(true); // Trigger save to database
    
    console.log('[SnapshotStore] Restored flow snapshot:', snapshot.id, {
      nodeCount: snapshot.flowData.nodes.length,
      edgeCount: snapshot.flowData.edges.length
    });
  },

  restoreTableSnapshot: async (snapshot: Snapshot) => {
    if (!snapshot.tableData) {
      console.error('[SnapshotStore] No table data in snapshot');
      return;
    }
    
    const { error } = await supabase
      .from('table_projects')
      .update({
        records: snapshot.tableData.records,
        schema: snapshot.tableData.schema
      })
      .eq('id', snapshot.contextId);
    
    if (error) {
      console.error('[SnapshotStore] Error restoring table:', error);
      throw error;
    }
    
    console.log('[SnapshotStore] Restored table snapshot:', snapshot.id);
  },

  restoreDocumentSnapshot: async (snapshot: Snapshot) => {
    if (!snapshot.documentData) {
      console.error('[SnapshotStore] No document data in snapshot');
      return;
    }
    
    const { error } = await supabase
      .from('documents')
      .update({
        content: snapshot.documentData.content,
        title: snapshot.documentData.title
      })
      .eq('id', snapshot.contextId);
    
    if (error) {
      console.error('[SnapshotStore] Error restoring document:', error);
      throw error;
    }
    
    console.log('[SnapshotStore] Restored document snapshot:', snapshot.id);
  },

  clearSnapshots: (contextId?: string) => {
    if (contextId) {
      set((state) => {
        const newSnapshots = new Map(state.snapshots);
        for (const [key, snapshot] of newSnapshots) {
          if (snapshot.contextId === contextId) {
            newSnapshots.delete(key);
          }
        }
        return { snapshots: newSnapshots };
      });
    } else {
      set({ snapshots: new Map() });
    }
  }
}));
