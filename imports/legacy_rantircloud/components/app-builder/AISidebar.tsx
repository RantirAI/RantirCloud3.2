import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Sparkles, Loader2, Wand2, Code, Eye, X, RotateCcw, User, Bot, MessageSquare, FolderOpen, Layers, Component } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ComponentPalette } from './ComponentPalette';
import { LayersPanel } from './LayersPanel';
import { AIComponentPreview } from './AIComponentPreview';
import { useAIComponent } from './AIComponentFramework';
import { ProgressiveAIChat } from './ProgressiveAIChat';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  component?: any;
}

interface AISidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AISidebar({ open, onOpenChange, projectId }: AISidebarProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { addComponent, currentProject, currentPage } = useAppBuilderStore();
  const { 
    state: aiState, 
    generateComponent, 
    regenerateComponent, 
    acceptComponent, 
    rejectComponent 
  } = useAIComponent();

  const suggestions = [
    "Create a modern hero section with gradient background",
    "Build a contact form with validation",
    "Design a pricing table with 3 tiers",
    "Create a testimonial carousel",
    "Build a product showcase grid",
    "Design a newsletter signup form",
    "Create a team member grid",
    "Build a FAQ accordion",
    "Design a statistics dashboard",
    "Create a feature highlights section"
  ];

  // Load chat history for this project
  useEffect(() => {
    const savedMessages = localStorage.getItem(`ai-chat-${projectId}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, [projectId]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`ai-chat-${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');

    try {
      await generateComponent(prompt, {
        currentProject,
        currentPage,
        context: 'app-builder',
        requirements: {
          responsive: true,
          accessible: true,
          modern: true,
          interactive: true
        }
      });

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiState.error ? 'Failed to generate component' : 'Component generated successfully!',
        timestamp: new Date(),
        component: aiState.currentComponent
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        type: 'ai',
        content: 'Failed to generate component. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleAddComponent = (component: any) => {
    if (component) {
      addComponent(component);
    }
  };

  const handleRollback = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      setMessages(prev => prev.slice(0, messageIndex + 1));
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(`ai-chat-${projectId}`);
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-lg transform transition-transform duration-300 ease-in-out z-50",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <h2 className="font-semibold text-sm">AI Drivers & NewPoint</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="w-full h-auto p-0 bg-transparent rounded-none border-b shrink-0">
            <TabsTrigger value="chat" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <MessageSquare className="h-3 w-3" />
              Smart AI
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <FolderOpen className="h-3 w-3" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <Layers className="h-3 w-3" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">
              <Component className="h-3 w-3" />
              Components
            </TabsTrigger>
          </TabsList>

          {/* Smart AI Tab */}
          <TabsContent value="chat" className="flex-1 mt-0 p-3">
            <ProgressiveAIChat projectId={projectId} />
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="flex-1 p-4">
            <div className="text-center text-muted-foreground py-8">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No assets uploaded yet</p>
            </div>
          </TabsContent>

          {/* Layers Tab */}
          <TabsContent value="layers" className="flex-1 mt-0">
            <LayersPanel />
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="flex-1 mt-0">
            <ComponentPalette />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}