import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check, Braces, Hash, ToggleLeft, Type, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PayloadTreeViewerProps {
  data: any;
  nodeId: string;
  onPathCopy?: (path: string) => void;
  basePath?: string;
  searchQuery?: string;
}

interface TreeNodeProps {
  keyName: string;
  value: any;
  path: string;
  nodeId: string;
  depth: number;
  onPathCopy?: (path: string) => void;
  searchQuery?: string;
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
    const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
    return `"${truncated}"`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return '';
};

function TreeNode({ keyName, value, path, nodeId, depth, onPathCopy, searchQuery }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [copied, setCopied] = useState(false);
  
  const isExpandable = value !== null && typeof value === 'object';
  const bindingPath = `{{${nodeId}.${path}}}`;
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bindingPath);
    setCopied(true);
    toast.success('Copied binding path', { description: bindingPath });
    onPathCopy?.(bindingPath);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const matchesSearch = searchQuery && 
    (keyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
          matchesSearch && "bg-primary/10 ring-1 ring-primary/30"
        )}
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
          <span className="text-xs text-muted-foreground ml-1 truncate max-w-[200px]">
            {formatValue(value)}
          </span>
        )}
        
        {isExpandable && (
          <span className="text-[10px] text-muted-foreground/70 ml-1">
            {getTypeLabel(value)}
          </span>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </div>
      
      {isExpandable && isExpanded && (
        <div className="ml-4 border-l border-border/50 pl-2">
          {Array.isArray(value) ? (
            value.map((item, index) => (
              <TreeNode
                key={index}
                keyName={`[${index}]`}
                value={item}
                path={`${path}[${index}]`}
                nodeId={nodeId}
                depth={depth + 1}
                onPathCopy={onPathCopy}
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
                nodeId={nodeId}
                depth={depth + 1}
                onPathCopy={onPathCopy}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PayloadTreeViewer({ data, nodeId, onPathCopy, basePath = '', searchQuery }: PayloadTreeViewerProps) {
  if (!data || typeof data !== 'object') {
    return (
      <div className="text-xs text-muted-foreground p-4 text-center">
        No payload data available
      </div>
    );
  }

  // Top-level keys: body, headers, query, method
  const sections = ['body', 'headers', 'query', 'method'];
  
  return (
    <div className="text-sm font-mono">
      {sections.map((section) => {
        if (data[section] === undefined) return null;
        return (
          <TreeNode
            key={section}
            keyName={section}
            value={data[section]}
            path={basePath ? `${basePath}.${section}` : section}
            nodeId={nodeId}
            depth={0}
            onPathCopy={onPathCopy}
            searchQuery={searchQuery}
          />
        );
      })}
      
      {/* Show any additional fields not in standard sections */}
      {Object.entries(data)
        .filter(([key]) => !sections.includes(key) && !key.startsWith('_'))
        .map(([key, value]) => (
          <TreeNode
            key={key}
            keyName={key}
            value={value}
            path={basePath ? `${basePath}.${key}` : key}
            nodeId={nodeId}
            depth={0}
            onPathCopy={onPathCopy}
            searchQuery={searchQuery}
          />
        ))}
    </div>
  );
}
