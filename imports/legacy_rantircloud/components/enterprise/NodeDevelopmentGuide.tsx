import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, ExternalLink, Book, Zap, FileText, Github } from 'lucide-react';

export function NodeDevelopmentGuide() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            Custom Nodes Guide
          </h1>
          <p className="text-muted-foreground">
            Learn how to create custom nodes for the Rantir Flow Builder
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Enterprise Feature
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="api-reference">API Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What are Custom Nodes?</CardTitle>
              <CardDescription>
                Custom nodes extend the Flow Builder with new functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Custom nodes allow you to create reusable components that can be used in your flows. 
                Each node can have inputs, outputs, and custom execution logic.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Input Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Define input fields with validation, types, and dynamic options
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Custom Logic</h3>
                  <p className="text-sm text-muted-foreground">
                    Implement your business logic with full access to context and variables
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Output Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Return structured data that can be used by downstream nodes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <Book className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Documentation</div>
                      <div className="text-sm text-muted-foreground">Complete API reference</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Examples Repository</div>
                      <div className="text-sm text-muted-foreground">Sample node implementations</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="getting-started" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Creating Your First Node</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Follow these steps to create a custom node for your flows.
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold">Step 1: Define the Node Interface</h3>
                  <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto">
{`export const myCustomNode: NodePlugin = {
  type: 'my-custom-node',
  name: 'My Custom Node',
  description: 'Does something amazing',
  category: 'action',
  icon: Star,
  color: '#4CAF50',
  inputs: [...],
  outputs: [...],
  async execute(inputs, context) {
    // Your logic here
  }
};`}
                  </pre>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold">Step 2: Register Your Node</h3>
                  <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto">
{`import { nodeRegistry } from './node-registry';
import { myCustomNode } from './my-custom-node';

nodeRegistry.register(myCustomNode);`}
                  </pre>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold">Step 3: Test Your Node</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your node will now appear in the Flow Builder palette and can be used in flows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weather API Node</CardTitle>
                <CardDescription>Fetch weather data from external API</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Transform Node</CardTitle>
                <CardDescription>Transform data with custom JavaScript</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Query Node</CardTitle>
                <CardDescription>Execute custom database queries</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notification Node</CardTitle>
                <CardDescription>Send emails through various providers</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Example
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-reference" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>NodePlugin Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
{`interface NodePlugin {
  type: string;             // Unique identifier
  name: string;             // Display name
  description: string;      // Description
  category: 'trigger' | 'action' | 'condition' | 'transformer';
  icon?: any;               // Icon component
  color?: string;           // Node color
  inputs?: InputField[];    // Input configuration
  outputs?: OutputField[];  // Output configuration
  execute?: (inputs: Record<string, any>, context: Context) => Promise<Record<string, any>>;
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Input Field Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><code>text</code> - Text input field</div>
                  <div><code>select</code> - Dropdown selection</div>
                  <div><code>number</code> - Numeric input</div>
                  <div><code>code</code> - Code editor</div>
                  <div><code>variable</code> - Variable selector</div>
                  <div><code>boolean</code> - Checkbox input</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}