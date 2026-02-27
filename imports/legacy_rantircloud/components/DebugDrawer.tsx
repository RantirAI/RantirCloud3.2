
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useFlowStore } from '@/lib/flow-store';
import { AlertTriangle, CircleCheck, InfoIcon, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Safe JSON stringify that handles circular references
function safeStringify(obj: any, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}

interface DebugDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webflowData?: any;
}

export function DebugDrawer({ open, onOpenChange, webflowData }: DebugDrawerProps) {
  const { debugLogs, errorNodes, flowStartTime, flowEndTime, clearDebugLogs } = useFlowStore();
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<number>>(new Set());

  console.log('DebugDrawer render - open:', open, 'debugLogs:', debugLogs.length);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        console.log('Escape pressed - closing debugger');
        onOpenChange(false);
      }
      if (event.key === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement;
        // Only trigger if not typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          console.log('D key pressed - toggling debugger');
          onOpenChange(!open);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);
  
  // Function to format the log entry with color based on level
  const getLogLevelClass = (type?: string) => {
    switch (type) {
      case 'error':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-amber-500 dark:text-amber-400';
      case 'info':
        return 'text-blue-500 dark:text-blue-400';
      case 'output':
        return 'text-green-500 dark:text-green-400';
      default:
        return 'text-foreground';
    }
  };

  const getLogLevelIcon = (type?: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />;
      case 'info':
        return <InfoIcon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />;
      case 'output':
        return <CircleCheck className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />;
      default:
        return <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const toggleOutputExpansion = (index: number) => {
    const newExpanded = new Set(expandedOutputs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedOutputs(newExpanded);
  };

  const copyToClipboard = (text: string, type: string = 'content') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${type} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const copyError = (log: any) => {
    const errorText = `Node: ${log.nodeName} (${log.nodeId})
Time: ${new Date(log.timestamp).toLocaleString()}
Error: ${log.message}
${log.data ? `Data: ${safeStringify(log.data, 2)}` : ''}`;
    copyToClipboard(errorText, 'Error');
  };

  const copyAllErrors = () => {
    const errorLogs = debugLogs.filter(log => log.type === 'error');
    const allErrors = errorLogs.map(log => 
      `Node: ${log.nodeName} (${log.nodeId})
Time: ${new Date(log.timestamp).toLocaleString()}
Error: ${log.message}
${log.data ? `Data: ${safeStringify(log.data, 2)}` : ''}
---`
    ).join('\n\n');
    
    if (allErrors) {
      copyToClipboard(allErrors, 'All errors');
    } else {
      toast.info('No errors to copy');
    }
  };

  const duration = flowStartTime && flowEndTime 
    ? ((flowEndTime - flowStartTime) / 1000).toFixed(2)
    : null;

  if (!open) {
    console.log('DebugDrawer not rendering - open is false');
    return null;
  }

  console.log('DebugDrawer rendering portal');

  return createPortal(
    <div className="fixed inset-0 z-[2147483647]" style={{ zIndex: 2147483647 }}>
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => {
          console.log('Overlay clicked - closing debugger');
          onOpenChange(false);
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[60%] max-h-[800px] bg-background border-t border-border rounded-t-[10px] shadow-lg">
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />

            {/* Header */}
            <div className="bg-background border-b border-border p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                    Debugger
                  </h2>
                  <p className="text-sm text-muted-foreground">Flow execution details and results</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyAllErrors}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Errors
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => clearDebugLogs()}
                    className="text-xs"
                  >
                    Clear Logs
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>

              {duration && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Execution completed in {duration}s
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-4 py-2 flex-1 overflow-auto bg-background">
              <Tabs defaultValue="logs" className="w-full">
                <TabsList className="w-fit mb-4 bg-muted">
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="space-y-4 bg-background">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2 bg-card">
                      <CardTitle className="text-base">Execution Logs</CardTitle>
                      <CardDescription className="text-xs">Flow execution details</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-card">
                      <ScrollArea className="h-[300px] rounded border p-4 bg-background">
                        {debugLogs.length > 0 ? (
                          <div className="space-y-2">
                            {debugLogs.map((log, i) => {
                              const isExpanded = expandedLogs.has(i);
                              const hasData = log.data && Object.keys(log.data).length > 0;
                              
                              return (
                                <div key={i} className={`text-xs border-b pb-2 ${getLogLevelClass(log.type)}`}>
                                  <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                       <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                                         {new Date(log.timestamp).toLocaleTimeString()}: 
                                       </span>
                                      {getLogLevelIcon(log.type)}
                                      <span className="font-medium truncate">{log.nodeName}</span>
                                      {log.type && (
                                        <Badge variant={log.type === 'error' ? 'destructive' : 'outline'} className="text-[10px] h-4">
                                          {log.type}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {log.type === 'error' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={() => copyError(log)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {hasData && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={() => toggleLogExpansion(i)}
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-1">{log.message}</div>
                                  
                                  {hasData && isExpanded && (
                                    <div className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto relative">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-1 right-1 h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                        onClick={() => copyToClipboard(safeStringify(log.data, 2), 'Data')}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <pre className="pr-6">{safeStringify(log.data, 2)}</pre>
                                    </div>
                                  )}
                                  
                                   {hasData && !isExpanded && (
                                     <div className="mt-1 text-[10px] text-muted-foreground">
                                       Click to expand data...
                                     </div>
                                   )}
                                </div>
                              );
                            })}
                          </div>
                         ) : (
                           <div className="text-muted-foreground text-center py-8">
                             No logs available. Run the flow to see execution logs.
                           </div>
                         )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="output" className="space-y-4 bg-background">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2 bg-card">
                      <CardTitle className="text-base">Flow Variables</CardTitle>
                      <CardDescription className="text-xs">Data output from the flow execution</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-card">
                      <ScrollArea className="h-[300px] rounded border p-4 bg-background">
                        {debugLogs.length > 0 ? (
                          <div className="space-y-2">
                            {debugLogs
                              .filter(log => log.type === 'output' && log.data)
                              .map((log, i) => {
                                const isExpanded = expandedOutputs.has(i);
                                
                                return (
                                  <div key={i} className="text-xs border-b pb-2">
                                    <div className="flex items-center gap-2 justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{log.nodeName}</span>
                                        <span className="text-muted-foreground">{log.nodeId}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={() => copyToClipboard(safeStringify(log.data, 2), 'Output')}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={() => toggleOutputExpansion(i)}
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {isExpanded ? (
                                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                        {safeStringify(log.data, 2)}
                                      </pre>
                                     ) : (
                                       <div className="mt-1 text-[10px] text-muted-foreground">
                                         Click to expand output...
                                       </div>
                                     )}
                                   </div>
                                 );
                               })}
                               
                             {debugLogs.filter(log => log.type === 'output' && log.data).length === 0 && (
                               <div className="text-muted-foreground text-center py-8">
                                 No output data available from this flow execution.
                               </div>
                             )}
                           </div>
                         ) : (
                           <div className="text-muted-foreground text-center py-8">
                             No output data available. Run the flow to see results.
                           </div>
                         )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>,
    document.body
  );
}
