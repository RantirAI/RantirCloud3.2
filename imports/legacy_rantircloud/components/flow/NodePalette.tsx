import { Button } from "@/components/ui/button";
import { nodeRegistry } from "@/lib/node-registry";
import { Input } from "@/components/ui/input";
import { useFlowStore } from "@/lib/flow-store";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useUserNodeInstallations } from "@/hooks/useUserNodeInstallations";
import { LogoIcon } from './LogoIcon';
import { isCoreNode } from "@/lib/coreNodeTypes";
import { NodePlugin } from "@/types/node-plugin";

// Extended plugin type that can carry a DB icon override
interface PaletteEntry extends NodePlugin {
  paletteKey: string; // unique key for rendering
  dbIcon?: string; // icon URL/data URI from integrations DB
  isInstalledIntegration?: boolean;
}

export function NodePalette() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { addNode, setIsDragInProgress } = useFlowStore();
  
  // Get user installations to force refresh when they change
  const { installedNodeTypes, userNodeIntegrations, refreshInstallations } = useUserNodeInstallations();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Force node registry to re-filter based on current installations
  useEffect(() => {
    console.log("NodePalette: User installed node types changed:", installedNodeTypes);
    console.log("NodePalette: Available plugins before registration:", nodeRegistry.getAllPlugins().map(p => p.type));
    nodeRegistry.registerConditionally(installedNodeTypes);
    console.log("NodePalette: Available plugins after registration:", nodeRegistry.getAllPlugins().map(p => p.type));
    setRefreshTrigger(prev => prev + 1); // Force re-render
  }, [installedNodeTypes]);

  // Listen for installation changes and force immediate refresh
  useEffect(() => {
    const handleInstallationChange = async (event: CustomEvent) => {
      console.log("NodePalette: Received installation change event", event.detail);
      
      // Refresh installations data first and get latest
      await refreshInstallations();
      const latestInstalled = (typeof window !== 'undefined' && window.flowUserNodeInstallations)
        ? window.flowUserNodeInstallations.installedNodeTypes
        : installedNodeTypes;
      
      // Re-register nodes to immediately reflect changes
      nodeRegistry.registerConditionally(latestInstalled);
      
      // Force component re-render
      setRefreshTrigger(prev => prev + 1);
    };

    const handleRegistryUpdated = () => {
      console.log('NodePalette: nodeRegistryUpdated received');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('nodeInstallationChanged', handleInstallationChange as EventListener);
    window.addEventListener('nodeRegistryUpdated', handleRegistryUpdated);
    return () => {
      window.removeEventListener('nodeInstallationChanged', handleInstallationChange as EventListener);
      window.removeEventListener('nodeRegistryUpdated', handleRegistryUpdated);
    };
  }, [installedNodeTypes, refreshInstallations]);

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
    setIsDragInProgress(true); // Set global drag state
  };

  const handleDragEnd = () => {
    setIsDragInProgress(false); // Clear global drag state
  };

  const handleNodeAdd = (type: string) => {
    const plugin = nodeRegistry.getPlugin(type);
    if (!plugin) return;

    const { nodes } = useFlowStore.getState();
    
    // Find the last node in the chain to connect to
    let lastNode: any = null;
    if (nodes.length > 0) {
      // Find the node with no outgoing edges (the end of the chain)
      const { edges } = useFlowStore.getState();
      lastNode = nodes.find(node => 
        !edges.some(edge => edge.source === node.id)
      ) || nodes[nodes.length - 1]; // fallback to last node
    }

    const newNodeId = `node-${Date.now()}`;
    // Determine the React Flow node type based on the plugin type
    const getNodeType = (pluginType: string) => {
      if (pluginType === 'condition') return 'conditional';
      if (pluginType === 'for-each-loop') return 'for-each-loop';
      return 'custom';
    };

    const newNode = {
      id: newNodeId,
      type: getNodeType(type),
      position: { 
        x: 400, 
        y: lastNode ? lastNode.position.y + 150 : 100 
      },
      data: {
        label: plugin.name,
        type: type,
        category: plugin.category,
        inputs: {},
        color: plugin.color,
        isFirstNode: nodes.length === 0,
      }
    };

    addNode(newNode);
    
    // Auto-connect to the last node if exists
    if (lastNode) {
      const { onConnect } = useFlowStore.getState();
      onConnect({
        source: lastNode.id,
        target: newNodeId,
      });
    }
  };

  // Get all available node plugins + installed integration duplicates
  const allPlugins: PaletteEntry[] = useMemo(() => {
    const registryPlugins: PaletteEntry[] = nodeRegistry.getAllPlugins().map(p => {
      // Check if there's a DB icon for this node type from installed integrations
      const matchingIntegration = userNodeIntegrations.find(ni => ni.nodeType === p.type);
      return {
        ...p,
        paletteKey: p.type,
        dbIcon: matchingIntegration?.icon || undefined,
      };
    });

    // Add installed integrations that overlap with core nodes as additional entries
    const installedCoreOverlaps: PaletteEntry[] = userNodeIntegrations
      .filter(ni => ni.nodeType && isCoreNode(ni.nodeType))
      .map(ni => {
        const corePlugin = nodeRegistry.getPlugin(ni.nodeType!);
        if (!corePlugin) return null;
        return {
          ...corePlugin,
          paletteKey: `${ni.nodeType}-installed`,
          name: corePlugin.name,
          dbIcon: ni.icon || undefined,
          isInstalledIntegration: true,
        };
      })
      .filter(Boolean) as PaletteEntry[];

    return [...registryPlugins, ...installedCoreOverlaps];
  }, [refreshTrigger, userNodeIntegrations]);

  // Filter plugins based on search and active category
  const filteredPlugins = allPlugins.filter(plugin => {
    const matchesSearch = 
      search === '' || 
      plugin.name.toLowerCase().includes(search.toLowerCase()) ||
      plugin.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = 
      activeCategory === "all" || 
      plugin.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories for the tabs
  const categories = useMemo(() => ['all', ...Array.from(new Set(allPlugins.map(p => p.category)))], [allPlugins]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Fixed header section */}
      <div className="p-4 pb-0 shrink-0">
        <h2 className="font-semibold">Add Nodes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drag nodes from here to the canvas or click to add them
        </p>
        
        <Input 
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <div className="mb-4 overflow-x-auto p-1">
            <TabsList className="w-fit flex whitespace-nowrap px-2 py-1 h-auto gap-1">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="capitalize flex-shrink-0">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>
      
      {/* Scrollable content with hover-reveal scrollbar */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" scrollbarVariant="hover-show">
          <div className="p-4 pt-0 space-y-2">
          {filteredPlugins.map(plugin => (
            <HoverCard key={plugin.paletteKey} openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left p-3 h-auto shadow-sm hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, plugin.type)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleNodeAdd(plugin.type)}
                >
                  <div className="flex items-start gap-3 w-full min-w-0">
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm border border-border"
                      style={{ backgroundColor: plugin.type === 'firecrawl' ? '#ff660030' : `${plugin.color}20` }}
                    >
                      {plugin.dbIcon ? (
                        <LogoIcon 
                          icon={plugin.dbIcon} 
                          alt={plugin.name} 
                          size="md"
                          color={plugin.color}
                        />
                      ) : plugin.type === 'firecrawl' ? (
                        <svg fill="none" height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
                            fill="#FF6600"
                          />
                        </svg>
                      ) : plugin.type === 'snowflake' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" role="img" aria-label="Snowflake mark">
                          <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="m27 12.094-3.3 1.908 3.3 1.902a1.739 1.739 0 1 1-1.737 3.012l-5.911-3.412a1.718 1.718 0 0 1-.79-.993 1.7 1.7 0 0 1-.078-.565c.004-.137.024-.274.06-.411a1.75 1.75 0 0 1 .806-1.045l5.909-3.408a1.737 1.737 0 0 1 2.373.638A1.73 1.73 0 0 1 27 12.093Zm-3.125 9.246-5.906-3.406a1.708 1.708 0 0 0-1.007-.228 1.735 1.735 0 0 0-1.608 1.734v6.82a1.739 1.739 0 1 0 3.477 0v-3.815l3.307 1.909a1.734 1.734 0 0 0 2.374-.634 1.744 1.744 0 0 0-.637-2.38Zm-6.816-6.672-2.456 2.453a.486.486 0 0 1-.308.13H13.574a.495.495 0 0 1-.308-.13l-2.456-2.453a.492.492 0 0 1-.127-.306V13.64c0-.1.056-.239.127-.31l2.454-2.452a.492.492 0 0 1 .308-.128H14.295c.1 0 .237.056.308.128l2.456 2.453c.07.07.127.209.127.31v.722a.501.501 0 0 1-.127.306Zm-1.963-.68a.517.517 0 0 0-.131-.31l-.71-.709a.5.5 0 0 0-.309-.129h-.028a.494.494 0 0 0-.306.13l-.71.708a.51.51 0 0 0-.125.31v.028c0 .099.054.236.124.306l.711.71c.07.071.207.13.306.13h.028a.504.504 0 0 0 .308-.13l.711-.71a.5.5 0 0 0 .13-.306v-.028ZM3.993 6.656l5.909 3.41c.318.183.67.256 1.008.228a1.74 1.74 0 0 0 1.609-1.736v-6.82a1.739 1.739 0 0 0-3.477 0v3.816l-3.31-1.912a1.74 1.74 0 0 0-1.74 3.014Zm12.97 3.638a1.72 1.72 0 0 0 1.006-.228l5.906-3.41a1.742 1.742 0 0 0 .637-2.378 1.738 1.738 0 0 0-2.374-.636L18.83 5.555V1.736a1.738 1.738 0 0 0-3.476 0v6.821a1.737 1.737 0 0 0 1.608 1.736Zm-6.053 7.412a1.708 1.708 0 0 0-1.008.228l-5.91 3.406a1.745 1.745 0 0 0-.635 2.38 1.738 1.738 0 0 0 2.373.634l3.31-1.909v3.816a1.737 1.737 0 1 0 3.477 0V19.44a1.734 1.734 0 0 0-1.607-1.734Zm-1.602-3.195c.058-.185.082-.376.078-.565a1.733 1.733 0 0 0-.872-1.456L2.61 9.082a1.736 1.736 0 0 0-2.374.638 1.733 1.733 0 0 0 .636 2.373l3.3 1.909L.87 15.904a1.739 1.739 0 1 0 1.738 3.012l5.905-3.412c.4-.228.67-.588.795-.993Z"/>
                        </svg>
                      ) : (typeof plugin.icon === 'string') ? (
                        <LogoIcon 
                          icon={plugin.icon} 
                          alt={plugin.name} 
                          size="md"
                          color={plugin.color}
                        />
                      ) : plugin.icon ? (
                        <plugin.icon className="h-4 w-4" style={{ color: plugin.color === '#000000' ? 'currentColor' : plugin.color }} />
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: plugin.color }}>{plugin.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <span className="font-medium block truncate">{plugin.name}</span>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-full">{plugin.description}</p>
                    </div>
                  </div>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm border border-border"
                      style={{ backgroundColor: plugin.type === 'firecrawl' ? '#ff660030' : `${plugin.color}20` }}
                    >
                      {plugin.type === 'firecrawl' ? (
                        <svg fill="none" height="14" viewBox="0 0 20 20" width="14" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
                            fill="#FF6600"
                          />
                        </svg>
                      ) : plugin.type === 'snowflake' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="14" height="14" role="img" aria-label="Snowflake mark">
                          <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="m27 12.094-3.3 1.908 3.3 1.902a1.739 1.739 0 1 1-1.737 3.012l-5.911-3.412a1.718 1.718 0 0 1-.79-.993 1.7 1.7 0 0 1-.078-.565c.004-.137.024-.274.06-.411a1.75 1.75 0 0 1 .806-1.045l5.909-3.408a1.737 1.737 0 0 1 2.373.638A1.73 1.73 0 0 1 27 12.093Zm-3.125 9.246-5.906-3.406a1.708 1.708 0 0 0-1.007-.228 1.735 1.735 0 0 0-1.608 1.734v6.82a1.739 1.739 0 1 0 3.477 0v-3.815l3.307 1.909a1.734 1.734 0 0 0 2.374-.634 1.744 1.744 0 0 0-.637-2.38Zm-6.816-6.672-2.456 2.453a.486.486 0 0 1-.308.13H13.574a.495.495 0 0 1-.308-.13l-2.456-2.453a.492.492 0 0 1-.127-.306V13.64c0-.1.056-.239.127-.31l2.454-2.452a.492.492 0 0 1 .308-.128H14.295c.1 0 .237.056.308.128l2.456 2.453c.07.07.127.209.127.31v.722a.501.501 0 0 1-.127.306Zm-1.963-.68a.517.517 0 0 0-.131-.31l-.71-.709a.5.5 0 0 0-.309-.129h-.028a.494.494 0 0 0-.306.13l-.71.708a.51.51 0 0 0-.125.31v.028c0 .099.054.236.124.306l.711.71c.07.071.207.13.306.13h.028a.504.504 0 0 0 .308-.13l.711-.71a.5.5 0 0 0 .13-.306v-.028ZM3.993 6.656l5.909 3.41c.318.183.67.256 1.008.228a1.74 1.74 0 0 0 1.609-1.736v-6.82a1.739 1.739 0 0 0-3.477 0v3.816l-3.31-1.912a1.74 1.74 0 0 0-1.74 3.014Zm12.97 3.638a1.72 1.72 0 0 0 1.006-.228l5.906-3.41a1.742 1.742 0 0 0 .637-2.378 1.738 1.738 0 0 0-2.374-.636L18.83 5.555V1.736a1.738 1.738 0 0 0-3.476 0v6.821a1.737 1.737 0 0 0 1.608 1.736Zm-6.053 7.412a1.708 1.708 0 0 0-1.008.228l-5.91 3.406a1.745 1.745 0 0 0-.635 2.38 1.738 1.738 0 0 0 2.373.634l3.31-1.909v3.816a1.737 1.737 0 1 0 3.477 0V19.44a1.734 1.734 0 0 0-1.607-1.734Zm-1.602-3.195c.058-.185.082-.376.078-.565a1.733 1.733 0 0 0-.872-1.456L2.61 9.082a1.736 1.736 0 0 0-2.374.638 1.733 1.733 0 0 0 .636 2.373l3.3 1.909L.87 15.904a1.739 1.739 0 1 0 1.738 3.012l5.905-3.412c.4-.228.67-.588.795-.993Z"/>
                        </svg>
                      ) : (typeof plugin.icon === 'string') ? (
                        <LogoIcon 
                          icon={plugin.icon} 
                          alt={plugin.name} 
                          size="sm"
                        />
                      ) : plugin.icon ? (
                        <plugin.icon className="h-3.5 w-3.5" style={{ color: plugin.color }} />
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: plugin.color }}>{plugin.name.charAt(0)}</span>
                      )}
                    </div>
                    <h4 className="font-semibold">{plugin.name}</h4>
                  </div>
                  <p className="text-sm line-clamp-3 max-w-full">{plugin.description}</p>
                  
                  {plugin.inputs && plugin.inputs.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium mb-1">Inputs:</h5>
                      <ul className="text-xs space-y-1">
                        {plugin.inputs.slice(0, 3).map((input, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="font-medium whitespace-nowrap">{input.label}</span>
                            {input.description && (
                              <span className="text-muted-foreground line-clamp-1"> - {input.description}</span>
                            )}
                          </li>
                        ))}
                        {plugin.inputs.length > 3 && (
                          <li className="text-muted-foreground">+ {plugin.inputs.length - 3} more inputs</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {plugin.outputs && plugin.outputs.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium mb-1">Outputs:</h5>
                      <ul className="text-xs space-y-1">
                        {plugin.outputs.slice(0, 3).map((output, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="font-medium whitespace-nowrap">{output.name}</span>
                            {output.description && (
                              <span className="text-muted-foreground line-clamp-1"> - {output.description}</span>
                            )}
                          </li>
                        ))}
                        {plugin.outputs.length > 3 && (
                          <li className="text-muted-foreground">+ {plugin.outputs.length - 3} more outputs</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
          
          {filteredPlugins.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No nodes found matching your criteria
            </div>
          )}
        </div>
        </ScrollArea>
      </div>
    </div>
  );
}
