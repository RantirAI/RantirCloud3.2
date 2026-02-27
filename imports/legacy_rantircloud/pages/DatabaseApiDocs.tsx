import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Database, Table, FileJson, Key, Webhook, BarChart3, Code, Book, Zap, Play, Loader2, AlertTriangle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = 'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/database-api';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  canRun?: boolean;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  onRun?: () => void;
  isRunning?: boolean;
}

function CodeBlock({ code, language = 'bash', title, canRun, method, endpoint, onRun, isRunning }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Only allow running GET requests
  const showRunButton = canRun && method === 'GET' && onRun;
  const isPostMethod = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  return (
    <div className="relative group">
      {title && (
        <div className="px-4 py-2 bg-muted/50 border-b text-sm font-medium rounded-t-lg flex items-center justify-between">
          <span>{title}</span>
          {isPostMethod && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Run disabled for {method}
            </span>
          )}
        </div>
      )}
      <pre className={`p-4 bg-muted rounded-${title ? 'b-' : ''}lg overflow-x-auto text-sm`}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showRunButton && (
          <Button
            variant="default"
            size="sm"
            onClick={onRun}
            disabled={isRunning}
            className="h-7"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Run
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  scope?: string;
  children?: React.ReactNode;
}

function Endpoint({ method, path, description, scope, children }: EndpointProps) {
  const methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-500',
    PUT: 'bg-yellow-500',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500',
  };
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Badge className={`${methodColors[method]} text-white text-xs`}>{method}</Badge>
          <code className="text-xs font-mono">{path}</code>
          {scope && <Badge variant="outline" className="ml-auto text-xs">{scope}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
      </div>
      {children && <div className="p-3 border-t border-border/50">{children}</div>}
    </div>
  );
}

// Search index for all documentation content
const searchableContent = [
  { id: 'getting-started', keywords: ['start', 'begin', 'quick', 'base url', 'first request', 'api key', 'introduction'], title: 'Getting Started', description: 'Learn how to get started with the Database API' },
  { id: 'authentication', keywords: ['auth', 'api key', 'jwt', 'token', 'bearer', 'x-api-key', 'scopes', 'read', 'write', 'delete', 'schema', 'admin', 'security'], title: 'Authentication', description: 'API Key and JWT authentication methods' },
  { id: 'databases', keywords: ['database', 'create database', 'delete database', 'list databases', 'update database'], title: 'Databases', description: 'Manage your databases via API' },
  { id: 'tables', keywords: ['table', 'schema', 'fields', 'create table', 'delete table', 'columns', 'field types'], title: 'Tables', description: 'Table and schema management endpoints' },
  { id: 'records', keywords: ['record', 'row', 'data', 'crud', 'create record', 'update record', 'delete record', 'get record', 'bulk', 'batch'], title: 'Records', description: 'CRUD operations for table records' },
  { id: 'filtering', keywords: ['filter', 'sort', 'pagination', 'limit', 'offset', 'cursor', 'query', 'search', 'contains', 'equals', 'greater', 'less'], title: 'Filtering & Sorting', description: 'Query records with filters and sorting' },
  { id: 'webhooks', keywords: ['webhook', 'event', 'trigger', 'notification', 'callback', 'created', 'updated', 'deleted', 'signature', 'hmac'], title: 'Webhooks', description: 'Real-time event notifications' },
  { id: 'examples', keywords: ['example', 'code', 'javascript', 'python', 'curl', 'fetch', 'axios', 'requests', 'sample', 'run', 'test'], title: 'Code Examples', description: 'Ready-to-use code examples with live testing' },
  { id: 'errors', keywords: ['error', 'status', 'code', '400', '401', '403', '404', '429', '500', 'rate limit', 'unauthorized', 'forbidden'], title: 'Error Handling', description: 'Error codes and troubleshooting' },
];

interface DatabaseInfo {
  id: string;
  name: string;
}

interface TableInfo {
  id: string;
  name: string;
}

interface ApiResult {
  success: boolean;
  data?: any;
  error?: any;
  meta?: any;
}

