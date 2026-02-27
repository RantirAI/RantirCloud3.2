import React, { useState, useEffect, useMemo } from 'react';
import { stripHtml } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Code, 
  Puzzle, 
  Database,
  Workflow,
  CheckCircle,
  Circle,
  FileCode,
  Lightbulb,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function NodeDevelopmentGuide() {
  const [activeSection, setActiveSection] = useState('ai-prompting');
  const [integrations, setIntegrations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const { user } = useAuth();

  const sidebarItems = [
    { id: 'ai-prompting', label: 'AI Prompting', icon: Lightbulb },
    { id: 'architecture', label: 'System Architecture', icon: Workflow },
    { id: 'creating-nodes', label: 'Creating Nodes', icon: Code },
    { id: 'integrations', label: 'Database Integrations', icon: Puzzle },
    { id: 'examples', label: 'Examples', icon: FileCode },
  ];

  // Group integrations by priority
  const groupIntegrationsByPriority = (integrationList) => {
    const grouped = integrationList.reduce((acc, integration) => {
      const priority = integration.priority || 0;
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(integration);
      return acc;
    }, {});

    // Sort priorities in descending order (highest priority first)
    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a)
      .map(priority => ({
        priority,
        integrations: grouped[priority]
      }));
  };

  // Load integrations from database
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('priority', { ascending: true })
        .order('name', { ascending: true });
        
        if (error) {
          console.error('Error loading integrations:', error);
        } else {
          setIntegrations(data || []);
        }
      } catch (error) {
        console.error('Error loading integrations:', error);
      }
    };

    loadIntegrations();
  }, []);

  // Toggle integration status
  const toggleIntegrationStatus = async (integrationId, currentStatus) => {
    if (!user) {
      toast.error('Please log in to update integration status');
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_integrated: !currentStatus })
        .eq('id', integrationId);

      if (error) {
        throw error;
      }

      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, is_integrated: !currentStatus }
            : integration
        )
      );

      toast.success(`Integration marked as ${!currentStatus ? 'integrated' : 'not integrated'}`);
    } catch (error) {
      console.error('Error updating integration status:', error);
      toast.error('Failed to update integration status');
    }
  };

  // Update integration priority
  const updateIntegrationPriority = async (integrationId, priority) => {
    if (!user) {
      toast.error('Please log in to update integration priority');
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .update({ priority: priority })
        .eq('id', integrationId);

      if (error) {
        throw error;
      }

      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, priority: priority }
            : integration
        )
      );

      toast.success('Integration priority updated');
    } catch (error) {
      console.error('Error updating integration priority:', error);
      toast.error('Failed to update integration priority');
    }
  };

  // Filtered integrations based on search and tab
  const filteredIntegrations = useMemo(() => {
    let filtered = integrations;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(integration =>
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by tab
    if (selectedTab === 'completed') {
      filtered = filtered.filter(integration => integration.is_integrated);
    }
    
    return filtered;
  }, [integrations, searchQuery, selectedTab]);

  const nodeTypes = [
    { category: 'trigger', description: 'Start flows based on events or conditions', color: '#3B82F6', examples: ['webhook', 'scheduler', 'file-watcher'] },
    { category: 'action', description: 'Perform operations like API calls or data manipulation', color: '#10B981', examples: ['http-request', 'email-sender', 'database-insert'] },
    { category: 'transformer', description: 'Transform, filter, or process data', color: '#8B5CF6', examples: ['data-mapper', 'calculator', 'text-formatter'] },
    { category: 'condition', description: 'Control flow based on conditional logic', color: '#F59E0B', examples: ['if-else', 'data-validator', 'rule-engine'] }
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">Node Development Guide</h2>
          <p className="text-sm text-muted-foreground">
            Complete guide for building custom nodes and integrations
          </p>
        </div>
        
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSection === item.id
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          

          {/* AI Prompting Section */}
          {activeSection === 'ai-prompting' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold mb-4">AI Prompting for Node Development</h1>
                <p className="text-muted-foreground mb-6">
                  Learn how to effectively prompt the AI to build custom nodes and integrations for your specific needs.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    How to Prompt the AI for Node Creation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    When requesting a new node, provide these key details to get the best results:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Service/Platform Name</p>
                        <p className="text-xs text-muted-foreground">e.g., "Create an Airtable node", "Build a MongoDB integration"</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Specific Operations</p>
                        <p className="text-xs text-muted-foreground">What actions should the node perform? (read, write, update, delete, search)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Authentication Method</p>
                        <p className="text-xs text-muted-foreground">API key, OAuth, username/password, bearer token</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Data Structure</p>
                        <p className="text-xs text-muted-foreground">What kind of data will be handled? (records, files, messages, etc.)</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Example Prompt Template:</h4>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono">
                      <p>"Create a [SERVICE_NAME] node that can:</p>
                      <p>- [OPERATION_1] (e.g., create records)</p>
                      <p>- [OPERATION_2] (e.g., search records)</p>
                      <p>- Uses [AUTH_METHOD] for authentication</p>
                      <p>- Handles [DATA_TYPE] data</p>
                      <p>- Should be categorized as an [ACTION/TRIGGER/TRANSFORMER] node"</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Real Example - Airtable Node:</h4>
                    <div className="bg-muted p-4 rounded-md text-sm">
                      <p className="font-medium text-blue-700 mb-2">User Prompt:</p>
                      <p className="italic">
                        "Create an Airtable node that can create records, read records by ID, update records, 
                        and list all records from a base/table. It should use API key authentication and be 
                        categorized as an action node. The node should allow users to select which base and 
                        table to work with, and map fields dynamically."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Architecture Section */}
          {activeSection === 'architecture' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold mb-4">System Architecture</h1>
                <p className="text-muted-foreground mb-6">
                  Complete technical overview of how the node system works, including installation mechanisms and data flow.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-blue-500" />
                      Node Plugin Interface
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Every node implements the NodePlugin interface, which defines its structure and behavior:
                    </p>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto">
                      <pre>{`interface NodePlugin {
  type: string;              // Unique identifier (e.g., 'airtable', 'mongodb')
  name: string;              // Display name shown in UI
  description: string;       // Brief description of functionality
  category: 'trigger' | 'action' | 'condition' | 'transformer';
  icon?: React.ComponentType; // Icon from lucide-react
  color?: string;            // Hex color for visual identification
  
  // Configuration fields shown in properties panel
  inputs?: InputField[];     
  
  // Data outputs that other nodes can use
  outputs?: OutputField[];   
  
  // Main execution function
  execute?: (inputs, context) => Promise<Record<string, any>>;
  
  // Installation configuration (handled automatically)
  installationConfig?: {
    requiresAuth: boolean;
    authType: 'api_key' | 'oauth' | 'credentials';
    permissions: string[];
    dependencies?: string[];
  };
}`}</pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-500" />
                      Installation & Authentication System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      All integrations include automatic install/uninstall capabilities managed by the system:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-sm">Installation Process</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          When users click "Install", the system automatically handles authentication setup, 
                          dependency management, and user configuration storage.
                        </p>
                      </div>
                      
                      <div className="border-l-4 border-green-500 pl-4">
                        <h4 className="font-medium text-sm">Authentication Management</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          API keys, OAuth tokens, and credentials are securely stored per-user. 
                          The system handles token refresh and validation automatically.
                        </p>
                      </div>
                      
                      <div className="border-l-4 border-orange-500 pl-4">
                        <h4 className="font-medium text-sm">Uninstallation</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Removes all stored credentials, configurations, and user data associated 
                          with the integration while preserving flow compatibility.
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-sm font-medium text-blue-900 mb-2">Important for Developers:</p>
                      <p className="text-xs text-blue-800">
                        You don't need to implement install/uninstall logic. The system automatically 
                        handles user authentication, credential storage, and configuration management 
                        based on your node's installationConfig.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-purple-500" />
                      Flow Execution Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Understanding how data flows through nodes during execution:
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">1</div>
                        <div>
                          <h4 className="font-medium text-sm">Node Initialization</h4>
                          <p className="text-xs text-muted-foreground">Each node receives user inputs and execution context</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-medium">2</div>
                        <div>
                          <h4 className="font-medium text-sm">Context Variables</h4>
                          <p className="text-xs text-muted-foreground">Previous node outputs available as context.variables['nodeId.outputName']</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-medium">3</div>
                        <div>
                          <h4 className="font-medium text-sm">Execute Function</h4>
                          <p className="text-xs text-muted-foreground">Node processes inputs and returns structured outputs</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-medium">4</div>
                        <div>
                          <h4 className="font-medium text-sm">Output Propagation</h4>
                          <p className="text-xs text-muted-foreground">Results stored in context for downstream nodes</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md text-sm font-mono">
                      <pre>{`// Example: How nodes access previous outputs
async execute(inputs, context) {
  // Access data from previous nodes
  const userData = context.variables['user-node.userData'];
  const apiKey = context.variables['auth-node.apiKey'];
  
  // Process the data
  const result = await processData(userData, apiKey);
  
  // Return outputs for next nodes
  return {
    processedData: result,
    timestamp: new Date().toISOString(),
    recordCount: result.length
  };
}`}</pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Puzzle className="h-5 w-5 text-indigo-500" />
                      Integration Registry System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      How integrations are registered and managed in the system:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Node Registration</h4>
                        <div className="bg-muted p-3 rounded text-xs font-mono">
                          <pre>{`// src/lib/register-nodes.ts
import { nodeRegistry } from './node-registry';
import { airtableNode } from '@/nodes/airtable';

nodeRegistry.register(airtableNode);`}</pre>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Database Integration</h4>
                        <div className="bg-muted p-3 rounded text-xs font-mono">
                          <pre>{`// Stored in integrations table
{
  name: 'Airtable',
  category: 'database',
  node_type: 'airtable',
  requires_installation: true,
  is_integrated: false
}`}</pre>
                        </div>
                      </div>
                    </div>

                    <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-md">
                      <p className="text-sm font-medium text-yellow-900 mb-2">Developer Note:</p>
                      <p className="text-xs text-yellow-800">
                        When you create a new integration node, it automatically appears in the 
                        integrations database. The install/uninstall buttons and user management 
                        are handled by the system - you only need to focus on the node logic.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Error Handling & Debugging
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Built-in error handling and debugging capabilities:
                    </p>
                    
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <span className="font-medium">Automatic Error Catching:</span>
                          <span className="text-muted-foreground ml-1">Node execution errors are caught and logged</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <span className="font-medium">Flow Debugging:</span>
                          <span className="text-muted-foreground ml-1">Real-time execution logs and data inspection</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <span className="font-medium">Node State Tracking:</span>
                          <span className="text-muted-foreground ml-1">Visual indicators for disabled/error states</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <span className="font-medium">Performance Monitoring:</span>
                          <span className="text-muted-foreground ml-1">Execution time and memory usage tracking</span>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Creating Nodes Section */}
          {activeSection === 'creating-nodes' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold mb-4">Creating Custom Nodes</h1>
                <p className="text-muted-foreground mb-6">
                  Step-by-step guide to building your own nodes.
                </p>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Step 1: Define the Node</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono">
                      <pre>{`// src/nodes/my-service/index.ts
export const myServiceNode: NodePlugin = {
  type: 'my-service',
  name: 'My Service',
  description: 'Connect to my custom service',
  category: 'action',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true
    }
  ],
  async execute(inputs, context) {
    // Implementation here
    return { result: 'success' };
  }
};`}</pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Step 2: Register the Node</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono">
                      <pre>{`// src/lib/register-nodes.ts
import { myServiceNode } from '@/nodes/my-service';

nodeRegistry.register(myServiceNode);`}</pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Examples Section */}
          {activeSection === 'examples' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold mb-4">Node Examples</h1>
                <p className="text-muted-foreground mb-6">
                  Real-world examples of different node types.
                </p>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>HTTP Request Node</CardTitle>
                    <CardDescription>Basic API call functionality</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto">
                      <pre>{`const httpRequestNode: NodePlugin = {
  type: 'http-request',
  name: 'HTTP Request',
  category: 'action',
  inputs: [
    { name: 'url', label: 'URL', type: 'text', required: true },
    { name: 'method', label: 'Method', type: 'select', 
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' }
      ]
    }
  ],
  async execute(inputs) {
    const response = await fetch(inputs.url, {
      method: inputs.method
    });
    return { data: await response.json() };
  }
};`}</pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Filter Node</CardTitle>
                    <CardDescription>Transform and filter data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto">
                      <pre>{`const dataFilterNode: NodePlugin = {
  type: 'data-filter',
  name: 'Data Filter',
  category: 'transformer',
  inputs: [
    { name: 'data', label: 'Input Data', type: 'variable' },
    { name: 'condition', label: 'Filter Condition', type: 'code' }
  ],
  async execute(inputs) {
    const data = inputs.data;
    const filterFn = new Function('item', inputs.condition);
    const filtered = data.filter(filterFn);
    return { filtered };
  }
};`}</pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Database Integrations Section */}
          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-4">Database Integrations</h1>
                <p className="text-muted-foreground mb-6">
                  Track and manage the implementation status of database integrations like Airtable, MongoDB, etc.
                </p>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search integrations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">
                    All ({integrations.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({integrations.filter(i => i.is_integrated).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {(() => {
                    const list = integrations.filter(i =>
                      (!searchQuery || (
                        i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        i.category?.toLowerCase().includes(searchQuery.toLowerCase())
                      ))
                    );
                    if (list.length === 0) {
                      return (
                        <Card>
                          <CardContent className="p-6 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Database className="h-12 w-12 text-muted-foreground" />
                              <div>
                                <h3 className="font-semibold">No integrations found</h3>
                                <p className="text-sm text-muted-foreground">
                                  {searchQuery ? 'Try adjusting your search terms.' : 'Database integrations will appear here once they are added to the system.'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    const groupedIntegrations = groupIntegrationsByPriority(list);
                    
                    return (
                      <div className="space-y-6">
                        {groupedIntegrations.map(({ priority, integrations }) => (
                          <div key={priority}>
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-lg font-semibold">
                                {priority > 0 ? `Priority ${priority}` : 'Standard Priority'}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {integrations.length} integration{integrations.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {integrations.map((integration) => (
                                <Card key={integration.id}>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        {integration.icon ? (
                                          <img 
                                            src={integration.icon} 
                                            alt={integration.name} 
                                            className="w-12 h-12 rounded-lg"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Database className="h-6 w-6 text-muted-foreground" />
                                          </div>
                                        )}
                                        
                                        <div>
                                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                                           <p className="text-sm text-muted-foreground line-clamp-2">
                                             {stripHtml(integration.description) || 'No description available'}
                                           </p>
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline">
                                              {integration.category}
                                            </Badge>
                                            {integration.node_type && (
                                              <Badge variant="secondary">
                                                Node: {integration.node_type}
                                              </Badge>
                                            )}
                                            {integration.requires_installation && (
                                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                Requires Installation
                                              </Badge>
                                            )}
                                            {priority > 0 && (
                                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                                Priority {priority}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          {integration.is_integrated ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                          ) : (
                                            <Circle className="h-5 w-5 text-muted-foreground" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {integration.is_integrated ? 'Integrated' : 'Not Integrated'}
                                          </span>
                                        </div>
                                        
                                        {user && (
                                          <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                              <label htmlFor={`toggle-${integration.id}`} className="text-sm">
                                                Mark as integrated
                                              </label>
                                              <Switch
                                                id={`toggle-${integration.id}`}
                                                checked={integration.is_integrated}
                                                onCheckedChange={() => 
                                                  toggleIntegrationStatus(integration.id, integration.is_integrated)
                                                }
                                              />
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <label htmlFor={`priority-${integration.id}`} className="text-sm">
                                                Priority
                                              </label>
                                              <Input
                                                id={`priority-${integration.id}`}
                                                type="number"
                                                value={integration.priority || 0}
                                                onChange={(e) => 
                                                  updateIntegrationPriority(integration.id, parseInt(e.target.value) || 0)
                                                }
                                                className="w-20"
                                                min="0"
                                                max="10"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  {(() => {
                    const list = integrations.filter(i => i.is_integrated && (!searchQuery || (
                      i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      i.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      i.category?.toLowerCase().includes(searchQuery.toLowerCase())
                    )));
                    if (list.length === 0) {
                      return (
                        <Card>
                          <CardContent className="p-6 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Database className="h-12 w-12 text-muted-foreground" />
                              <div>
                                <h3 className="font-semibold">No completed integrations</h3>
                                <p className="text-sm text-muted-foreground">
                                  Mark an integration as integrated to see it here.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    const groupedIntegrations = groupIntegrationsByPriority(list);
                    
                    return (
                      <div className="space-y-6">
                        {groupedIntegrations.map(({ priority, integrations }) => (
                          <div key={priority}>
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-lg font-semibold">
                                {priority > 0 ? `Priority ${priority}` : 'Standard Priority'}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {integrations.length} integration{integrations.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {integrations.map((integration) => (
                                <Card key={integration.id}>
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        {integration.icon ? (
                                          <img 
                                            src={integration.icon} 
                                            alt={integration.name} 
                                            className="w-12 h-12 rounded-lg"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Database className="h-6 w-6 text-muted-foreground" />
                                          </div>
                                        )}
                                        
                                        <div>
                                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                                           <p className="text-sm text-muted-foreground line-clamp-2">
                                             {stripHtml(integration.description) || 'No description available'}
                                           </p>
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline">
                                              {integration.category}
                                            </Badge>
                                            {integration.node_type && (
                                              <Badge variant="secondary">
                                                Node: {integration.node_type}
                                              </Badge>
                                            )}
                                            {priority > 0 && (
                                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                                Priority {priority}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {user && (
                                        <div className="flex items-center gap-2">
                                          <label htmlFor={`toggle-${integration.id}`} className="text-sm">
                                            Mark as integrated
                                          </label>
                                          <Switch
                                            id={`toggle-${integration.id}`}
                                            checked={integration.is_integrated}
                                            onCheckedChange={() => 
                                              toggleIntegrationStatus(integration.id, integration.is_integrated)
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}