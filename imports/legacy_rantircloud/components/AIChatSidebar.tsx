import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Download, Trash2, Bot, User, Search, Settings, Plus, MoreHorizontal, MessageSquare, Copy, Maximize2 } from "lucide-react";
import { SearchModal } from "@/components/SearchModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { searchService, UserSearch } from "@/services/searchService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartConfig?: any;
  context?: {
    tableName: string;
    recordCount: number;
    fieldCount: number;
    sampleCount: number;
  };
}

interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  title: string;
  created_at: Date;
  updated_at: Date;
}

export function AIChatSidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [promptTab, setPromptTab] = useState("ask");
const scrollAreaRef = useRef<HTMLDivElement>(null);
const location = useLocation();

  // Load conversation history on mount
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        const searches = await searchService.getUserSearchHistory(user.id, 50);
        const chatSearches = searches.filter(search => search.search_type === 'chat');
        
        const conversationMap = new Map<string, ChatConversation>();
        
        chatSearches.forEach(search => {
          const metadata = search.metadata as any;
          if (metadata.conversation_id) {
            if (!conversationMap.has(metadata.conversation_id)) {
              conversationMap.set(metadata.conversation_id, {
                id: metadata.conversation_id,
                messages: [],
                title: metadata.title || 'New Chat',
                created_at: new Date(search.created_at),
                updated_at: new Date(search.updated_at)
              });
            }
            
            const conversation = conversationMap.get(metadata.conversation_id)!;
            if (metadata.messages) {
              conversation.messages = metadata.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }));
            }
            conversation.updated_at = new Date(search.updated_at);
          }
        });
        
        const sortedConversations = Array.from(conversationMap.values())
          .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
        
        setConversations(sortedConversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    loadConversations();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [currentConversation?.messages]);

  const startNewConversation = () => {
    if (!user) return;
    
    const newConversation: ChatConversation = {
      id: `conv_${user.id}_${Date.now()}`,
      messages: [],
      title: 'New Chat',
      created_at: new Date(),
      updated_at: new Date()
    };
    setCurrentConversation(newConversation);
  };

  const saveConversation = async (conversation: ChatConversation) => {
    if (!user) return;

    try {
      console.log('Saving conversation:', conversation);
      await searchService.saveConversation(
        user.id,
        conversation.id,
        conversation.title,
        conversation.messages
      );
      console.log('Conversation saved successfully');
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || input.trim();
    if (!messageText || !user) return;

    let conversation = currentConversation;
    if (!conversation) {
      const newConvId = `conv_${user.id}_${Date.now()}`;
      conversation = {
        id: newConvId,
        messages: [],
        title: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''),
        created_at: new Date(),
        updated_at: new Date()
      };
      setCurrentConversation(conversation);
      setConversations(prev => [conversation!, ...prev]);
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage],
      updated_at: new Date()
    };

    setCurrentConversation(updatedConversation);
    if (!customPrompt) setInput("");
    setIsLoading(true);
    setIsThinking(true);

    try {
      // Call Supabase Edge Function for data chat
      const pathParts = location.pathname.split('/');
      const tableProjectId = pathParts[1] === 'tables' ? pathParts[2] : undefined;

      const { data, error } = await supabase.functions.invoke('data-chat', {
        body: {
          question: messageText,
          tableProjectId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      console.log("=== AI CHAT SIDEBAR DEBUG ===");
      console.log("Full data-chat response:", data);
      console.log("Chart config:", (data as any)?.chartConfig);
      console.log("=== END DEBUG ===");

      const response = data as any;
      const aiText = response?.message || 'No response from AI.';

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        chartConfig: response?.chartConfig,
        context: response?.usedContext
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, aiMessage],
        updated_at: new Date()
      };

      setCurrentConversation(finalConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === finalConversation.id ? finalConversation : conv)
      );
      
      // Persist conversation to history
      await saveConversation(finalConversation);
      
      setIsLoading(false);
      setIsThinking(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setIsThinking(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadConversation = (conversation: ChatConversation) => {
    const data = {
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: conversation.messages
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${conversation.title.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Conversation saved as JSON file"
    });
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const date = conv.updated_at.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(conv);
    return groups;
  }, {} as Record<string, ChatConversation[]>);

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
    toast({
      title: "Deleted",
      description: "Conversation removed"
    });
  };

  return (
    <div className="flex flex-col h-full">
      {currentConversation ? (
        /* Chat View */
        <>
          {/* Chat Header */}
          <div className="px-3 pt-3 pb-2 bg-background">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentConversation(null)}
                className="h-7 px-2 text-xs"
              >
                ← Back to Chats
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadConversation(currentConversation)}
                  className="h-6 w-6 p-0"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteConversation(currentConversation.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <h3 className="font-medium text-sm truncate">{currentConversation.title}</h3>
          </div>
          
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
            <div className="space-y-3">
              {currentConversation.messages.length === 0 && !isThinking ? (
                <div className="flex flex-col items-center justify-center text-center pt-12 min-w-[200px]">
                  <div className="mb-6">
                    <WhirlpoolLoader 
                      size="md" 
                      icon={<MessageSquare className="h-6 w-6 text-muted-foreground" />}
                    />
                  </div>
                  <h3 className="text-base font-medium mb-2">Ask anything...</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
                    Get insights, analyze data, or start a conversation
                  </p>

                  <Tabs value={promptTab} onValueChange={setPromptTab} className="w-full max-w-sm min-w-[200px]">
                    <TabsList className="grid w-full grid-cols-4 h-auto">
                      <TabsTrigger value="ask" className="py-2 pb-3">Ask</TabsTrigger>
                      <TabsTrigger value="analyze" className="py-2 pb-3">Analyze</TabsTrigger>
                      <TabsTrigger value="build" className="py-2 pb-3">Build</TabsTrigger>
                      <TabsTrigger value="scrape" className="py-2 pb-3">Scrape</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-2">
                      <TabsContent value="ask" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Show me a summary of today's data")}
                        >
                          Show me a summary of today's data
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("What are the key trends this month?")}
                        >
                          What are the key trends this month?
                        </Button>
                      </TabsContent>

                      <TabsContent value="analyze" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Analyze performance patterns")}
                        >
                          Analyze performance patterns
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Compare this quarter vs last quarter")}
                        >
                          Compare this quarter vs last quarter
                        </Button>
                      </TabsContent>

                      <TabsContent value="build" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Create a dashboard for this data")}
                        >
                          Create a dashboard for this data
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Build automated reports")}
                        >
                          Build automated reports
                        </Button>
                      </TabsContent>

                      <TabsContent value="scrape" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Import data from website")}
                        >
                          Import data from website
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={() => handleSendMessage("Scrape competitor pricing")}
                        >
                          Scrape competitor pricing
                        </Button>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              ) : (
                <>
                  {currentConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'user' ? (
                        <div className="flex flex-col items-end gap-1 max-w-[80%]">
                          <div className="flex gap-2 items-start flex-row-reverse">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {user?.email?.substring(0, 2).toUpperCase() || 'Y'}
                            </div>
                            <div className="bg-blue-600 text-white rounded-2xl px-4 py-2 text-sm">
                              {message.content}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                            <span>{message.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                navigator.clipboard.writeText(message.content);
                                toast({ description: "Copied to clipboard" });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setCurrentConversation({
                                  ...currentConversation,
                                  messages: currentConversation.messages.filter(m => m.id !== message.id)
                                });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 max-w-[80%]">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-secondary text-secondary-foreground">
                            <Bot className="h-3 w-3" />
                          </div>
                          <Card className="bg-muted">
                            <CardContent className="p-2 text-xs">
                              {message.content}
                             
                               {/* Render chart if present */}
                               {message.chartConfig && message.role === 'assistant' && (
                                 <div className="mt-4 p-4 bg-card rounded-lg border shadow-sm">
                                   <div className="flex items-center justify-between mb-3">
                                     <h4 className="font-semibold text-sm text-card-foreground">{message.chartConfig.title}</h4>
                                     <Dialog>
                                       <DialogTrigger asChild>
                                         <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                           <Maximize2 className="h-3 w-3" />
                                         </Button>
                                       </DialogTrigger>
                                       <DialogContent className="max-w-4xl w-full h-[80vh]">
                                         <DialogHeader>
                                           <DialogTitle>{message.chartConfig.title}</DialogTitle>
                                         </DialogHeader>
                                         <div className="w-full h-full flex items-center justify-center">
                                           <div className="w-full h-[60vh]">
                                             <ResponsiveContainer width="100%" height="100%">
                                               {message.chartConfig.type === 'pie' ? (
                                                 <PieChart>
                                                   <Pie
                                                     data={message.chartConfig.data}
                                                     cx="50%"
                                                     cy="50%"
                                                     labelLine={false}
                                                     label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                                                     outerRadius={120}
                                                     innerRadius={30}
                                                     fill="#8884d8"
                                                     dataKey="value"
                                                     nameKey="label"
                                                   >
                                                     {message.chartConfig.data?.map((entry: any, index: number) => (
                                                       <Cell 
                                                         key={`cell-${index}`} 
                                                         fill={[
                                                           '#3B82F6', // Blue
                                                           '#10B981', // Emerald  
                                                           '#F59E0B', // Amber
                                                           '#EF4444', // Red
                                                           '#8B5CF6', // Violet
                                                           '#06B6D4', // Cyan
                                                           '#F97316', // Orange
                                                           '#84CC16'  // Lime
                                                         ][index % 8]} 
                                                       />
                                                     ))}
                                                   </Pie>
                                                   <Tooltip 
                                                     contentStyle={{
                                                       backgroundColor: 'white',
                                                       border: '1px solid #e5e7eb',
                                                       borderRadius: '8px',
                                                       fontSize: '14px',
                                                       color: '#374151',
                                                       boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                     }}
                                                     formatter={(value: any, name: any) => [
                                                       `${value} (${((value / message.chartConfig.data.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                                                       name
                                                     ]}
                                                   />
                                                   <Legend 
                                                     wrapperStyle={{ 
                                                       fontSize: '14px',
                                                       paddingTop: '20px'
                                                     }}
                                                     iconType="circle"
                                                     layout="horizontal"
                                                     verticalAlign="bottom"
                                                     align="center"
                                                   />
                                                 </PieChart>
                                               ) : message.chartConfig.type === 'bar' ? (
                                                 <BarChart data={message.chartConfig.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                                                   <XAxis 
                                                     dataKey="label" 
                                                     fontSize={12} 
                                                     tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                   />
                                                   <YAxis 
                                                     fontSize={12} 
                                                     tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                   />
                                                   <Tooltip 
                                                     contentStyle={{
                                                       backgroundColor: 'hsl(var(--popover))',
                                                       border: '1px solid hsl(var(--border))',
                                                       borderRadius: 'var(--radius)',
                                                       fontSize: '14px'
                                                     }}
                                                   />
                                                   <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                 </BarChart>
                                               ) : message.chartConfig.type === 'line' ? (
                                                 <LineChart data={message.chartConfig.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                                                   <XAxis 
                                                     dataKey="label" 
                                                     fontSize={12} 
                                                     tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                   />
                                                   <YAxis 
                                                     fontSize={12} 
                                                     tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                   />
                                                   <Tooltip 
                                                     contentStyle={{
                                                       backgroundColor: 'hsl(var(--popover))',
                                                       border: '1px solid hsl(var(--border))',
                                                       borderRadius: 'var(--radius)',
                                                       fontSize: '14px'
                                                     }}
                                                   />
                                                   <Line 
                                                     type="monotone" 
                                                     dataKey="value" 
                                                     stroke="hsl(var(--primary))" 
                                                     strokeWidth={3}
                                                     dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                                                     activeDot={{ r: 8, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                                                   />
                                                 </LineChart>
                                               ) : (
                                                 <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
                                                   Unsupported chart type: {message.chartConfig.type}
                                                 </div>
                                               )}
                                             </ResponsiveContainer>
                                           </div>
                                         </div>
                                       </DialogContent>
                                     </Dialog>
                                   </div>
                                   <div className="w-full h-[300px] relative">
                                     <ResponsiveContainer width="100%" height="100%">
                                       {message.chartConfig.type === 'pie' ? (
                                         <PieChart>
                                           <Pie
                                             data={message.chartConfig.data}
                                             cx="50%"
                                             cy="50%"
                                             labelLine={false}
                                             label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                                             outerRadius={80}
                                             innerRadius={20}
                                             fill="#8884d8"
                                             dataKey="value"
                                             nameKey="label"
                                           >
                                             {message.chartConfig.data?.map((entry: any, index: number) => (
                                               <Cell 
                                                 key={`cell-${index}`} 
                                                 fill={[
                                                   '#3B82F6', // Blue
                                                   '#10B981', // Emerald  
                                                   '#F59E0B', // Amber
                                                   '#EF4444', // Red
                                                   '#8B5CF6', // Violet
                                                   '#06B6D4', // Cyan
                                                   '#F97316', // Orange
                                                   '#84CC16'  // Lime
                                                 ][index % 8]} 
                                               />
                                             ))}
                                           </Pie>
                                           <Tooltip 
                                             contentStyle={{
                                               backgroundColor: 'white',
                                               border: '1px solid #e5e7eb',
                                               borderRadius: '8px',
                                               fontSize: '12px',
                                               color: '#374151',
                                               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                             }}
                                             formatter={(value: any, name: any) => [
                                               `${value} (${((value / message.chartConfig.data.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                                               name
                                             ]}
                                           />
                                           <Legend 
                                             wrapperStyle={{ 
                                               fontSize: '11px',
                                               paddingTop: '10px'
                                             }}
                                             iconType="circle"
                                             layout="horizontal"
                                             verticalAlign="bottom"
                                             align="center"
                                           />
                                         </PieChart>
                                       ) : message.chartConfig.type === 'bar' ? (
                                         <BarChart data={message.chartConfig.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                           <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                                           <XAxis 
                                             dataKey="label" 
                                             fontSize={11} 
                                             tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                           />
                                           <YAxis 
                                             fontSize={11} 
                                             tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                           />
                                           <Tooltip 
                                             contentStyle={{
                                               backgroundColor: 'hsl(var(--popover))',
                                               border: '1px solid hsl(var(--border))',
                                               borderRadius: 'var(--radius)',
                                               fontSize: '12px'
                                             }}
                                           />
                                           <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                                         </BarChart>
                                       ) : message.chartConfig.type === 'line' ? (
                                         <LineChart data={message.chartConfig.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                           <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                                           <XAxis 
                                             dataKey="label" 
                                             fontSize={11} 
                                             tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                           />
                                           <YAxis 
                                             fontSize={11} 
                                             tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                           />
                                           <Tooltip 
                                             contentStyle={{
                                               backgroundColor: 'hsl(var(--popover))',
                                               border: '1px solid hsl(var(--border))',
                                               borderRadius: 'var(--radius)',
                                               fontSize: '12px'
                                             }}
                                           />
                                           <Line 
                                             type="monotone" 
                                             dataKey="value" 
                                             stroke="hsl(var(--primary))" 
                                             strokeWidth={2}
                                             dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                                             activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                                           />
                                         </LineChart>
                                       ) : (
                                         <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                           Unsupported chart type: {message.chartConfig.type}
                                         </div>
                                       )}
                                     </ResponsiveContainer>
                                   </div>
                                 </div>
                               )}
                             
                             {/* Debug: Show if chart config exists */}
                             {message.chartConfig && (
                               <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                 <strong>Chart detected:</strong> {message.chartConfig.type} chart with {message.chartConfig.data?.length || 0} data points
                               </div>
                             )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isThinking && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                        <Bot className="h-3 w-3" />
                      </div>
                      <Card className="bg-muted">
                        <CardContent className="p-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-medium">
                              Thinking
                            </span>
                            <div className="flex gap-1">
                              <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="text-xs"
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-8 w-8 p-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>

        </>
      ) : (
        /* Chat List View */
        <>
          {/* Chat List Header */}
          <div className="px-3 pt-3 pb-2 bg-background">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Chats</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  className="h-6 w-6 p-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <WhirlpoolLoader size="sm" icon={<MessageSquare className="h-2 w-2" />} />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats"
                className="text-xs pr-7 h-7"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="pl-1 pr-2 py-2">
              {Object.keys(groupedConversations).length > 0 ? (
                Object.entries(groupedConversations).map(([dateString, convs]) => (
                  <div key={dateString} className="mb-4">
                    <div className="px-2 py-1 mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        {getDateLabel(dateString)}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {convs.map((conversation) => (
                        <Card 
                          key={conversation.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors group"
                          onClick={() => setCurrentConversation(conversation)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-medium truncate">{conversation.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {conversation.messages.length} messages
                                </p>
                                {conversation.messages.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {conversation.messages[conversation.messages.length - 1].content}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadConversation(conversation);
                                  }}
                                  className="h-5 w-5 p-0"
                                >
                                  <Download className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="h-5 w-5 p-0"
                                >
                                  <MoreHorizontal className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center pt-20 max-w-full mx-4 min-w-[200px]">
                  <div className="mb-8">
                    <WhirlpoolLoader 
                      size="lg" 
                      icon={<MessageSquare className="h-7 w-7 text-muted-foreground" />}
                    />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
                    Ask questions about your data, get insights, or chat about anything.
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startNewConversation}
                    className="mb-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Start a new chat
                  </Button>

                  <Tabs value={promptTab} onValueChange={setPromptTab} className="w-full max-w-sm min-w-[200px]">
                    <TabsList className="grid w-full grid-cols-4 h-auto">
                      <TabsTrigger value="ask" className="py-3 pb-4">Ask</TabsTrigger>
                      <TabsTrigger value="analyze" className="py-3 pb-4">Analyze</TabsTrigger>
                      <TabsTrigger value="build" className="py-3 pb-4">Build</TabsTrigger>
                      <TabsTrigger value="scrape" className="py-3 pb-4">Scrape</TabsTrigger>
                    </TabsList>

                    <div className="mt-6 space-y-2">
                      <TabsContent value="ask" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Show me a summary of today's data";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Show me a summary of today's data
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "What are the key trends this month?";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          What are the key trends this month?
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Explain the anomalies in the recent data";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Explain the anomalies in the recent data
                        </Button>
                      </TabsContent>

                      <TabsContent value="analyze" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Analyze performance patterns";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Analyze performance patterns
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Compare this quarter vs last quarter";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Compare this quarter vs last quarter
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Identify growth opportunities";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Identify growth opportunities
                        </Button>
                      </TabsContent>

                      <TabsContent value="build" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Create a dashboard for this data";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Create a dashboard for this data
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Build automated reports";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Build automated reports
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Generate data visualizations";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Generate data visualizations
                        </Button>
                      </TabsContent>

                      <TabsContent value="scrape" className="space-y-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Import data from website";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Import data from website
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Scrape competitor pricing";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Scrape competitor pricing
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-xs h-auto p-2 whitespace-normal text-left"
                          onClick={async () => {
                            const prompt = "Extract data from documents";
                            startNewConversation();
                            setTimeout(() => handleSendMessage(prompt), 100);
                          }}
                        >
                          Extract data from documents
                        </Button>
                      </TabsContent>
                    </div>
                  </Tabs>

                  <Button
                    variant="outline"
                    className="w-full mt-6 justify-start h-auto p-4 min-h-[60px] text-wrap flex flex-col"
                    onClick={() => setIsSearchModalOpen(true)}
                  >
                    <div className="flex items-center w-full">
                      <svg width="20" height="18" viewBox="0 0 284 255" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3 flex-shrink-0">
                        <path d="M265.704 2H18.3679C9.32815 2 2 9.32813 2 18.3678V150.194C2 159.234 9.32815 166.562 18.3679 166.562H265.704C274.744 166.562 282.072 159.234 282.072 150.194V18.3678C282.072 9.32813 274.744 2 265.704 2Z" fill="white" stroke="currentColor" strokeWidth="3.63729"/>
                        <rect x="18" y="204" width="248" height="51" rx="25.5" fill="currentColor"/>
                        <path d="M44.2915 229.5V238.25C44.2915 238.25 44.2915 242.625 54.4998 242.625C64.7082 242.625 64.7082 238.25 64.7082 238.25V229.5" stroke="white" strokeWidth="2.1875"/>
                        <path d="M44.2915 220.75V229.5C44.2915 229.5 44.2915 233.875 54.4998 233.875C64.7082 233.875 64.7082 229.5 64.7082 229.5V220.75" stroke="white" strokeWidth="2.1875"/>
                        <path d="M54.4998 216.375C64.7082 216.375 64.7082 220.75 64.7082 220.75C64.7082 220.75 64.7082 225.125 54.4998 225.125C44.2915 225.125 44.2915 220.75 44.2915 220.75C44.2915 220.75 44.2915 216.375 54.4998 216.375Z" stroke="white" strokeWidth="2.1875"/>
                      </svg>
                      <div className="flex flex-col items-start flex-1">
                        <span className="font-medium">Explore AI agents & search</span>
                        <span className="text-xs text-muted-foreground">
                          Research, summarize, and analyze with AI
                        </span>
                      </div>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Status indicator */}
      {isThinking && (
        <div className="px-3 pb-2">
          <div className="text-xs bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-medium">
            AI is thinking...
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectPrompt={(prompt) => {
          setIsSearchModalOpen(false);
          if (!currentConversation) {
            startNewConversation();
          }
          setTimeout(() => handleSendMessage(prompt), 100);
        }}
      />
    </div>
  );
}