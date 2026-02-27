import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ChevronRight, ChevronDown, Braces, Hash, ToggleLeft, Type, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayloadPreviewPopoverProps {
  payload: any;
  isOpen: boolean;
  onClose: () => void;
  selectedPaths?: string[];
  autoNames?: Record<string, string>;
}

// Helper to get value at a nested path
function getValueAtPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[')) {
      const [arrKey, indexStr] = key.split(/[\[\]]/);
      const index = parseInt(indexStr);
      return current?.[arrKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

const getTypeIcon = (value: any) => {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">∅</span>;
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

// Helper to generate friendly display name
function generateFriendlyName(path: string): string {
  const lastPart = path.split('.').pop() || path;
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

interface SelectedFieldRowProps {
  path: string;
  value: any;
  autoName?: string;
}

function SelectedFieldRow({ path, value, autoName }: SelectedFieldRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable = value !== null && typeof value === 'object';
  const friendlyName = autoName || generateFriendlyName(path);

  return (
    <div className="border-b border-border/50 last:border-0">
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-2 hover:bg-muted/30 transition-colors",
          isExpandable && "cursor-pointer"
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : null}
        </div>
        
        {getTypeIcon(value)}
        
        <div className="flex-1 min-w-0">
          <span className="font-medium text-[11px] text-foreground">{friendlyName}</span>
          {!isExpandable && (
            <span className="text-[10px] text-muted-foreground ml-2 truncate">
              {formatValue(value)}
            </span>
          )}
        </div>
        
        <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
          {getTypeLabel(value)}
        </span>
      </div>
      
      {isExpandable && isExpanded && (
        <div className="ml-6 border-l border-border/50 pl-2 py-1 bg-muted/20">
          <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function PreviewTreeNode({ keyName, value, depth }: { keyName: string; value: any; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const isExpandable = value !== null && typeof value === 'object';

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : null}
        </div>
        
        {getTypeIcon(value)}
        
        <span className="font-medium text-[11px] text-foreground">{keyName}</span>
        
        {!isExpandable && (
          <span className="text-[11px] text-muted-foreground ml-1 truncate max-w-[200px]">
            {formatValue(value)}
          </span>
        )}
        
        {isExpandable && (
          <span className="text-[10px] text-muted-foreground/70 ml-1">
            {getTypeLabel(value)}
          </span>
        )}
      </div>
      
      {isExpandable && isExpanded && (
        <div className="ml-3 border-l border-border/50 pl-1.5">
          {Array.isArray(value) ? (
            value.slice(0, 10).map((item, index) => (
              <PreviewTreeNode
                key={index}
                keyName={`[${index}]`}
                value={item}
                depth={depth + 1}
              />
            ))
          ) : (
            Object.entries(value).slice(0, 20).map(([key, val]) => (
              <PreviewTreeNode
                key={key}
                keyName={key}
                value={val}
                depth={depth + 1}
              />
            ))
          )}
          {((Array.isArray(value) && value.length > 10) || 
            (!Array.isArray(value) && Object.keys(value).length > 20)) && (
            <span className="text-[10px] text-muted-foreground italic ml-4">
              ...and more items
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PayloadPreviewPopover({ 
  payload, 
  isOpen, 
  onClose, 
  selectedPaths,
  autoNames 
}: PayloadPreviewPopoverProps) {
  if (!payload) return null;

  const hasSelection = selectedPaths && selectedPaths.length > 0;
  const capturedAt = payload._capturedAt ? new Date(payload._capturedAt).toLocaleString() : null;
  const isSample = payload._isSample;
  const provider = payload._provider;

  // Build selected fields data
  const selectedFieldsData = useMemo(() => {
    if (!hasSelection) return [];
    return selectedPaths.map(path => ({
      path,
      value: getValueAtPath(payload, path),
      autoName: autoNames?.[path]
    }));
  }, [selectedPaths, payload, autoNames, hasSelection]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <DialogTitle className="text-sm">
                  {hasSelection ? 'Selected Fields' : 'Sample Payload'}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground">
                  {isSample ? (
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 capitalize">
                        {provider || 'Sample'}
                      </Badge>
                    </span>
                  ) : hasSelection ? (
                    `${selectedPaths.length} field${selectedPaths.length !== 1 ? 's' : ''} selected`
                  ) : (
                    capturedAt && `Captured ${capturedAt}`
                  )}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="p-3">
            {hasSelection ? (
              // Show only selected fields
              <div className="space-y-0 rounded-lg border overflow-hidden">
                {selectedFieldsData.map(({ path, value, autoName }) => (
                  <SelectedFieldRow
                    key={path}
                    path={path}
                    value={value}
                    autoName={autoName}
                  />
                ))}
              </div>
            ) : (
              // Show full tree
              <div className="font-mono text-xs">
                {['body', 'headers', 'query'].map((section) => {
                  if (payload[section] === undefined) return null;
                  return (
                    <PreviewTreeNode
                      key={section}
                      keyName={section}
                      value={payload[section]}
                      depth={0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t bg-muted/30 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
