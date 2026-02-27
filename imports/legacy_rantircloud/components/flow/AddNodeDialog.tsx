
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogContentInner } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFlowStore } from '@/lib/flow-store';
import { nodeRegistry } from '@/lib/node-registry';
import { treeLayoutManager } from '@/lib/tree-layout';

export function AddNodeDialog() {
  const { 
    isAddNodeDialogOpen, 
    setIsAddNodeDialogOpen, 
    currentSourceNodeId, 
    currentSourceHandle,
    addNode, 
    nodes,
    edges,
    onConnect,
    setNodes,
  } = useFlowStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleClose = () => {
    setIsAddNodeDialogOpen(false);
  };

  const handleAddNode = (nodeType: string) => {
    if (!currentSourceNodeId) return;
    
    const sourceNode = nodes.find(n => n.id === currentSourceNodeId);
    if (!sourceNode) return;
    
    const plugin = nodeRegistry.getPlugin(nodeType);
    if (!plugin) return;
    
    // Generate a unique ID
    const newNodeId = `node-${Date.now()}`;
    
    // Get the selected output handle from the source node
    // IMPORTANT: branch handle must come from store (not node.data), otherwise it can be lost
    // between updates and we end up creating an edge without sourceHandle.
    const selectedOutputHandle = currentSourceHandle;
    
    // Calculate position - maintain vertical column alignment
    const isConditionalParent = sourceNode.data.type === 'condition' || sourceNode.type === 'conditional';
    
    let position: { x: number; y: number };
    
    // For conditional nodes with ANY branch handle (including multi-condition), use treeLayoutManager
    if (isConditionalParent && selectedOutputHandle) {
      position = treeLayoutManager.calculateNextNodePosition(
        currentSourceNodeId,
        selectedOutputHandle,
        nodes,
        edges
      );
    } else {
      // For non-conditional parents: inherit parent's X position to maintain straight vertical line
      const verticalOffset = 200;
      position = {
        x: sourceNode.position.x,
        y: sourceNode.position.y + verticalOffset,
      };
    }
    
    // Special handling for loop-node
    let nodeComponentType = 'custom';
    if (nodeType === 'condition') {
      nodeComponentType = 'conditional';
    } else if (nodeType === 'loop-node') {
      nodeComponentType = 'loop';
    }
    
    // Create the new node
    const newNode = {
      id: newNodeId,
      type: nodeComponentType,
      position,
      data: {
        label: plugin.name,
        type: nodeType,
        category: plugin.category,
        inputs: {},
        color: plugin.color,
      }
    };
    
    // Add the node to the flow
    addNode(newNode);
    
    // Create a connection from the source node to the new node
    const connectionData: any = {
      source: currentSourceNodeId,
      target: newNodeId,
      targetHandle: null,
      type: 'straight',
    };

    // Add sourceHandle for ALL conditional branches (including multi-condition handles like 'else', 'branch_1', etc.)
    if (isConditionalParent && selectedOutputHandle) {
      connectionData.sourceHandle = selectedOutputHandle;
    }
    
    onConnect(connectionData);
    
    // After adding the node and connection, run collision detection and expansion
    // ONLY for binary conditional branches (true/false) to maintain strict alignment for multi-condition
    setTimeout(() => {
      const currentState = useFlowStore.getState();
      
      // Check if source is in multi-condition mode
      const isMultiCondition = sourceNode.data?.inputs?.multipleConditions === true;
      const returnType = sourceNode.data?.inputs?.returnType || 'boolean';
      const isBinaryMode = !isMultiCondition || returnType === 'boolean';
      
      // Only expand for binary mode - skip for multi-condition to preserve vertical alignment
      if (isConditionalParent && isBinaryMode && (selectedOutputHandle === 'true' || selectedOutputHandle === 'false')) {
        const expandedNodes = treeLayoutManager.expandBranchesToPreventOverlap(
          currentState.nodes,
          currentState.edges,
          newNodeId
        );
        
        // Only update if positions changed
        const hasChanges = expandedNodes.some((node, idx) => {
          const original = currentState.nodes[idx];
          return original && (node.position.x !== original.position.x || node.position.y !== original.position.y);
        });
        
        if (hasChanges) {
          setNodes(expandedNodes);
        }
      }
    }, 50);
    
    // Close the dialog
    setIsAddNodeDialogOpen(false);
  };

  // Get all available node plugins
  const allPlugins = nodeRegistry.getAllPlugins();
  
  const filteredPlugins = allPlugins.filter(plugin => {
    const matchesSearch = 
      search === '' || 
      plugin.name.toLowerCase().includes(search.toLowerCase()) ||
      plugin.description.toLowerCase().includes(search.toLowerCase());
      
    const matchesCategory = 
      activeCategory === 'all' || 
      plugin.category === activeCategory;
      
    return matchesSearch && matchesCategory;
  });
  
  const categories = ['all', ...Array.from(new Set(allPlugins.map(p => p.category)))];

  return (
    <Dialog open={isAddNodeDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>
        
        <DialogContentInner className="space-y-4">
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm"
          />
          
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-fit">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="capitalize text-xs">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 gap-2 p-1">
                {filteredPlugins.map(plugin => (
                  <button
                    key={plugin.type}
                    className="flex items-start gap-3 p-3 hover:bg-accent rounded-md text-left"
                    onClick={() => handleAddNode(plugin.type)}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: plugin.type === 'firecrawl' ? '#ff660030' : `${plugin.color}20` }}
                    >
                      {plugin.type === 'firecrawl' ? (
                        <svg fill="none" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
                            fill="#FF6600"
                          />
                        </svg>
                      ) : plugin.type === 'apollo' ? (
                        <img 
                          src="https://cdn.activepieces.com/pieces/apollo.png" 
                          alt="Apollo" 
                          className="h-4 w-4 object-cover"
                        />
                      ) : (typeof plugin.icon === 'string') ? (
                        <img 
                          src={plugin.icon} 
                          alt={plugin.name} 
                          className="h-4 w-4 object-cover"
                        />
                      ) : (
                        plugin.icon && <plugin.icon className="h-4 w-4" style={{ color: plugin.color }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{plugin.name}</h3>
                      <p className="text-xs text-muted-foreground">{plugin.description}</p>
                    </div>
                  </button>
                ))}
                
                {filteredPlugins.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No nodes found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContentInner>
      </DialogContent>
    </Dialog>
  );
}
