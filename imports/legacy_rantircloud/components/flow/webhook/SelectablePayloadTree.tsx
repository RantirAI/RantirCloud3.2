import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Braces, Hash, ToggleLeft, Type, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SelectablePayloadTreeProps {
  data: any;
  onSelectionChange: (selectedPaths: Set<string>, autoNames: Map<string, string>) => void;
  initialSelection?: Set<string>;
  searchQuery?: string;
}

interface TreeNodeProps {
  keyName: string;
  value: any;
  path: string;
  depth: number;
  selectedPaths: Set<string>;
  onToggle: (path: string, isChecked: boolean, childPaths?: string[]) => void;
  searchQuery?: string;
  parentChecked?: boolean;
}

const getTypeIcon = (value: any) => {
  if (value === null || value === undefined) return <span className="text-muted-foreground">∅</span>;
  if (typeof value === 'string') return <Type className="h-3 w-3 text-emerald-500" />;
  if (typeof value === 'number') return <Hash className="h-3 w-3 text-blue-500" />;
  if (typeof value === 'boolean') return <ToggleLeft className="h-3 w-3 text-amber-500" />;
  if (Array.isArray(value)) return <List className="h-3 w-3 text-purple-500" />;
  if (typeof value === 'object') return <Braces className="h-3 w-3 text-orange-500" />;
  return null;
};

const getTypeLabel = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === 'object') return 'object';
  return typeof value;
};

const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const truncated = value.length > 40 ? value.substring(0, 40) + '...' : value;
    return `"${truncated}"`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return '';
};

// Get all leaf paths from an object/array
function getAllLeafPaths(value: any, currentPath: string): string[] {
  const paths: string[] = [];
  
  if (value === null || value === undefined || typeof value !== 'object') {
    paths.push(currentPath);
    return paths;
  }
  
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      paths.push(...getAllLeafPaths(item, `${currentPath}[${index}]`));
    });
  } else {
    Object.entries(value).forEach(([key, val]) => {
      paths.push(...getAllLeafPaths(val, `${currentPath}.${key}`));
    });
  }
  
  // Also add the current path for objects/arrays in case user wants to select the whole thing
  paths.push(currentPath);
  
  return paths;
}

// Generate a friendly auto-name from a path
function generateAutoName(path: string): string {
  // Extract the last meaningful part of the path
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert to readable name
  // e.g., "customerEmail" -> "Customer Email", "user_id" -> "User Id"
  const readable = lastPart
    .replace(/([A-Z])/g, ' $1') // camelCase
    .replace(/_/g, ' ')        // snake_case
    .replace(/-/g, ' ')        // kebab-case
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize each word
  return readable
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function TreeNode({ keyName, value, path, depth, selectedPaths, onToggle, searchQuery, parentChecked }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const isExpandable = value !== null && typeof value === 'object';
  const isChecked = selectedPaths.has(path);
  
  // Check if all children are selected (for partial state)
  const childPaths = isExpandable ? getAllLeafPaths(value, path) : [];
  const allChildrenSelected = childPaths.length > 0 && childPaths.every(p => selectedPaths.has(p));
  const someChildrenSelected = childPaths.some(p => selectedPaths.has(p));
  
  const handleCheckChange = (checked: boolean) => {
    const pathsToToggle = isExpandable ? getAllLeafPaths(value, path) : [path];
    onToggle(path, checked, pathsToToggle);
  };
  
  const matchesSearch = searchQuery && 
    (keyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())));

  // Determine checkbox state
  const checkboxState = isExpandable 
    ? (allChildrenSelected ? true : (someChildrenSelected ? 'indeterminate' : false))
    : isChecked;

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors",
          matchesSearch && "bg-primary/10 ring-1 ring-primary/30"
        )}
      >
        <Checkbox
          checked={checkboxState === 'indeterminate' ? 'indeterminate' : checkboxState}
          onCheckedChange={(checked) => handleCheckChange(checked === true)}
          className="h-3.5 w-3.5"
        />
        
        <div 
          className="flex items-center gap-1 flex-1 cursor-pointer"
          onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        >
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpandable ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            ) : null}
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {getTypeIcon(value)}
          </div>
          
          <span className="font-medium text-xs text-foreground">{keyName}</span>
          
          {!isExpandable && (
            <span className="text-xs text-muted-foreground ml-1 truncate max-w-[180px]">
              {formatValue(value)}
            </span>
          )}
          
          {isExpandable && (
            <span className="text-[10px] text-muted-foreground/70 ml-1">
              {getTypeLabel(value)}
            </span>
          )}
        </div>
      </div>
      
      {isExpandable && isExpanded && (
        <div className="ml-5 border-l border-border/50 pl-2">
          {Array.isArray(value) ? (
            value.map((item, index) => (
              <TreeNode
                key={index}
                keyName={`[${index}]`}
                value={item}
                path={`${path}[${index}]`}
                depth={depth + 1}
                selectedPaths={selectedPaths}
                onToggle={onToggle}
                searchQuery={searchQuery}
              />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <TreeNode
                key={key}
                keyName={key}
                value={val}
                path={`${path}.${key}`}
                depth={depth + 1}
                selectedPaths={selectedPaths}
                onToggle={onToggle}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SelectablePayloadTree({ 
  data, 
  onSelectionChange, 
  initialSelection,
  searchQuery 
}: SelectablePayloadTreeProps) {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(initialSelection || new Set());

  // Notify parent of selection changes with auto-generated names
  useEffect(() => {
    const autoNames = new Map<string, string>();
    selectedPaths.forEach(path => {
      autoNames.set(path, generateAutoName(path));
    });
    onSelectionChange(selectedPaths, autoNames);
  }, [selectedPaths, onSelectionChange]);

  const handleToggle = useCallback((path: string, isChecked: boolean, childPaths?: string[]) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      const pathsToUpdate = childPaths || [path];
      
      if (isChecked) {
        pathsToUpdate.forEach(p => next.add(p));
      } else {
        pathsToUpdate.forEach(p => next.delete(p));
      }
      
      return next;
    });
  }, []);

  // Select all / deselect all
  const handleSelectAll = () => {
    const allPaths = new Set<string>();
    const sections = ['body', 'headers', 'query'];
    
    sections.forEach(section => {
      if (data[section] !== undefined) {
        getAllLeafPaths(data[section], section).forEach(p => allPaths.add(p));
      }
    });
    
    setSelectedPaths(allPaths);
  };

  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  if (!data || typeof data !== 'object') {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center">
        No payload data available
      </div>
    );
  }

  const sections = ['body', 'headers', 'query'];
  const hasSelection = selectedPaths.size > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-muted-foreground">
          {selectedPaths.size} field{selectedPaths.size !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          <button 
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline"
          >
            Select All
          </button>
          <button 
            onClick={handleDeselectAll}
            className="text-xs text-muted-foreground hover:underline"
            disabled={!hasSelection}
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="text-sm font-mono">
        {sections.map((section) => {
          if (data[section] === undefined) return null;
          return (
            <TreeNode
              key={section}
              keyName={section}
              value={data[section]}
              path={section}
              depth={0}
              selectedPaths={selectedPaths}
              onToggle={handleToggle}
              searchQuery={searchQuery}
            />
          );
        })}
      </div>
    </div>
  );
}