export default function DatabaseApiDocs() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Database and table selection for running examples
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [resultLimit, setResultLimit] = useState(5);
  const [resultOffset, setResultOffset] = useState(0);
  
  // Fetch user's databases
  useEffect(() => {
    if (user) {
      supabase
        .from('databases')
        .select('id, name')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setDatabases(data);
            if (data.length > 0) {
              setSelectedDatabase(data[0].id);
            }
          }
        });
    }
  }, [user]);
  
  // Fetch tables when database is selected
  useEffect(() => {
    if (selectedDatabase) {
      supabase
        .from('table_projects')
        .select('id, name')
        .eq('database_id', selectedDatabase)
        .then(({ data, error }) => {
          if (!error && data) {
            setTables(data);
            if (data.length > 0) {
              setSelectedTable(data[0].id);
            } else {
              setSelectedTable('');
            }
          }
        });
    }
  }, [selectedDatabase]);
  
  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: Zap },
    { id: 'authentication', label: 'Authentication', icon: Key },
    { id: 'databases', label: 'Databases', icon: Database },
    { id: 'tables', label: 'Tables', icon: Table },
    { id: 'records', label: 'Records', icon: FileJson },
    { id: 'filtering', label: 'Filtering & Sorting', icon: BarChart3 },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'examples', label: 'Code Examples', icon: Code },
    { id: 'errors', label: 'Error Handling', icon: Book },
  ];
  
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return searchableContent.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  }, [searchQuery]);
  
  const handleSearchSelect = (sectionId: string) => {
    setActiveSection(sectionId);
    setSearchQuery('');
    setShowSearchResults(false);
  };
  
  // Run API example (GET only)
  const runExample = async (endpoint: string, method: 'GET') => {
    if (!user) {
      toast.error('Please log in to run examples');
      return;
    }
    
    setIsRunning(true);
    setApiResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No active session');
        return;
      }
      
      // Build the full URL with pagination
      let url = `${API_BASE_URL}${endpoint}`;
      if (endpoint.includes('/records')) {
        url += `?limit=${resultLimit}&offset=${resultOffset}`;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      setApiResult(result);
      
      if (result.success) {
        toast.success('API call successful!');
      } else {
        toast.error(result.error?.message || 'API call failed');
      }
    } catch (error: any) {
      setApiResult({ success: false, error: { message: error.message } });
      toast.error('Failed to run example');
    } finally {
      setIsRunning(false);
    }
  };
  
  // Pagination helpers
  const totalResults = apiResult?.meta?.total || 0;
  const hasMore = apiResult?.meta?.hasMore || false;
  const canGoPrev = resultOffset > 0;
  const canGoNext = hasMore || (totalResults > resultOffset + resultLimit);
  
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header - matching Flows page style */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-tiempos font-light text-foreground">API Documentation</h1>
            <p className="text-sm text-muted-foreground mt-1">Complete reference for the Rantir Database API</p>
          </div>
        </div>
        
        {/* Main content with sidebar */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-white dark:bg-zinc-800 border border-border/50 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:text-foreground'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>
          
          {/* Content */}
          <main className="flex-1 max-w-4xl">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {activeSection === 'getting-started' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Getting Started</h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      The Rantir Database API allows you to programmatically access and manage your databases,
                      tables, and records. Use it to build integrations, automate workflows, or power your applications.
                    </p>
                    
                    <Card className="bg-white dark:bg-zinc-800 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Base URL</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock code={API_BASE_URL} />
                      </CardContent>
                    </Card>
                  </section>
                  
                  <section>
                    <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
                    <div className="space-y-3">
                      <Card className="bg-white dark:bg-zinc-800 border-border/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">1. Create an API Key</CardTitle>
                          <CardDescription className="text-xs">
                            Go to your database settings and create an API key with the appropriate scopes.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <Card className="bg-white dark:bg-zinc-800 border-border/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">2. Make Your First Request</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CodeBlock
                            language="bash"
                            code={`curl -X GET "${API_BASE_URL}/databases" \\
  -H "X-API-Key: rdb_your_api_key_here"`}
                          />
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white dark:bg-zinc-800 border-border/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">3. Explore the API</CardTitle>
                          <CardDescription className="text-xs">
                            Check out the endpoints below to see what you can do with the API.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </section>
                  
                  {/* Rate Limiting Info */}
                  <section>
                    <Card className="border-amber-500/50 bg-white dark:bg-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          Rate Limiting
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          The API has rate limits to ensure fair usage. Default limits per API key:
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="font-medium">60 requests/minute</div>
                            <div className="text-muted-foreground">Per API key</div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="font-medium">10,000 requests/day</div>
                            <div className="text-muted-foreground">Per API key</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Headers <code className="bg-muted px-1 rounded">X-RateLimit-Remaining</code> and <code className="bg-muted px-1 rounded">X-RateLimit-Reset</code> are included in responses.
                        </p>
                      </CardContent>
                    </Card>
                  </section>
                </div>
              )}
              
              {activeSection === 'authentication' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Authentication</h2>
                    <p className="text-muted-foreground mb-6">
                      The API supports two authentication methods: API Keys and JWT tokens.
                    </p>
                    
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>API Key Authentication</CardTitle>
                          <CardDescription>
                            Recommended for server-to-server communication
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CodeBlock
                            language="bash"
                            code={`curl -X GET "${API_BASE_URL}/databases" \\
  -H "X-API-Key: rdb_your_api_key_here"`}
                          />
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Scopes</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 border rounded-lg">
                                <Badge>read</Badge>
                                <p className="text-sm text-muted-foreground mt-1">Read databases, tables, and records</p>
                              </div>
                              <div className="p-3 border rounded-lg">
                                <Badge>write</Badge>
                                <p className="text-sm text-muted-foreground mt-1">Create and update records</p>
                              </div>
                              <div className="p-3 border rounded-lg">
                                <Badge>delete</Badge>
                                <p className="text-sm text-muted-foreground mt-1">Delete records, tables, databases</p>
                              </div>
                              <div className="p-3 border rounded-lg">
                                <Badge>schema</Badge>
                                <p className="text-sm text-muted-foreground mt-1">Modify table schemas</p>
                              </div>
                              <div className="p-3 border rounded-lg col-span-2">
                                <Badge variant="destructive">admin</Badge>
                                <p className="text-sm text-muted-foreground mt-1">Full access to all operations</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>JWT Authentication</CardTitle>
                          <CardDescription>
                            For browser-based applications using Supabase Auth
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CodeBlock
                            language="bash"
                            code={`curl -X GET "${API_BASE_URL}/databases" \\
  -H "Authorization: Bearer your_jwt_token_here"`}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </section>
                </div>
              )}
              
              {activeSection === 'databases' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Databases</h2>
                    <p className="text-muted-foreground mb-6">
                      Endpoints for managing your databases.
                    </p>
                    
                    <div className="space-y-4">
                      <Endpoint
                        method="GET"
                        path="/databases"
                        description="List all databases accessible to your API key"
                        scope="read"
                      >
                        <CodeBlock
                          title="Response"
                          language="json"
                          code={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Database",
      "description": "Description",
      "color": "#3B82F6",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 1 }
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="GET"
                        path="/databases/:id"
                        description="Get a specific database by ID"
                        scope="read"
                      />
                      
                      <Endpoint
                        method="POST"
                        path="/databases"
                        description="Create a new database"
                        scope="write"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="POST"
                          code={`{
  "name": "My New Database",
  "description": "Optional description",
  "color": "#3B82F6"
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="PUT"
                        path="/databases/:id"
                        description="Update a database"
                        scope="write"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="PUT"
                          code={`{
  "name": "Updated Database Name",
  "description": "Updated description",
  "color": "#10B981"
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="DELETE"
                        path="/databases/:id"
                        description="Delete a database and all its tables"
                        scope="delete"
                      />
                    </div>
                  </section>
                </div>
              )}
              
              {activeSection === 'tables' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Tables</h2>
                    <p className="text-muted-foreground mb-6">
                      Endpoints for managing tables and their schemas.
                    </p>
                    
                    <div className="space-y-4">
                      <Endpoint
                        method="GET"
                        path="/tables"
                        description="List all tables. Use ?database_id=uuid to filter by database."
                        scope="read"
                      />
                      
                      <Endpoint
                        method="GET"
                        path="/tables/:id"
                        description="Get a specific table with its schema"
                        scope="read"
                      />
                      
                      <Endpoint
                        method="POST"
                        path="/tables"
                        description="Create a new table"
                        scope="schema"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="POST"
                          code={`{
  "name": "Contacts",
  "description": "Customer contacts",
  "database_id": "uuid",
  "schema": {
    "fields": [
      { "name": "name", "type": "text", "required": true },
      { "name": "email", "type": "email", "required": true },
      { "name": "phone", "type": "phone" },
      { "name": "status", "type": "select", "options": ["active", "inactive"] }
    ]
  }
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="GET"
                        path="/tables/:id/schema"
                        description="Get the schema of a table"
                        scope="read"
                      />
                      
                      <Endpoint
                        method="PUT"
                        path="/tables/:id/schema"
                        description="Update the schema of a table"
                        scope="schema"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="PUT"
                          code={`{
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "email", "type": "email", "required": true },
    { "name": "phone", "type": "phone" },
    { "name": "status", "type": "select", "options": ["active", "inactive", "pending"] },
    { "name": "notes", "type": "text" }
  ]
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="DELETE"
                        path="/tables/:id"
                        description="Delete a table and all its records"
                        scope="delete"
                      />
                    </div>
                  </section>
                </div>
              )}
              
              {activeSection === 'records' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Records</h2>
                    <p className="text-muted-foreground mb-6">
                      CRUD operations for table records.
                    </p>
                    
                    <div className="space-y-4">
                      <Endpoint
                        method="GET"
                        path="/tables/:tableId/records"
                        description="List records with filtering, sorting, and pagination"
                        scope="read"
                      >
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Query Parameters</h4>
                            <div className="grid gap-2 text-sm">
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>filter[field]</code>
                                <span className="col-span-2">Filter by field value</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>sort</code>
                                <span className="col-span-2">Field to sort by</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>order</code>
                                <span className="col-span-2">asc or desc</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>limit</code>
                                <span className="col-span-2">Number of records (default: 25, max: 100)</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>offset</code>
                                <span className="col-span-2">Skip N records for pagination</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded">
                                <code>fields</code>
                                <span className="col-span-2">Comma-separated field names</span>
                              </div>
                            </div>
                          </div>
                          <CodeBlock
                            title="Response with Pagination"
                            language="json"
                            code={`{
  "success": true,
  "data": [
    { "id": "rec_1", "name": "John", "email": "john@example.com" },
    { "id": "rec_2", "name": "Jane", "email": "jane@example.com" }
  ],
  "meta": {
    "total": 150,
    "limit": 25,
    "offset": 0,
    "hasMore": true
  }
}`}
                          />
                        </div>
                      </Endpoint>
                      
                      <Endpoint
                        method="GET"
                        path="/tables/:tableId/records/:recordId"
                        description="Get a specific record by ID"
                        scope="read"
                      >
                        <CodeBlock
                          title="Response"
                          language="json"
                          code={`{
  "success": true,
  "data": {
    "id": "rec_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-15T08:30:00Z"
  }
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="POST"
                        path="/tables/:tableId/records"
                        description="Create one or more records"
                        scope="write"
                      >
                        <Tabs defaultValue="single">
                          <TabsList>
                            <TabsTrigger value="single">Single Record</TabsTrigger>
                            <TabsTrigger value="bulk">Bulk Insert</TabsTrigger>
                          </TabsList>
                          <TabsContent value="single">
                            <CodeBlock
                              language="json"
                              method="POST"
                              code={`{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active"
}`}
                            />
                          </TabsContent>
                          <TabsContent value="bulk">
                            <CodeBlock
                              language="json"
                              method="POST"
                              code={`[
  { "name": "John Doe", "email": "john@example.com" },
  { "name": "Jane Doe", "email": "jane@example.com" }
]`}
                            />
                          </TabsContent>
                        </Tabs>
                      </Endpoint>
                      
                      <Endpoint
                        method="PUT"
                        path="/tables/:tableId/records/:recordId"
                        description="Update a record (full replace)"
                        scope="write"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="PUT"
                          code={`{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "status": "active",
  "phone": "+1234567890"
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="PATCH"
                        path="/tables/:tableId/records/:recordId"
                        description="Partially update a record (only provided fields)"
                        scope="write"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="PATCH"
                          code={`{
  "status": "inactive"
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="DELETE"
                        path="/tables/:tableId/records/:recordId"
                        description="Delete a single record"
                        scope="delete"
                      />
                      
                      <Endpoint
                        method="DELETE"
                        path="/tables/:tableId/records"
                        description="Bulk delete records"
                        scope="delete"
                      >
                        <CodeBlock
                          title="Request Body"
                          language="json"
                          method="DELETE"
                          code={`{
  "ids": ["uuid1", "uuid2", "uuid3"]
}`}
                        />
                      </Endpoint>
                    </div>
                  </section>
                </div>
              )}
              
              {activeSection === 'filtering' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Filtering & Sorting</h2>
                    <p className="text-muted-foreground mb-6">
                      Use query parameters to filter, sort, and paginate records.
                    </p>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Filter Operators</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {[
                            { op: '$eq', desc: 'Equals', example: 'filter[status][$eq]=active' },
                            { op: '$ne', desc: 'Not equals', example: 'filter[status][$ne]=deleted' },
                            { op: '$gt', desc: 'Greater than', example: 'filter[price][$gt]=100' },
                            { op: '$gte', desc: 'Greater than or equal', example: 'filter[price][$gte]=100' },
                            { op: '$lt', desc: 'Less than', example: 'filter[price][$lt]=100' },
                            { op: '$lte', desc: 'Less than or equal', example: 'filter[price][$lte]=100' },
                            { op: '$contains', desc: 'Contains substring', example: 'filter[name][$contains]=john' },
                            { op: '$startsWith', desc: 'Starts with', example: 'filter[name][$startsWith]=john' },
                            { op: '$endsWith', desc: 'Ends with', example: 'filter[email][$endsWith]=@gmail.com' },
                            { op: '$in', desc: 'In array', example: 'filter[status][$in]=active,pending' },
                            { op: '$nin', desc: 'Not in array', example: 'filter[status][$nin]=deleted,archived' },
                            { op: '$exists', desc: 'Field exists', example: 'filter[phone][$exists]=true' },
                          ].map((item) => (
                            <div key={item.op} className="grid grid-cols-4 gap-4 p-2 bg-muted rounded text-sm">
                              <code className="font-mono">{item.op}</code>
                              <span>{item.desc}</span>
                              <code className="col-span-2 text-xs">{item.example}</code>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Sorting</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock
                          code={`# Sort by name ascending
GET /tables/:id/records?sort=name&order=asc

# Sort by created date descending
GET /tables/:id/records?sort=createdAt&order=desc`}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Pagination</CardTitle>
                        <CardDescription>
                          Use limit and offset to paginate through large result sets
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock
                          code={`# Get first 10 records
GET /tables/:id/records?limit=10

# Get records 11-20
GET /tables/:id/records?limit=10&offset=10

# Get records 21-30
GET /tables/:id/records?limit=10&offset=20

# Response includes pagination metadata
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 10,
    "hasMore": true
  }
}`}
                        />
                      </CardContent>
                    </Card>
                  </section>
                </div>
              )}
              
              {activeSection === 'webhooks' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Webhooks</h2>
                    <p className="text-muted-foreground mb-6">
                      Receive real-time notifications when data changes in your tables.
                    </p>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Available Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          <div className="p-3 border rounded-lg">
                            <Badge>record.created</Badge>
                            <p className="text-sm text-muted-foreground mt-1">Triggered when a new record is created</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <Badge>record.updated</Badge>
                            <p className="text-sm text-muted-foreground mt-1">Triggered when a record is updated</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <Badge>record.deleted</Badge>
                            <p className="text-sm text-muted-foreground mt-1">Triggered when a record is deleted</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Webhook Payload</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock
                          language="json"
                          code={`{
  "event": "record.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}`}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Signature Verification</CardTitle>
                        <CardDescription>
                          If you set a secret, we'll include an X-Webhook-Signature header
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock
                          language="javascript"
                          title="Node.js Verification"
                          code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === \`sha256=\${expectedSignature}\`;
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, YOUR_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});`}
                        />
                      </CardContent>
                    </Card>
                    
                    <div className="space-y-4 mt-6">
                      <h3 className="text-xl font-semibold">Webhook Endpoints</h3>
                      
                      <Endpoint
                        method="GET"
                        path="/webhooks"
                        description="List all webhooks"
                      />
                      
                      <Endpoint
                        method="POST"
                        path="/webhooks"
                        description="Create a new webhook"
                      >
                        <CodeBlock
                          language="json"
                          method="POST"
                          code={`{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "database_id": "uuid",
  "table_id": "uuid",
  "events": ["record.created", "record.updated"],
  "secret": "optional_secret_for_signature"
}`}
                        />
                      </Endpoint>
                      
                      <Endpoint
                        method="POST"
                        path="/webhooks/:id/test"
                        description="Send a test webhook delivery"
                      />
                      
                      <Endpoint
                        method="GET"
                        path="/webhooks/:id/deliveries"
                        description="Get delivery history for a webhook"
                      />
                    </div>
                  </section>
                </div>
              )}
              
              {activeSection === 'examples' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Code Examples</h2>
                    <p className="text-muted-foreground mb-6">
                      Ready-to-use examples in popular languages. {user ? 'You can run GET examples using your actual data.' : 'Log in to run examples with your data.'}
                    </p>
                    
                    {/* Database/Table Selector for logged-in users */}
                    {user && (
                      <Card className="mb-6 border-primary/20 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            Run Examples with Your Data
                          </CardTitle>
                          <CardDescription>
                            Select a database and table to test GET requests. POST/PUT/DELETE are disabled to prevent accidental data changes.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-sm font-medium mb-2 block">Database</label>
                              <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select database" />
                                </SelectTrigger>
                                <SelectContent>
                                  {databases.map((db) => (
                                    <SelectItem key={db.id} value={db.id}>
                                      {db.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-sm font-medium mb-2 block">Table</label>
                              <Select value={selectedTable} onValueChange={setSelectedTable} disabled={!tables.length}>
                                <SelectTrigger>
                                  <SelectValue placeholder={tables.length ? "Select table" : "No tables"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {tables.map((table) => (
                                    <SelectItem key={table.id} value={table.id}>
                                      {table.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <label className="text-sm font-medium mb-2 block">Results per page</label>
                              <Select value={resultLimit.toString()} onValueChange={(v) => setResultLimit(Number(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5</SelectItem>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Rate limit warning */}
                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm flex items-start gap-2">
                            <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">Rate limits apply:</strong> Running examples counts against your API rate limit (60 req/min).
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* API Result Display */}
                    {apiResult && (
                      <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-base">
                            {apiResult.success ? (
                              <span className="text-green-600 flex items-center gap-2">
                                <Check className="h-4 w-4" /> Response
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-2">
                                <X className="h-4 w-4" /> Error
                              </span>
                            )}
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setApiResult(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm max-h-96">
                            {JSON.stringify(apiResult, null, 2)}
                          </pre>
                          
                          {/* Pagination controls */}
                          {apiResult.success && apiResult.meta && (
                            <div className="mt-4 flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                Showing {resultOffset + 1} - {Math.min(resultOffset + resultLimit, apiResult.meta.total || 0)} of {apiResult.meta.total || 0} records
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canGoPrev || isRunning}
                                  onClick={() => {
                                    setResultOffset(Math.max(0, resultOffset - resultLimit));
                                    runExample(`/tables/${selectedTable}/records`, 'GET');
                                  }}
                                >
                                  Previous
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canGoNext || isRunning}
                                  onClick={() => {
                                    setResultOffset(resultOffset + resultLimit);
                                    runExample(`/tables/${selectedTable}/records`, 'GET');
                                  }}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    <Tabs defaultValue="javascript">
                      <TabsList className="mb-4">
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="javascript" className="space-y-4">
                        {/* List Records */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>List Records (GET)</span>
                              {user && selectedTable && (
                                <Button
                                  size="sm"
                                  onClick={() => runExample(`/tables/${selectedTable}/records`, 'GET')}
                                  disabled={isRunning || !selectedTable}
                                >
                                  {isRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                                  Run
                                </Button>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              code={`const API_KEY = 'rdb_your_api_key';
const BASE_URL = '${API_BASE_URL}';

async function listRecords(tableId, options = {}) {
  const params = new URLSearchParams();
  
  // Pagination
  params.set('limit', options.limit || 25);
  params.set('offset', options.offset || 0);
  
  // Sorting
  if (options.sort) params.set('sort', options.sort);
  if (options.order) params.set('order', options.order);
  
  // Add filters
  if (options.filters) {
    for (const [field, value] of Object.entries(options.filters)) {
      if (typeof value === 'object') {
        for (const [op, val] of Object.entries(value)) {
          params.set(\`filter[\${field}][\${op}]\`, val);
        }
      } else {
        params.set(\`filter[\${field}]\`, value);
      }
    }
  }
  
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records?\${params}\`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  return response.json();
}

// Usage with pagination
const result = await listRecords('${selectedTable || 'table-uuid'}', {
  limit: ${resultLimit},
  offset: 0,
  sort: 'createdAt',
  order: 'desc',
  filters: { status: 'active' }
});`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Get Single Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Get Single Record (GET)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              code={`async function getRecord(tableId, recordId) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records/\${recordId}\`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  return response.json();
}

// Usage
const record = await getRecord('table-uuid', 'record-uuid');`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Create Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Create Record (POST)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              method="POST"
                              code={`async function createRecord(tableId, data) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records\`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  
  return response.json();
}

// Usage
const newRecord = await createRecord('table-uuid', {
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active'
});`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Update Record (PUT) */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Update Record - Full Replace (PUT)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              method="PUT"
                              code={`async function updateRecord(tableId, recordId, data) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'PUT',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  
  return response.json();
}

// Usage - replaces entire record
const updated = await updateRecord('table-uuid', 'record-uuid', {
  name: 'John Smith',
  email: 'john.smith@example.com',
  status: 'active'
});`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Partial Update (PATCH) */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Partial Update (PATCH)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              method="PATCH"
                              code={`async function patchRecord(tableId, recordId, updates) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'PATCH',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  return response.json();
}

// Usage - only updates specified fields
const patched = await patchRecord('table-uuid', 'record-uuid', {
  status: 'inactive'
});`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Delete Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Delete Record (DELETE)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              method="DELETE"
                              code={`async function deleteRecord(tableId, recordId) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records/\${recordId}\`,
    {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY }
    }
  );
  
  return response.json();
}

// Usage
await deleteRecord('table-uuid', 'record-uuid');`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Bulk Delete */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Bulk Delete (DELETE)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="javascript"
                              method="DELETE"
                              code={`async function bulkDeleteRecords(tableId, recordIds) {
  const response = await fetch(
    \`\${BASE_URL}/tables/\${tableId}/records\`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: recordIds })
    }
  );
  
  return response.json();
}

// Usage
await bulkDeleteRecords('table-uuid', ['id1', 'id2', 'id3']);`}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="python" className="space-y-4">
                        {/* List Records */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">List Records with Pagination (GET)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="python"
                              code={`import requests

API_KEY = 'rdb_your_api_key'
BASE_URL = '${API_BASE_URL}'

def list_records(table_id, limit=25, offset=0, sort=None, order='asc', filters=None):
    params = {
        'limit': limit,
        'offset': offset
    }
    
    if sort:
        params['sort'] = sort
        params['order'] = order
    
    if filters:
        for field, value in filters.items():
            if isinstance(value, dict):
                for op, val in value.items():
                    params[f'filter[{field}][{op}]'] = val
            else:
                params[f'filter[{field}]'] = value
    
    response = requests.get(
        f'{BASE_URL}/tables/{table_id}/records',
        headers={'X-API-Key': API_KEY},
        params=params
    )
    
    return response.json()

# Usage with pagination
result = list_records(
    'table-uuid',
    limit=10,
    offset=0,
    sort='createdAt',
    order='desc',
    filters={'status': 'active'}
)

# Handle pagination
if result['meta']['hasMore']:
    next_page = list_records('table-uuid', limit=10, offset=10)`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Create Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Create Record (POST)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="python"
                              code={`def create_record(table_id, data):
    response = requests.post(
        f'{BASE_URL}/tables/{table_id}/records',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        json=data
    )
    
    return response.json()

# Usage
new_record = create_record('table-uuid', {
    'name': 'John Doe',
    'email': 'john@example.com',
    'status': 'active'
})`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Update Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Update Record (PUT)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="python"
                              code={`def update_record(table_id, record_id, data):
    response = requests.put(
        f'{BASE_URL}/tables/{table_id}/records/{record_id}',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        json=data
    )
    
    return response.json()

# Usage
updated = update_record('table-uuid', 'record-uuid', {
    'name': 'John Smith',
    'status': 'inactive'
})`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Partial Update */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Partial Update (PATCH)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="python"
                              code={`def patch_record(table_id, record_id, updates):
    response = requests.patch(
        f'{BASE_URL}/tables/{table_id}/records/{record_id}',
        headers={
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        },
        json=updates
    )
    
    return response.json()

# Usage - only update specific fields
patched = patch_record('table-uuid', 'record-uuid', {
    'status': 'inactive'
})`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Delete Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Delete Record (DELETE)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="python"
                              code={`def delete_record(table_id, record_id):
    response = requests.delete(
        f'{BASE_URL}/tables/{table_id}/records/{record_id}',
        headers={'X-API-Key': API_KEY}
    )
    
    return response.json()

# Usage
delete_record('table-uuid', 'record-uuid')`}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="curl" className="space-y-4">
                        {/* List Records */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">List Records with Pagination (GET)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`# List first 10 records
curl -X GET "${API_BASE_URL}/tables/TABLE_ID/records?limit=10&offset=0" \\
  -H "X-API-Key: rdb_your_api_key"

# List with filters and sorting
curl -X GET "${API_BASE_URL}/tables/TABLE_ID/records?limit=10&sort=createdAt&order=desc&filter[status]=active" \\
  -H "X-API-Key: rdb_your_api_key"

# Get next page (records 11-20)
curl -X GET "${API_BASE_URL}/tables/TABLE_ID/records?limit=10&offset=10" \\
  -H "X-API-Key: rdb_your_api_key"`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Get Single Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Get Single Record (GET)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X GET "${API_BASE_URL}/tables/TABLE_ID/records/RECORD_ID" \\
  -H "X-API-Key: rdb_your_api_key"`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Create Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Create Record (POST)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X POST "${API_BASE_URL}/tables/TABLE_ID/records" \\
  -H "X-API-Key: rdb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe", "email": "john@example.com", "status": "active"}'`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Update Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Update Record - Full Replace (PUT)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X PUT "${API_BASE_URL}/tables/TABLE_ID/records/RECORD_ID" \\
  -H "X-API-Key: rdb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Smith", "email": "john.smith@example.com", "status": "active"}'`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Partial Update */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Partial Update (PATCH)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X PATCH "${API_BASE_URL}/tables/TABLE_ID/records/RECORD_ID" \\
  -H "X-API-Key: rdb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "inactive"}'`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Delete Record */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Delete Record (DELETE)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X DELETE "${API_BASE_URL}/tables/TABLE_ID/records/RECORD_ID" \\
  -H "X-API-Key: rdb_your_api_key"`}
                            />
                          </CardContent>
                        </Card>
                        
                        {/* Bulk Delete */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              Bulk Delete (DELETE)
                              <Badge variant="outline" className="text-xs">Run disabled</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CodeBlock
                              language="bash"
                              code={`curl -X DELETE "${API_BASE_URL}/tables/TABLE_ID/records" \\
  -H "X-API-Key: rdb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"ids": ["uuid1", "uuid2", "uuid3"]}'`}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </section>
                </div>
              )}
              
              {activeSection === 'errors' && (
                <div className="space-y-8">
                  <section>
                    <h2 className="text-3xl font-bold mb-4">Error Handling</h2>
                    <p className="text-muted-foreground mb-6">
                      The API uses standard HTTP status codes and returns detailed error messages.
                    </p>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Error Response Format</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CodeBlock
                          language="json"
                          code={`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { }
  }
}`}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Error Codes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {[
                            { code: 'UNAUTHORIZED', status: 401, desc: 'Authentication required' },
                            { code: 'INVALID_API_KEY', status: 401, desc: 'API key is invalid or expired' },
                            { code: 'INVALID_TOKEN', status: 401, desc: 'JWT token is invalid or expired' },
                            { code: 'FORBIDDEN', status: 403, desc: 'API key does not have required scope' },
                            { code: 'NOT_FOUND', status: 404, desc: 'Resource not found' },
                            { code: 'VALIDATION_ERROR', status: 400, desc: 'Request validation failed' },
                            { code: 'RATE_LIMIT_EXCEEDED', status: 429, desc: 'Too many requests' },
                            { code: 'INTERNAL_ERROR', status: 500, desc: 'Server error' },
                          ].map((item) => (
                            <div key={item.code} className="grid grid-cols-4 gap-4 p-3 bg-muted rounded">
                              <code className="font-mono text-sm">{item.code}</code>
                              <Badge variant="outline">{item.status}</Badge>
                              <span className="col-span-2 text-sm">{item.desc}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Rate Limiting
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          When you exceed your rate limit, you'll receive a 429 response with a Retry-After header.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 border rounded-lg">
                            <div className="font-medium">Default Limits</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              60 requests/minute<br />
                              10,000 requests/day
                            </div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="font-medium">Response Headers</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              X-RateLimit-Remaining<br />
                              X-RateLimit-Reset
                            </div>
                          </div>
                        </div>
                        <CodeBlock
                          language="json"
                          code={`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 60,
      "remaining": 0,
      "resetAt": "2024-01-01T12:01:00Z"
    }
  }
}`}
                        />
                      </CardContent>
                    </Card>
                  </section>
                </div>
              )}
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
}
