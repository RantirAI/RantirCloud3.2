import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle, Circle, Book } from 'lucide-react';
import { nodeRegistry } from '@/lib/node-registry';
import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NodeImplementationStatus {
  nodeType: string;
  isImplemented: boolean;
  implementedBy?: string;
  implementedAt?: string;
}

export default function Documentation() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [implementationStatus, setImplementationStatus] = useState<Record<string, NodeImplementationStatus>>({});
  const [activeTab, setActiveTab] = useState('nodes');
  const { user } = useAuth();

  const allNodes = nodeRegistry.getAllPlugins();

  // TODO: Implement implementation status tracking after types are generated
  const loadImplementationStatus = async () => {
    // Implementation tracking will be enabled after database types are updated
    console.log('Implementation status tracking will be available soon');
  };

  const toggleImplementationStatus = async (nodeType: string) => {
    if (!user) {
      toast.error('Please log in to update implementation status');
      return;
    }
    
    // TODO: Implement after database types are updated
    console.log('Implementation status toggle will be available soon');
  };
  
  // Group nodes by category
  const nodesByCategory = allNodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, NodePlugin[]>);

  const categoryOrder = ['trigger', 'action', 'transformer', 'condition'];
  const categoryLabels = {
    trigger: 'Trigger',
    action: 'Action', 
    transformer: 'Transformer',
    condition: 'Condition'
  };

  const categoryColors = {
    trigger: 'bg-blue-100 text-blue-800 border-blue-200',
    action: 'bg-green-100 text-green-800 border-green-200',
    transformer: 'bg-purple-100 text-purple-800 border-purple-200',
    condition: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  // Filter nodes based on selected category and search query
  const getFilteredNodes = () => {
    let filteredNodes = allNodes;
    
    if (selectedCategory !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.category === selectedCategory);
    }
    
    if (searchQuery) {
      filteredNodes = filteredNodes.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filteredNodes;
  };

  const filteredNodes = getFilteredNodes();

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar Navigation */}
      <div className="w-64 border-r bg-background p-6">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Documentation</h3>
          <div className="space-y-1">
            <Link 
              to="/docs/development-guide"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Book className="h-4 w-4" />
              Development Guide
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Categories</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-muted text-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All Categories
            </button>
            {categoryOrder.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors capitalize ${
                  selectedCategory === category 
                    ? 'bg-muted text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold mb-2">Node Documentation</h1>
                <p className="text-muted-foreground">
                  Learn how to use the available nodes and track implementation progress
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="nodes">Available Nodes</TabsTrigger>
                <TabsTrigger value="progress">Implementation Progress</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="nodes" className="space-y-6">
              {/* Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNodes.map(node => {
                  const Icon = node.icon;
                  const status = implementationStatus[node.type];
                  return (
                    <div key={node.type} className="relative">
                      <Link 
                        to={`/docs/${node.type}`}
                        className="block transition-transform hover:scale-105"
                      >
                        <Card className="h-full hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between mb-3">
                              <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${node.color}20` }}
                              >
{typeof node.icon === 'string' ? (
                                  <img 
                                    src={node.icon as string} 
                                    alt={node.name} 
                                    className="h-6 w-6 object-cover" 
                                  />
                                ) : node.icon ? (
                                  <node.icon 
                                    className="h-6 w-6" 
                                    style={{ color: node.color }} 
                                  />
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${categoryColors[node.category]}`}
                                >
                                  {categoryLabels[node.category]}
                                </Badge>
                                {status?.isImplemented && (
                                  <Badge variant="secondary" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Implemented
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardTitle className="text-lg leading-tight">{node.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <CardDescription className="text-sm">
                              {node.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </Link>
                      
                      {user && (
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleImplementationStatus(node.type);
                          }}
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 z-10"
                        >
                          {status?.isImplemented ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {filteredNodes.map(node => {
                  const Icon = node.icon;
                  const status = implementationStatus[node.type];
                  return (
                    <Card key={node.type}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${node.color}20` }}
                            >
{typeof node.icon === 'string' ? (
                                <img 
                                  src={node.icon as string} 
                                  alt={node.name} 
                                  className="h-5 w-5 object-cover" 
                                />
                              ) : node.icon ? (
                                <node.icon 
                                  className="h-5 w-5" 
                                  style={{ color: node.color }} 
                                />
                              ) : null}
                            </div>
                            
                            <div>
                              <h3 className="font-semibold">{node.name}</h3>
                              <p className="text-sm text-muted-foreground">{node.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${categoryColors[node.category]}`}
                                >
                                  {categoryLabels[node.category]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {status?.isImplemented ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="text-sm font-medium">Implemented</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Circle className="h-5 w-5" />
                                <span className="text-sm">Pending</span>
                              </div>
                            )}
                            
                            {user && (
                              <Button
                                onClick={() => toggleImplementationStatus(node.type)}
                                variant={status?.isImplemented ? "outline" : "default"}
                                size="sm"
                              >
                                Mark as {status?.isImplemented ? 'Pending' : 'Implemented'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* No results message */}
          {filteredNodes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No nodes found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}