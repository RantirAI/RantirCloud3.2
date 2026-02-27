
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, List, Hash, Type, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface DataPreviewProps {
  data: any;
  title?: string;
  maxHeight?: string;
  onSelectPath?: (path: string) => void;
  showSelectButtons?: boolean;
}

export function DataPreview({ 
  data, 
  title = "Data Preview", 
  maxHeight = "300px",
  onSelectPath,
  showSelectButtons = false
}: DataPreviewProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={`px-4 pb-4`} style={{ maxHeight }}>
          <DataNode 
            data={data} 
            path="" 
            level={0} 
            onSelectPath={onSelectPath}
            showSelectButtons={showSelectButtons}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface DataNodeProps {
  data: any;
  path: string;
  level: number;
  onSelectPath?: (path: string) => void;
  showSelectButtons?: boolean;
}

function DataNode({ data, path, level, onSelectPath, showSelectButtons }: DataNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  
  const getTypeIcon = (value: any) => {
    if (Array.isArray(value)) return <List className="h-3 w-3" />;
    if (typeof value === 'object' && value !== null) return <Database className="h-3 w-3" />;
    if (typeof value === 'number') return <Hash className="h-3 w-3" />;
    if (typeof value === 'string') return <Type className="h-3 w-3" />;
    return <Type className="h-3 w-3" />;
  };

  const getTypeBadge = (value: any) => {
    if (Array.isArray(value)) {
      return <Badge variant="outline" className="text-xs">Array[{value.length}]</Badge>;
    }
    if (typeof value === 'object' && value !== null) {
      return <Badge variant="outline" className="text-xs">Object</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{typeof value}</Badge>;
  };

  const renderValue = (value: any) => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === 'string') {
      if (value.length > 50) {
        return <span className="text-green-600">"{value.substring(0, 50)}..."</span>;
      }
      return <span className="text-green-600">"{value}"</span>;
    }
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-purple-600">{value.toString()}</span>;
    return null;
  };

  if (typeof data !== 'object' || data === null) {
    return (
      <div className="flex items-center justify-between py-1" style={{ paddingLeft: `${level * 16}px` }}>
        <div className="flex items-center gap-2">
          {getTypeIcon(data)}
          <span className="font-mono text-sm">{renderValue(data)}</span>
        </div>
        {showSelectButtons && onSelectPath && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => onSelectPath(path)}
          >
            Select
          </Button>
        )}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((item, index) => [index.toString(), item]) : Object.entries(data);

  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-500" />
          )}
          {getTypeIcon(data)}
          {getTypeBadge(data)}
        </div>
        {showSelectButtons && onSelectPath && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => onSelectPath(path)}
          >
            Select
          </Button>
        )}
      </div>
      
      {isExpanded && (
        <div>
          {entries.slice(0, 10).map(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;
            return (
              <div key={key} className="border-l border-gray-200 ml-2">
                <div className="flex items-center gap-2 py-1 pl-2">
                  <span className="text-sm font-medium text-gray-700">{key}:</span>
                  {typeof value === 'object' && value !== null ? (
                    <DataNode 
                      data={value} 
                      path={currentPath} 
                      level={level + 1} 
                      onSelectPath={onSelectPath}
                      showSelectButtons={showSelectButtons}
                    />
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(value)}
                        {renderValue(value)}
                      </div>
                      {showSelectButtons && onSelectPath && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => onSelectPath(currentPath)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {entries.length > 10 && (
            <div className="text-xs text-gray-500 pl-4">
              ... and {entries.length - 10} more items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
