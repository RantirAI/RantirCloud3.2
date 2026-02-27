
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Wand2, Code, Eye } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { appBuilderService } from '@/services/appBuilderService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AIComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIComponentDialog({ open, onOpenChange }: AIComponentDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedComponent, setGeneratedComponent] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { 
    addComponent, 
    currentProject, 
    currentPage, 
    selectedDatabaseId,
    selectedDatabaseName,
    updateComponent 
  } = useAppBuilderStore();

  const suggestions = [
    "Create a dynamic product list using my products table with cards showing name, price, and image",
    "Build a user dashboard with statistics from my database tables",
    "Design a data table view for my selected database with filtering and sorting",
    "Create a form that submits to my database with validation",
    "Build a chart visualization from my table data",
    "Design a card grid layout connected to my database",
    "Create a search interface for my data with live results",
    "Build a profile page with user data from my tables",
    "Design a modern hero section with gradient background and call-to-action",
    "Create a pricing table with 3 tiers and feature comparisons",
    "Build a testimonial carousel with customer reviews",
    "Design a FAQ accordion with expandable answers"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setIsAnalyzing(true);
    
    try {
      // Get available tables and current page components for context
      const availableTables = selectedDatabaseId ? 
        await appBuilderService.getDatabaseTables(currentProject?.user_id || '') : [];
      
      const currentPageData = currentProject?.pages.find(p => p.id === currentPage);
      const existingComponents = currentPageData?.components || [];

      // Enhanced context with smart app building capabilities
      const enhancedContext = {
        currentProject,
        currentPage: currentPageData,
        existingComponents,
        availableTables,
        selectedDatabase: {
          id: selectedDatabaseId,
          name: selectedDatabaseName
        },
        context: 'smart-app-builder',
        capabilities: {
          dataBinding: true,
          realTimeGeneration: true,
          componentOptimization: true,
          layoutArrangement: true
        },
        requirements: {
          responsive: true,
          accessible: true,
          modern: true,
          interactive: true,
          dataConnected: true,
          optimized: true
        }
      };

      setIsAnalyzing(false);
      
      const result = await appBuilderService.generateWithAI(prompt, enhancedContext);

      if (result.success) {
        // If multiple components were generated, add them all
        if (Array.isArray(result.components)) {
          result.components.forEach((component: any) => {
            addComponent(component);
          });
          setGeneratedComponent(result.components[0]);
        } else {
          setGeneratedComponent(result.component);
        }
        
        // Auto-optimize the layout if requested
        if (result.shouldOptimize) {
          setTimeout(() => {
            // Trigger layout optimization
            console.log('Auto-optimizing layout...');
          }, 1000);
        }
      } else {
        console.error('AI generation failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to generate component:', error);
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleAddComponent = () => {
    if (generatedComponent) {
      addComponent(generatedComponent);
      onClose();
    }
  };

  const onClose = () => {
    setPrompt('');
    setGeneratedComponent(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Component Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe what you want to build
            </label>
            <Textarea
              placeholder={selectedDatabaseId ? 
                `E.g., Create a card list showing products from my ${selectedDatabaseName} table, or Build a dashboard with statistics from my data` :
                "E.g., Create a modern hero section with compelling headline and call-to-action, or Build a contact form with validation"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {selectedDatabaseId && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Connected to {selectedDatabaseName} - AI can build data-connected components
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">
              Quick suggestions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors p-2 text-left justify-start whitespace-normal h-auto"
                  onClick={() => setPrompt(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="flex-1"
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
          </div>

          {generatedComponent && (
            <div className="border border-border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Generated Component</h4>
                <Badge variant="secondary">
                  {generatedComponent.type}
                </Badge>
              </div>
              
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="w-fit">
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code className="h-4 w-4 mr-2" />
                    Code
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-4">
                  <div className="bg-background border border-border rounded p-4 min-h-[200px]">
                    <div className="text-center text-muted-foreground">
                      Component preview will render here
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="code" className="mt-4">
                  <div className="bg-background border border-border rounded p-3 font-mono text-sm max-h-[300px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(generatedComponent, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddComponent} size="sm">
                  Add to Canvas
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGeneratedComponent(null)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
