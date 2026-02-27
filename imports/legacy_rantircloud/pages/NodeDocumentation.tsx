
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';

export default function NodeDocumentation() {
  const { nodeType } = useParams<{ nodeType: string }>();
  
  const node = nodeType ? nodeRegistry.getPlugin(nodeType) : null;
  
  if (!node) {
    return <Navigate to="/docs" replace />;
  }
  
  const Icon = node.icon;
  
  const categoryColors = {
    trigger: 'bg-blue-100 text-blue-800 border-blue-200',
    action: 'bg-green-100 text-green-800 border-green-200',
    transformer: 'bg-purple-100 text-purple-800 border-purple-200',
    condition: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  const getTypeIndicator = (type: string) => {
    const typeColors = {
      text: 'bg-gray-100 text-gray-800',
      select: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      textarea: 'bg-purple-100 text-purple-800',
      code: 'bg-orange-100 text-orange-800',
      boolean: 'bg-pink-100 text-pink-800',
      variable: 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </Badge>
    );
  };

  const getOutputTypeIndicator = (type: string) => {
    const typeColors = {
      string: 'bg-gray-100 text-gray-800',
      number: 'bg-green-100 text-green-800',
      boolean: 'bg-pink-100 text-pink-800',
      object: 'bg-blue-100 text-blue-800',
      array: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: `${node.color}20` }}
          >
{typeof node.icon === 'string' ? (
              <img 
                src={node.icon as string} 
                alt={node.name} 
                className="h-8 w-8 object-cover" 
              />
            ) : node.icon ? (
              <node.icon 
                className="h-8 w-8" 
                style={{ color: node.color }} 
              />
            ) : null}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link to="/docs">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Documentation
                </Button>
              </Link>
              <h1 className="font-bold text-lg">{node.name}</h1>
              <Badge variant="outline" className={categoryColors[node.category]}>
                {node.category}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              {node.description}
            </p>
            <div className="text-sm text-muted-foreground">
              <strong>Node Type:</strong> <code className="bg-muted px-2 py-1 rounded">{node.type}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Input Parameters</CardTitle>
          <CardDescription>
            Configuration parameters that this node accepts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {node.inputs && node.inputs.length > 0 ? (
            <div className="space-y-6">
              {node.inputs.map((input, index) => (
                <div key={index} className="border-b border-border pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-sm">{input.label}</h3>
                    {getTypeIndicator(input.type)}
                    <div className="flex items-center gap-1">
                      {input.required ? (
                        <Badge variant="destructive" className="text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Optional
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {input.name}
                    </code>
                  </div>
                  
                  {input.description && (
                    <p className="text-muted-foreground mb-3 text-xs">
                      {input.description}
                    </p>
                  )}
                  
                  {input.placeholder && (
                    <div className="mb-3">
                      <span className="text-sm font-medium">Placeholder: </span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {input.placeholder}
                      </code>
                    </div>
                  )}
                  
                  {input.default !== undefined && (
                    <div className="mb-3">
                      <span className="text-sm font-medium">Default: </span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {typeof input.default === 'string' ? input.default : JSON.stringify(input.default)}
                      </code>
                    </div>
                  )}
                  
                  {input.options && input.options.length > 0 && (
                    <div>
                      <span className="text-sm font-medium block mb-2">Available Options:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {input.options.map((option, optIndex) => (
                          <div key={optIndex} className="bg-muted p-3 rounded border">
                            <div className="font-medium text-sm">{option.label}</div>
                            <code className="text-xs text-muted-foreground">{option.value}</code>
                            {option.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {option.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">This node has no input parameters.</p>
          )}
        </CardContent>
      </Card>

      {/* Outputs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Output Values</CardTitle>
          <CardDescription>
            Data that this node produces after execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {node.outputs && node.outputs.length > 0 ? (
            <div className="space-y-6">
              {node.outputs.map((output, index) => (
                <div key={index} className="border-b border-border pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-sm">{output.name}</h3>
                    {getOutputTypeIndicator(output.type)}
                  </div>
                  
                  <div className="mb-3">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {output.name}
                    </code>
                  </div>
                  
                  {output.description && (
                    <p className="text-muted-foreground">
                      {output.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">This node produces no output values.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
