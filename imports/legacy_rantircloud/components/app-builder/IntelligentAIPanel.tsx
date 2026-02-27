import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { appBuilderService } from '@/services/appBuilderService';
import { 
  Brain, 
  Database, 
  Sparkles, 
  Wand2, 
  Loader2, 
  ArrowRight,
  LayoutGrid,
  Table,
  BarChart3,
  FileText,
  Eye,
  Zap
} from 'lucide-react';

export function IntelligentAIPanel() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  
  const { 
    addComponent, 
    currentProject, 
    currentPage, 
    selectedDatabaseId,
    selectedDatabaseName,
    updateComponent 
  } = useAppBuilderStore();

  useEffect(() => {
    loadAvailableTables();
  }, [currentProject]);

  const loadAvailableTables = async () => {
    if (!currentProject?.user_id) return;
    try {
      const tables = await appBuilderService.getDatabaseTables(currentProject.user_id);
      setAvailableTables(tables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const smartSuggestions = [
    {
      icon: LayoutGrid,
      title: "Dynamic Product Grid",
      description: "Create a responsive product showcase with data from your tables",
      prompt: "Create a dynamic product grid connected to my products table with cards showing image, name, price, and description. Include hover effects and responsive layout.",
      requiresData: true
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Build interactive charts and metrics from your data",
      prompt: "Build an analytics dashboard with charts showing sales trends, user engagement, and key metrics from my database tables.",
      requiresData: true
    },
    {
      icon: Table,
      title: "Data Table View",
      description: "Generate sortable, filterable table with your data",
      prompt: "Create a data table view for my selected database with sorting, filtering, search, and pagination. Include action buttons for each row.",
      requiresData: true
    },
    {
      icon: FileText,
      title: "Smart Form Builder",
      description: "Forms that automatically connect to your database",
      prompt: "Build a form that submits to my database with proper validation, field types matching my schema, and success feedback.",
      requiresData: true
    },
    {
      icon: Eye,
      title: "Hero Section",
      description: "Modern landing page header with animations",
      prompt: "Create a modern hero section with gradient background, compelling headline, subtitle, and call-to-action button. Include subtle animations.",
      requiresData: false
    },
    {
      icon: Zap,
      title: "Feature Showcase",
      description: "Highlight your app's key features beautifully",
      prompt: "Design a features section with icons, titles, descriptions, and hover effects. Make it modern and engaging.",
      requiresData: false
    }
  ];

  const handleSmartGenerate = async (suggestionPrompt?: string) => {
    const finalPrompt = suggestionPrompt || prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setIsAnalyzing(true);
    
    try {
      setIsAnalyzing(false);
      
      // Use progressive building approach instead of direct component addition
      const mockComponentData = {
        id: "ai-generated-section",
        type: "container",
        props: { className: "ai-generated-container" },
        style: {
          layout: { padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" },
          colors: { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" },
          effects: { borderRadius: "12px", border: "1px solid", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }
        },
        children: [
          {
            id: "generated-title",
            type: "text", 
            props: { content: "AI Generated Component", variant: "h2" },
            style: { typography: { fontSize: "24px", fontWeight: "700", color: "hsl(var(--foreground))" }, layout: { textAlign: "center", marginBottom: "12px" } }
          },
          {
            id: "generated-description",
            type: "text",
            props: { content: "This component was generated based on your request" },
            style: { typography: { fontSize: "16px", color: "hsl(var(--muted-foreground))" }, layout: { textAlign: "center", marginBottom: "16px" } }
          },
          {
            id: "generated-button",
            type: "button",
            props: { content: "Generated Button", variant: "default" },
            style: { colors: { backgroundColor: "hsl(var(--primary))", color: "white" }, effects: { borderRadius: "8px" }, layout: { alignSelf: "center", padding: "12px 24px" } }
          }
        ]
      };

      // Build the component progressively using the service
      const { contextAwareAIService } = await import('@/services/contextAwareAIService');
      await contextAwareAIService.buildComponentProgressively(
        mockComponentData,
        undefined, // No progress callback needed here
        () => {
          // Component built successfully, clear prompt
          setPrompt('');
        }
      );
    } catch (error) {
      console.error('Failed to generate components:', error);
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-primary" />
            Intelligent App Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedDatabaseId && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Connected to {selectedDatabaseName}
              </span>
            </div>
          )}
          
          <Textarea
            placeholder={selectedDatabaseId ? 
              "Build a dynamic product list from my data..." :
              "Create a modern hero section with..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          
          <Button
            onClick={() => handleSmartGenerate()}
            disabled={!prompt.trim() || loading}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing context...
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building app...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Build with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data">Data-Driven</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
            </TabsList>
            
            <TabsContent value="data" className="space-y-2 mt-3">
              {smartSuggestions
                .filter(s => s.requiresData)
                .map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-accent ${
                      !selectedDatabaseId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => selectedDatabaseId && handleSmartGenerate(suggestion.prompt)}
                  >
                    <div className="flex items-start gap-3">
                      <suggestion.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                      {selectedDatabaseId && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    {!selectedDatabaseId && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Connect a database first
                      </Badge>
                    )}
                  </div>
                ))}
            </TabsContent>
            
            <TabsContent value="design" className="space-y-2 mt-3">
              {smartSuggestions
                .filter(s => !s.requiresData)
                .map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg cursor-pointer transition-all hover:bg-accent"
                    onClick={() => handleSmartGenerate(suggestion.prompt)}
                  >
                    <div className="flex items-start gap-3">
                      <suggestion.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {availableTables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary" />
              Available Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableTables.map((table, index) => (
                <div key={index} className="p-2 bg-muted/50 rounded">
                  <div className="font-medium text-sm">{table.name}</div>
                  {table.table_projects && table.table_projects.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {table.table_projects.map((tp: any) => tp.name).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}