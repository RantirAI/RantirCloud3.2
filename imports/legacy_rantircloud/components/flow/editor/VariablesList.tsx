
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, File, Database, List, Hash, Type } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataContextManager } from '@/lib/data-context';
import { useNodeAliases } from '@/hooks/useNodeAliases';

interface VariablesListProps {
  variables: { [key: string]: any };
  onSelectVariable?: (variableName: string) => void;
  compact?: boolean;
  connectedNodeIds?: string[];
  showLiveData?: boolean;
}

export function VariablesList({ 
  variables, 
  onSelectVariable,
  compact = false,
  connectedNodeIds = [],
  showLiveData = true
}: VariablesListProps) {
  const { formatForDisplay } = useNodeAliases();
  
  // Make sure variables is never null or undefined
  const safeVariables = variables || {};
  
  // Get live data from connected nodes
  const liveDataSuggestions = showLiveData ? 
    dataContextManager.generateVariableSuggestions(connectedNodeIds) : [];
  
  if (Object.keys(safeVariables).length === 0 && liveDataSuggestions.length === 0) {
    return compact ? null : (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Available Variables</h3>
        <div className="text-sm text-muted-foreground">
          No variables available from previous nodes
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-6" : "mt-4"}>
      <h3 className="text-sm font-medium mb-2">Available Variables</h3>
      
      {/* Live Data from Connected Nodes */}
      {liveDataSuggestions.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Database className="h-3 w-3 text-green-600" />
              Live Data (From Test Runs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={compact ? "h-[120px]" : "max-h-[200px]"}>
              <div className="p-2 space-y-1">
                {liveDataSuggestions.map((suggestion, index) => (
                  <LiveVariableItem
                    key={`live-${index}`}
                    suggestion={suggestion}
                    onSelect={onSelectVariable ? () => onSelectVariable(suggestion.value) : undefined}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Regular Variables */}
      {Object.keys(safeVariables).length > 0 && (
        <div className="border rounded">
          <ScrollArea className={compact ? "h-[120px]" : "max-h-[300px]"}>
            <div className="p-2">
              {Object.keys(safeVariables).map((variableName) => (
                <VariableItem
                  key={variableName}
                  name={variableName}
                  value={safeVariables[variableName]}
                  onSelect={onSelectVariable ? () => onSelectVariable(variableName) : undefined}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

interface LiveVariableItemProps {
  suggestion: {
    label: string;
    value: string;
    description?: string;
    sample?: any;
    type?: string;
  };
  onSelect?: () => void;
}

function LiveVariableItem({ suggestion, onSelect }: LiveVariableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatForDisplay } = useNodeAliases();

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'array': return <List className="h-3 w-3 text-blue-500" />;
      case 'object': return <Database className="h-3 w-3 text-purple-500" />;
      case 'number': return <Hash className="h-3 w-3 text-green-500" />;
      case 'string': return <Type className="h-3 w-3 text-orange-500" />;
      default: return <File className="h-3 w-3 text-gray-400" />;
    }
  };

  const renderSampleValue = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      return value.length > 30 ? `"${value.substring(0, 30)}..."` : `"${value}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      return `{${Object.keys(value).length} properties}`;
    }
    return 'unknown';
  };

  return (
    <div className="border rounded-md p-2 bg-green-50 hover:bg-green-100">
      <div 
        className={`flex items-center justify-between ${onSelect ? 'cursor-pointer' : ''}`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getTypeIcon(suggestion.type)}
          <span className="font-medium text-sm truncate">
            {/* Show human-readable alias instead of node ID */}
            {formatForDisplay(suggestion.label, ' > ')}
          </span>
          {suggestion.type && (
            <Badge variant="outline" className="text-xs">
              {suggestion.type}
            </Badge>
          )}
        </div>
        
        {suggestion.sample !== undefined && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      
      {suggestion.description && (
        <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
      )}
      
      {suggestion.sample !== undefined && (
        <div className="mt-1">
          <span className="text-xs font-medium text-gray-500">Sample: </span>
          <span className="text-xs font-mono text-gray-700">
            {renderSampleValue(suggestion.sample)}
          </span>
        </div>
      )}
      
      {isExpanded && suggestion.sample !== undefined && (
        <div className="mt-2 p-2 bg-background rounded border text-xs font-mono">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(suggestion.sample, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

interface VariableItemProps {
  name: string;
  value: any;
  onSelect?: () => void;
  level?: number;
}

function VariableItem({ name, value, onSelect, level = 0 }: VariableItemProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = () => {
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    if (value === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="text-green-600">"{value}"</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }
    
    if (isArray) {
      return <span className="text-gray-500">Array[{value.length}]</span>;
    }
    
    if (isObject) {
      return <span className="text-gray-500">Object{'{...}'}</span>;
    }
    
    return <span>{String(value)}</span>;
  };
  
  return (
    <div className="text-sm" style={{ paddingLeft: `${level * 12}px` }}>
      <div 
        className={`flex items-center py-1 ${onSelect ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={onSelect}
      >
        {(isObject || isArray) ? (
          <div className="mr-1 cursor-pointer" onClick={toggleExpand}>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
            )}
          </div>
        ) : (
          <File className="h-3.5 w-3.5 mr-1 text-gray-400" />
        )}
        
        <div className="flex-1 flex items-center justify-between">
          <span className="font-medium">{name.split('.').pop()}</span>
          <div className="flex items-center">
            {renderValue()}
            {onSelect && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 ml-2 text-xs opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                Use
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (isObject || isArray) && value && (
        <div>
          {isArray ? (
            // Render array items
            value.slice(0, 5).map((item: any, index: number) => (
              <VariableItem
                key={index}
                name={`[${index}]`}
                value={item}
                level={level + 1}
              />
            ))
          ) : (
            // Render object properties
            Object.entries(value).slice(0, 5).map(([key, val]) => (
              <VariableItem
                key={key}
                name={key}
                value={val}
                level={level + 1}
              />
            ))
          )}
          {((isArray && value.length > 5) || (isObject && Object.keys(value).length > 5)) && (
            <div className="text-xs text-gray-500 pl-4">
              ... and more items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
