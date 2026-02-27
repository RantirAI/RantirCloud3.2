
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, ChevronDown, ChevronRight, Braces, ListTree, Type, Variable } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNodeAliases } from '@/hooks/useNodeAliases';

interface AvailableVariable {
  label: string;
  value: string;
  description?: string;
  type?: string;
  nodeIcon?: string;
}

interface JsonBuilderProps {
  initialValue: any;
  availableVariables: AvailableVariable[] | Record<string, any>;
  onChange: (value: any) => void;
}

type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'variable';

interface JsonNode {
  id: string;
  key: string;
  type: JsonNodeType;
  value: any;
  isVariable?: boolean;
  variablePath?: string;
  children?: JsonNode[];
  expanded?: boolean;
}

export function VisualJsonBuilder({ initialValue, availableVariables, onChange }: JsonBuilderProps) {
  const [jsonTree, setJsonTree] = useState<JsonNode[]>([]);
  const [activeTab, setActiveTab] = useState<string>("builder");
  const [rawJson, setRawJson] = useState<string>("");
  
  // Initialize JSON tree from initial value
  useEffect(() => {
    if (initialValue) {
      try {
        const value = typeof initialValue === 'string' 
          ? JSON.parse(initialValue) 
          : initialValue;
        
        const parsed = parseJsonToTree(value);
        setJsonTree(parsed);
        setRawJson(JSON.stringify(value, null, 2));
      } catch (error) {
        console.error('Error parsing initial JSON:', error);
        setJsonTree([createDefaultNode('root', 'object')]);
        setRawJson("{}");
      }
    } else {
      setJsonTree([createDefaultNode('root', 'object')]);
      setRawJson("{}");
    }
  }, [initialValue]);
  
  // Generate unique node ID
  const generateNodeId = () => {
    return `node_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Create default node based on type
  const createDefaultNode = (key: string, type: JsonNodeType): JsonNode => {
    switch (type) {
      case 'object':
        return {
          id: generateNodeId(),
          key,
          type,
          value: {},
          expanded: true,
          children: []
        };
      case 'array':
        return {
          id: generateNodeId(),
          key,
          type,
          value: [],
          expanded: true,
          children: []
        };
      case 'string':
        return {
          id: generateNodeId(),
          key,
          type,
          value: '',
          isVariable: false
        };
      case 'number':
        return {
          id: generateNodeId(),
          key,
          type,
          value: 0
        };
      case 'boolean':
        return {
          id: generateNodeId(),
          key,
          type,
          value: false
        };
      case 'null':
        return {
          id: generateNodeId(),
          key,
          type,
          value: null
        };
      case 'variable':
        return {
          id: generateNodeId(),
          key,
          type: 'variable',
          value: '',
          isVariable: true,
          variablePath: ''
        };
      default:
        return {
          id: generateNodeId(),
          key: 'string',
          type: 'string',
          value: ''
        };
    }
  };
  
  // Parse JSON object to tree structure
  const parseJsonToTree = (json: any, parentKey = 'root'): JsonNode[] => {
    if (json === null || json === undefined) {
      return [createDefaultNode(parentKey, 'null')];
    }
    
    if (Array.isArray(json)) {
      const arrayNode = createDefaultNode(parentKey, 'array');
      arrayNode.children = json.map((item, index) => 
        parseJsonToTree(item, index.toString())[0]
      );
      return [arrayNode];
    }
    
    if (typeof json === 'object') {
      const objNode = createDefaultNode(parentKey, 'object');
      objNode.children = Object.entries(json).map(([key, value]) => {
        // Check if this is a variable reference
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          const varNode = createDefaultNode(key, 'variable');
          varNode.isVariable = true;
          varNode.variablePath = value.slice(2, -2);
          varNode.value = value;
          return varNode;
        }
        return parseJsonToTree(value, key)[0];
      });
      return [objNode];
    }
    
    // Handle primitive types
    let type: JsonNodeType;
    if (typeof json === 'string') {
      // Check if this is a variable reference
      if (json.startsWith('{{') && json.endsWith('}}')) {
        const varNode = createDefaultNode(parentKey, 'variable');
        varNode.isVariable = true;
        varNode.variablePath = json.slice(2, -2);
        varNode.value = json;
        return [varNode];
      }
      type = 'string';
    } else {
      type = typeof json as JsonNodeType;
    }
    
    const node = createDefaultNode(parentKey, type);
    node.value = json;
    return [node];
  };
  
  // Convert tree structure back to JSON
  const treeToJson = (nodes: JsonNode[]): any => {
    if (!nodes || nodes.length === 0) return {};
    
    const rootNode = nodes[0];
    return nodeToValue(rootNode);
  };
  
  // Convert a single node to its JSON value
  const nodeToValue = (node: JsonNode): any => {
    if (node.type === 'variable' && node.variablePath) {
      return `{{${node.variablePath}}}`; // Return variable path with template syntax
    }
    
    switch (node.type) {
      case 'object':
        const obj = {};
        node.children?.forEach(child => {
          obj[child.key] = nodeToValue(child);
        });
        return obj;
      
      case 'array':
        return node.children?.map(child => nodeToValue(child)) || [];
      
      case 'number':
        return Number(node.value);
      
      case 'boolean':
        return Boolean(node.value);
      
      case 'null':
        return null;
      
      default:
        return node.value;
    }
  };
  
  // Update the tree when changes are made and notify parent component
  const updateTree = (newTree: JsonNode[]) => {
    setJsonTree(newTree);
    const jsonValue = treeToJson(newTree);
    onChange(jsonValue);
    setRawJson(JSON.stringify(jsonValue, null, 2));
  };
  
  // Toggle node expansion
  const toggleNodeExpanded = (nodeId: string) => {
    const updateNodeExpanded = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return {
            ...node,
            children: updateNodeExpanded(node.children)
          };
        }
        return node;
      });
    };
    
    updateTree(updateNodeExpanded(jsonTree));
  };
  
  // Add child node
  const addChildNode = (parentNodeId: string, type: JsonNodeType) => {
    const addChildToNode = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === parentNodeId) {
          let newKey = '';
          
          if (node.type === 'object') {
            newKey = `key${node.children?.length || 0}`;
          } else if (node.type === 'array') {
            newKey = `${node.children?.length || 0}`;
          }
          
          const newChild = createDefaultNode(newKey, type);
          
          return {
            ...node,
            children: [...(node.children || []), newChild],
            expanded: true
          };
        }
        
        if (node.children) {
          return {
            ...node,
            children: addChildToNode(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(addChildToNode(jsonTree));
  };
  
  // Remove node
  const removeNode = (nodeId: string, parentNodeId?: string) => {
    if (!parentNodeId) {
      // Can't remove root
      return;
    }
    
    const removeNodeFromParent = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === parentNodeId) {
          return {
            ...node,
            children: node.children?.filter(child => child.id !== nodeId) || []
          };
        }
        
        if (node.children) {
          return {
            ...node,
            children: removeNodeFromParent(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(removeNodeFromParent(jsonTree));
  };
  
  // Update node key with focus preservation
  const updateNodeKey = (nodeId: string, newKey: string) => {
    const updateNodeInTree = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, key: newKey };
        }
        
        if (node.children) {
          return {
            ...node,
            children: updateNodeInTree(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(updateNodeInTree(jsonTree));
  };
  
  // Update node value
  const updateNodeValue = (nodeId: string, newValue: any) => {
    const updateNodeInTree = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { 
            ...node, 
            value: newValue
          };
        }
        
        if (node.children) {
          return {
            ...node,
            children: updateNodeInTree(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(updateNodeInTree(jsonTree));
  };

  // Set node as variable reference
  const setNodeAsVariable = (nodeId: string, variablePath: string) => {
    const updateNodeInTree = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { 
            ...node, 
            type: 'variable',
            isVariable: true,
            variablePath,
            value: `{{${variablePath}}}`
          };
        }
        
        if (node.children) {
          return {
            ...node,
            children: updateNodeInTree(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(updateNodeInTree(jsonTree));
  };
  
  // Update node type
  const updateNodeType = (nodeId: string, newType: JsonNodeType) => {
    const updateNodeInTree = (nodes: JsonNode[]): JsonNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          // Create a new node with the same key but different type
          const newNode = createDefaultNode(node.key, newType);
          newNode.id = node.id; // Keep same ID
          
          // If changing to object/array, don't lose children if already object/array
          if ((newType === 'object' || newType === 'array') && 
              (node.type === 'object' || node.type === 'array')) {
            newNode.children = node.children;
          }
          
          // If changing from variable to something else, reset variable flags
          if (node.type === 'variable') {
            newNode.isVariable = false;
            newNode.variablePath = undefined;
          }
          
          return newNode;
        }
        
        if (node.children) {
          return {
            ...node,
            children: updateNodeInTree(node.children)
          };
        }
        
        return node;
      });
    };
    
    updateTree(updateNodeInTree(jsonTree));
  };
  
  // Handle direct JSON editing
  const handleRawJsonChange = (newJsonString: string) => {
    setRawJson(newJsonString);
    try {
      const parsed = JSON.parse(newJsonString);
      const newTree = parseJsonToTree(parsed);
      setJsonTree(newTree);
      onChange(parsed);
    } catch (error) {
      // Don't update on invalid JSON, but also don't show error
      // We'll validate when they try to save
    }
  };
  

  // Prevent propagation helper for form controls
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };

  // Render a node and its children recursively
  const renderNode = (node: JsonNode, depth = 0, parentNodeId?: string) => {
    const isExpandable = node.type === 'object' || node.type === 'array';
    const isRoot = depth === 0;
    
    return (
      <div key={node.id} className="json-builder-node mb-2" style={{ marginLeft: isRoot ? 0 : 12 }}>
        <div className={cn(
          "flex items-center py-1 rounded hover:bg-muted transition-colors",
          !isRoot && "group"
        )}>
          {isExpandable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpanded(node.id);
              }}
            >
              {node.expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {!isRoot && (
            <>
              <div className="flex items-center flex-shrink-0">
                {node.type === 'object' ? (
                  <Braces className="h-4 w-4 text-blue-500 mr-1" />
                ) : node.type === 'array' ? (
                  <ListTree className="h-4 w-4 text-green-500 mr-1" />
                ) : node.type === 'variable' ? (
                  <Variable className="h-4 w-4 text-indigo-500 mr-1" />
                ) : (
                  <Type className="h-4 w-4 text-violet-500 mr-1" />
                )}
              </div>
              
              <div className="flex-shrink-0 mr-2">
                <Input
                  className="w-24 h-7 px-2 text-xs border-border focus:border-primary"
                  value={node.key}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                  onFocus={stopPropagation}
                  onChange={(e) => {
                    updateNodeKey(node.id, e.target.value);
                  }}
                />
              </div>
              <span className="mx-1 flex-shrink-0">:</span>
            </>
          )}
          
          {/* Value input based on type */}
          {node.type === 'string' && !node.isVariable && (
            <Input
              className="h-7 text-xs flex-grow min-w-0"
              value={node.value}
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              onFocus={stopPropagation}
              onChange={(e) => updateNodeValue(node.id, e.target.value)}
            />
          )}
          
          {node.type === 'variable' && (
            <VariableBoundBadge 
              variablePath={node.variablePath || ''} 
              onUnbind={() => updateNodeType(node.id, 'string')}
            />
          )}
          
          {node.type === 'number' && (
            <Input
              className="w-24 h-7 px-2 text-xs flex-shrink-0"
              type="number"
              value={node.value}
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              onFocus={stopPropagation}
              onChange={(e) => updateNodeValue(node.id, e.target.value)}
            />
          )}
          
          {node.type === 'boolean' && (
            <Select
              value={String(node.value)}
              onValueChange={(val) => updateNodeValue(node.id, val === 'true')}
            >
              <SelectTrigger 
                className="w-24 h-7 text-xs flex-shrink-0" 
                onClick={stopPropagation} 
                onMouseDown={stopPropagation}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {node.type === 'null' && (
            <span className="text-muted-foreground text-xs flex-shrink-0">null</span>
          )}
          
          {/* Type selector */}
          {!isRoot && (
            <Select
              value={node.type}
              onValueChange={(val) => updateNodeType(node.id, val as JsonNodeType)}
            >
              <SelectTrigger 
                className="ml-2 h-7 w-24 text-xs flex-shrink-0" 
                onClick={stopPropagation} 
                onMouseDown={stopPropagation}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="object">object</SelectItem>
                <SelectItem value="array">array</SelectItem>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="null">null</SelectItem>
                <SelectItem value="variable">variable</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Variable selector button */}
          {(node.type === 'string' || node.type === 'variable') && (
            <VariableSelector 
              variables={availableVariables} 
              onSelect={(path) => setNodeAsVariable(node.id, path)} 
            />
          )}
          
          {/* Remove button */}
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-destructive ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                removeNode(node.id, parentNodeId);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Render children if expanded */}
        {isExpandable && node.expanded && (
          <div className="pl-3 border-l border-border ml-2.5 mt-1">
            {node.children?.map(childNode => 
              renderNode(childNode, depth + 1, node.id)
            )}
            
            {/* Add button at the end of children list */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 mt-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                addChildNode(node.id, node.type === 'object' ? 'string' : 'string');
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              <span>
                Add {node.type === 'object' ? 'Property' : 'Item'}
              </span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Get the alias hook for human-readable display
  const { formatForDisplay, registry } = useNodeAliases();

  // Convert raw JSON with node IDs to human-readable display format
  const getDisplayRawJson = (json: string): string => {
    return json.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const aliasPath = registry.nodeIdToAliasPath(innerPath);
      return `{{${aliasPath}}}`;
    });
  };

  // Convert human-readable display format back to node IDs for storage
  const getStorageRawJson = (displayJson: string): string => {
    return displayJson.replace(/\{\{([^}]+)\}\}/g, (match, innerPath) => {
      if (innerPath.startsWith('env.') || !innerPath.includes('.')) {
        return match;
      }
      const nodeIdPath = registry.aliasToNodeIdPath(innerPath);
      return nodeIdPath ? `{{${nodeIdPath}}}` : match;
    });
  };

  return (
    <div className="visual-json-builder h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <TabsList className="h-8">
            <TabsTrigger value="builder" className="text-xs px-3">Visual Builder</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs px-3">Raw JSON</TabsTrigger>
          </TabsList>
          
          <Button 
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              try {
                const json = treeToJson(jsonTree);
                onChange(json);
                toast.success('JSON structure saved');
              } catch (error) {
                toast.error('Invalid JSON structure');
              }
            }}
          >
            Save
          </Button>
        </div>
        
        <TabsContent value="builder" className="mt-0 flex-1 min-h-0">
          <ScrollArea className="h-full border rounded-md bg-muted/30 p-2">
            <div className="p-2">
              {jsonTree.map(node => renderNode(node))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="raw" className="mt-0 flex-1 min-h-0 flex flex-col">
          <textarea
            className="flex-1 w-full p-3 font-mono text-xs bg-muted/30 text-foreground resize-none focus:outline-none leading-relaxed border rounded-md"
            value={getDisplayRawJson(rawJson)}
            onChange={(e) => handleRawJsonChange(getStorageRawJson(e.target.value))}
            placeholder="{}"
            spellCheck={false}
          />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}

// Compact bound variable badge with human-readable names
function VariableBoundBadge({ variablePath, onUnbind }: { variablePath: string; onUnbind: () => void }) {
  const { formatForDisplay } = useNodeAliases();
  
  // Convert nodeId.field to human-readable format
  const displayName = React.useMemo(() => {
    return formatForDisplay(variablePath, ' → ');
  }, [variablePath, formatForDisplay]);
  
  return (
    <div className="flex items-center gap-1.5 flex-grow min-w-0">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 min-w-0 flex-1">
        <Variable className="h-3 w-3 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary truncate">{displayName}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onUnbind();
        }}
        title="Unbind variable"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Helper to generate a friendly name from a path
function generateFriendlyName(path: string): string {
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1] || path;
  const cleanPart = lastPart.replace(/\[\d+\]/g, '');
  
  return cleanPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper to infer type from value
function inferTypeFromValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

// Variable selector with enhanced design matching AvailableVariablesPanel
function VariableSelector({ variables, onSelect }: { 
  variables: AvailableVariable[] | Record<string, any>; 
  onSelect: (path: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { formatForDisplay } = useNodeAliases();
  
  // Normalize variables to enhanced format with all metadata
  const normalizedVariables = React.useMemo(() => {
    if (Array.isArray(variables)) {
      return variables.map(v => ({
        ...v,
        friendlyName: v.label?.includes('node-') || v.label?.includes('.') 
          ? generateFriendlyName(v.value || v.label)
          : v.label || generateFriendlyName(v.value),
        sourceNode: formatForDisplay(v.value, ' > ').split(' > ')[0] || 'Unknown',
        inferredType: v.type || 'unknown'
      }));
    }
    
    // Handle Record<string, any> format (key is the variable path, value is the actual data)
    return Object.entries(variables).map(([key, val]) => {
      const displayParts = formatForDisplay(key, ' > ').split(' > ');
      const sourceNode = displayParts[0] || 'Unknown';
      const fieldPath = displayParts.slice(1).join('.') || key;
      
      return {
        label: key,
        value: key,
        friendlyName: generateFriendlyName(fieldPath),
        sourceNode,
        inferredType: inferTypeFromValue(val),
        description: typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val).slice(0, 50)
      };
    });
  }, [variables, formatForDisplay]);
  
  // Filter variables by search
  const filteredVariables = React.useMemo(() => {
    if (!search.trim()) return normalizedVariables;
    const lower = search.toLowerCase();
    return normalizedVariables.filter(v => 
      v.friendlyName?.toLowerCase().includes(lower) || 
      v.sourceNode?.toLowerCase().includes(lower) ||
      v.label?.toLowerCase().includes(lower) ||
      v.value?.toLowerCase().includes(lower)
    );
  }, [normalizedVariables, search]);
  
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
  
  const extractPath = (value: string) => {
    if (value.startsWith('{{') && value.endsWith('}}')) {
      return value.slice(2, -2);
    }
    return value;
  };
  
  return (
    <div className="relative ml-1.5 flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] px-2"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Variable className="h-3 w-3 mr-1" />
        Bind
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 right-0 mt-1 w-72 bg-popover rounded-lg shadow-lg border overflow-hidden">
          {/* Header with search */}
          <div className="px-2 py-1.5 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Variables</span>
              <span className="text-[10px] text-muted-foreground">{filteredVariables.length}</span>
            </div>
            <Input
              className="h-6 text-[11px] bg-background/50"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
            />
          </div>
          
          <ScrollArea className="max-h-[280px]">
            {filteredVariables.length > 0 ? (
              <div className="p-1 space-y-px">
                {filteredVariables.map((variable, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors group"
                    onClick={(e) => {
                      stopPropagation(e);
                      onSelect(extractPath(variable.value));
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {/* Top row: Friendly name + type badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-medium text-foreground truncate flex-1">
                        {variable.friendlyName}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                        {variable.inferredType}
                      </span>
                    </div>
                    
                    {/* Bottom row: Source node */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Variable className="h-2.5 w-2.5 text-primary/60 flex-shrink-0" />
                      <span className="text-[9px] text-muted-foreground truncate">
                        {variable.sourceNode}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[10px] text-muted-foreground">
                {search ? `No matches for "${search}"` : 'No variables available'}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
