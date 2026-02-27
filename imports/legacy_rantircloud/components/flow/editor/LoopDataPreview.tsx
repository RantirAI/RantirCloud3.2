
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, RotateCcw, Database } from 'lucide-react';
import { useFlowStore } from '@/lib/flow-store';
import { dataContextManager } from '@/lib/data-context';

interface LoopDataPreviewProps {
  nodeId: string;
  onSelectItem: (path: string, value: any) => void;
}

export function LoopDataPreview({ nodeId, onSelectItem }: LoopDataPreviewProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const { nodes, edges } = useFlowStore();

  // Get connected node IDs for this node
  const getConnectedNodeIds = () => {
    return edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
  };

  // Get loop data from connected nodes
  const getLoopData = () => {
    const connectedNodeIds = getConnectedNodeIds();
    const loopData: Array<{
      sourceNodeId: string;
      sourceName: string;
      arrayFields: Array<{name: string, sample: any[], description: string}>;
    }> = [];

    connectedNodeIds.forEach(sourceNodeId => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;

      const arrayFields = dataContextManager.getArrayFieldsFromNode(sourceNodeId);
      if (arrayFields.length > 0) {
        loopData.push({
          sourceNodeId,
          sourceName: sourceNode.data.label || sourceNodeId,
          arrayFields
        });
      }
    });

    return loopData;
  };

  const toggleItemExpansion = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderValue = (value: any, path: string, isClickable: boolean = true) => {
    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div className="ml-4 border-l-2 border-gray-200 pl-2">
          {Object.entries(value).slice(0, 5).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 py-1">
              <span className="text-sm font-medium text-gray-600">{key}:</span>
              {isClickable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs justify-start"
                  onClick={() => onSelectItem(`${path}.${key}`, val)}
                >
                  {renderValue(val, `${path}.${key}`, false)}
                </Button>
              ) : (
                renderValue(val, `${path}.${key}`, false)
              )}
            </div>
          ))}
          {Object.keys(value).length > 5 && (
            <div className="text-xs text-gray-500">... and more</div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'string') {
      const truncated = value.length > 30 ? `"${value.substring(0, 30)}..."` : `"${value}"`;
      return <span className="text-green-600">{truncated}</span>;
    }
    
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-purple-600">{value.toString()}</span>;
    if (Array.isArray(value)) return <span className="text-gray-500">[{value.length} items]</span>;
    
    return <span>{String(value)}</span>;
  };

  const loopData = getLoopData();

  if (loopData.length === 0) {
    return (
      <div className="p-6 text-center">
        <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No Loop Data Available</h3>
        <p className="text-xs text-gray-500 mb-4">
          Connect a node with array data and run it to see loop preview
        </p>
        <Button variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Loop Data Preview</h3>
        <Badge variant="secondary" className="text-xs">
          {loopData.reduce((acc, data) => acc + data.arrayFields.reduce((sum, field) => sum + field.sample.length, 0), 0)} items
        </Badge>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {loopData.map((sourceData) => (
            <div key={sourceData.sourceNodeId}>
              {sourceData.arrayFields.map((arrayField) => (
                <Card key={`${sourceData.sourceNodeId}-${arrayField.name}`} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      {sourceData.sourceName} {'->'} {arrayField.name}
                    </CardTitle>
                    <p className="text-xs text-gray-600">{arrayField.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {arrayField.sample.map((item, index) => (
                        <div key={index} className="border rounded-md p-2 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => toggleItemExpansion(index)}
                              >
                                {expandedItems[index] ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                              <Badge variant="outline" className="text-xs">
                                Item {index + 1}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => onSelectItem(`{{${sourceData.sourceNodeId}.${arrayField.name}[${index}]}}`, item)}
                            >
                              Select Item
                            </Button>
                          </div>
                          
                          {expandedItems[index] && (
                            <div className="mt-2">
                              {renderValue(item, `{{${sourceData.sourceNodeId}.${arrayField.name}[${index}]}}`)}
                            </div>
                          )}
                          
                          {!expandedItems[index] && (
                            <div className="mt-1 text-xs text-gray-500">
                              {typeof item === 'object' ? `Object with ${Object.keys(item).length} properties` : String(item).substring(0, 50)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
