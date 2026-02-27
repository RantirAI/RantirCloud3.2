import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Variable, 
  Globe,
  FileText,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
  Search,
  X,
  Zap,
  Hash,
  ToggleLeft,
  Braces,
  List,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { useVariableStore } from '@/stores/variableStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { VariableDataType, VariableScope } from '@/types/variables';
import { cn } from '@/lib/utils';

interface VariableDebugPanelProps {
  className?: string;
}

export function VariableDebugPanel({ className }: VariableDebugPanelProps) {
  const { currentProject, currentPage } = useAppBuilderStore();
  const { 
    appVariables, 
    pageVariables, 
    componentVariables,
    appVariableDefinitions,
    pageVariableDefinitions,
    setVariable,
    loadAppVariables,
    loadPageVariables,
    isLoading
  } = useVariableStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['app', 'page']));
  const [changeHistory, setChangeHistory] = useState<Array<{
    scope: string;
    name: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
  }>>([]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleRefresh = () => {
    if (currentProject?.id) {
      loadAppVariables(currentProject.id);
      if (currentPage) {
        loadPageVariables(currentProject.id, currentPage);
      }
    }
  };

  const handleValueChange = (scope: VariableScope, name: string, newValue: any) => {
    const oldValue = scope === 'app' ? appVariables[name] : pageVariables[name];
    
    setChangeHistory(prev => [{
      scope,
      name,
      oldValue,
      newValue,
      timestamp: Date.now()
    }, ...prev.slice(0, 49)]); // Keep last 50 changes
    
    setVariable(scope, name, newValue);
  };

  const getTypeIcon = (dataType: VariableDataType) => {
    switch (dataType) {
      case 'string': return <Variable className="h-3 w-3" />;
      case 'number': return <Hash className="h-3 w-3" />;
      case 'boolean': return <ToggleLeft className="h-3 w-3" />;
      case 'object': return <Braces className="h-3 w-3" />;
      case 'array': return <List className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      default: return <Variable className="h-3 w-3" />;
    }
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const filterVariables = (definitions: any[]) => {
    if (!searchQuery) return definitions;
    return definitions.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredAppVars = filterVariables(appVariableDefinitions);
  const filteredPageVars = filterVariables(pageVariableDefinitions);

  return (
    <div className={cn("h-full flex flex-col bg-background border-l", className)}>
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-sm">Variable Debug</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* App Variables Section */}
          <Collapsible 
            open={expandedSections.has('app')} 
            onOpenChange={() => toggleSection('app')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-1.5 rounded">
                <div className="flex items-center gap-2">
                  {expandedSections.has('app') ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium">App Variables</span>
                </div>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {filteredAppVars.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {filteredAppVars.length === 0 ? (
                <p className="text-xs text-muted-foreground px-6 py-2">No app variables</p>
              ) : (
                filteredAppVars.map((def) => (
                  <div key={def.id} className="ml-5 p-2 bg-muted/50 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(def.dataType)}
                        <span className="font-medium">{def.name}</span>
                      </div>
                      <Badge variant="outline" className="h-4 text-[9px]">
                        {def.dataType}
                      </Badge>
                    </div>
                    <div className="bg-background rounded p-1.5 font-mono text-[10px] max-h-16 overflow-auto">
                      {formatValue(appVariables[def.name])}
                    </div>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Page Variables Section */}
          <Collapsible 
            open={expandedSections.has('page')} 
            onOpenChange={() => toggleSection('page')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-1.5 rounded">
                <div className="flex items-center gap-2">
                  {expandedSections.has('page') ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <FileText className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium">Page Variables</span>
                </div>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {filteredPageVars.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {filteredPageVars.length === 0 ? (
                <p className="text-xs text-muted-foreground px-6 py-2">No page variables</p>
              ) : (
                filteredPageVars.map((def) => (
                  <div key={def.id} className="ml-5 p-2 bg-muted/50 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(def.dataType)}
                        <span className="font-medium">{def.name}</span>
                      </div>
                      <Badge variant="outline" className="h-4 text-[9px]">
                        {def.dataType}
                      </Badge>
                    </div>
                    <div className="bg-background rounded p-1.5 font-mono text-[10px] max-h-16 overflow-auto">
                      {formatValue(pageVariables[def.name])}
                    </div>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Change History Section */}
          <Collapsible 
            open={expandedSections.has('history')} 
            onOpenChange={() => toggleSection('history')}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-1.5 rounded">
                <div className="flex items-center gap-2">
                  {expandedSections.has('history') ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-medium">Change History</span>
                </div>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {changeHistory.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {changeHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground px-6 py-2">No changes recorded</p>
              ) : (
                changeHistory.slice(0, 10).map((change, index) => (
                  <div key={index} className="ml-5 p-2 bg-muted/50 rounded text-[10px]">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge variant="outline" className="h-4 text-[9px]">
                        {change.scope}
                      </Badge>
                      <span className="font-medium">{change.name}</span>
                      <span className="text-muted-foreground ml-auto">
                        {new Date(change.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-red-500 truncate max-w-[80px]">
                        {formatValue(change.oldValue).substring(0, 20)}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="text-green-500 truncate max-w-[80px]">
                        {formatValue(change.newValue).substring(0, 20)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
