
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Repeat, Plus, Trash2, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/lib/flow-store';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nodeRegistry } from '@/lib/node-registry';

export function LoopNode({ id, selected, data }) {
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const { 
    nodes, 
    edges,
    addNode, 
    setCurrentSourceNodeId, 
    onConnect, 
    removeNode, 
    toggleNodeEnabled 
  } = useFlowStore();
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    } else {
      removeNode(id);
    }
  };
  
  const handleAddNode = (nodeType: string) => {
    // Generate a unique ID
    const newNodeId = `node-${Date.now()}`;
    
    // Find loop node and get its position
    const loopNode = nodes.find(n => n.id === id);
    if (!loopNode) return;
    
    const plugin = nodeRegistry.getPlugin(nodeType);
    if (!plugin) return;
    
    // Calculate position for the new node (inside the loop node)
    const position = {
      x: loopNode.position.x + 20, // Offset a bit from the loop node
      y: loopNode.position.y + 70, // Position below the loop node header
    };
    
    // Create the new node
    const newNode = {
      id: newNodeId,
      type: nodeType === 'condition' ? 'conditional' : 'custom',
      position,
      data: {
        label: plugin.name,
        type: nodeType,
        category: plugin.category,
        inputs: {},
        // Add parent loop node reference
        parentLoopId: id,
        // Reference to the plugin for rendering
        color: plugin.color,
      }
    };
    
    // Add the node to the flow
    addNode(newNode);
    
    // Create a connection from the loop node to the new node
    onConnect({
      source: id,
      target: newNodeId,
      type: 'smoothstep',
    });
    
    // Close the dialog
    setShowAddNodeDialog(false);
  };
  
  // Get all plugins from the registry
  const allPlugins = nodeRegistry.getAllPlugins();
  
  // Filter plugins based on search and category
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
  
  // Get unique categories for tabs
  const categories = ['all', ...Array.from(new Set(allPlugins.map(p => p.category)))];
  
  // Count child nodes for this loop
  const childNodeCount = nodes.filter(n => n.data.parentLoopId === id).length;

  return (
    <>
      <Card className={cn(
        "min-w-[280px] border-2 relative p-0",
        selected && "ring-2 ring-primary",
        data.disabled && "opacity-60",
      )}>
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${data.color || '#9333ea'}20` }}
              >
                <Repeat 
                  className="h-4 w-4" 
                  style={{ color: data.color || '#9333ea' }} 
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium truncate">{data.label || "Loop"}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {childNodeCount 
                    ? `${childNodeCount} child node${childNodeCount > 1 ? 's' : ''}` 
                    : 'No child nodes'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400"
                      onClick={() => toggleNodeEnabled(id)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Toggle node enabled
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete node
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        <div className="p-4 min-h-[60px] bg-muted/10 flex flex-col items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowAddNodeDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Node
          </Button>
        </div>
        
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-1.5 !bg-gray-300 border-0"
        />
        
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-1.5 !bg-gray-300 border-0"
        />
      </Card>
      
      {/* Add Node Dialog */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Node to Loop</DialogTitle>
          </DialogHeader>
          
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="mb-4 w-fit">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="capitalize">
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
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: `${plugin.color}20` }}
                    >
                      {plugin.type === 'apollo' ? (
                        <img 
                          src="https://cdn.activepieces.com/pieces/apollo.png" 
                          alt="Apollo" 
                          className="h-5 w-5 object-cover"
                         />
                       ) : (typeof plugin.icon === 'string') ? (
                         <img 
                           src={plugin.icon} 
                           alt={plugin.name} 
                           className="h-5 w-5 object-cover"
                         />
                       ) : (
                         plugin.icon && <plugin.icon className="h-5 w-5" style={{ color: plugin.color }} />
                       )}
                    </div>
                    <div>
                      <h3 className="font-medium">{plugin.name}</h3>
                      <p className="text-sm text-muted-foreground">{plugin.description}</p>
                    </div>
                  </button>
                ))}
                
                {filteredPlugins.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No nodes found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
