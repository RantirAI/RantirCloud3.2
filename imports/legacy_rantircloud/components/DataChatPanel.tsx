import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  BarChart3, 
  Search,
  Download,
  Copy,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Columns,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Globe,
  ChevronDown,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TableField, TableRecord } from '@/services/tableService';
import { generateRecordId } from '@/utils/generateRecordId';
import { useAISidebarStore, AIModelType } from '@/stores/aiSidebarStore';
import { DeepResearchResult } from '@/components/data/DeepResearchResult';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  chartConfig?: any;
  context?: {
    tableName: string;
    recordCount: number;
    fieldCount: number;
    sampleCount: number;
  };
  action?: SpreadsheetAction;
  actionStatus?: 'pending' | 'confirmed' | 'cancelled' | 'executed';
  research?: {
    summary: string;
    findings: Array<{ title: string; content: string }>;
    sources: Array<{ title: string; url: string; snippet?: string }>;
    provider: 'gemini-deep-research' | 'openai-deep-research';
    timestamp: string;
  };
}

interface SpreadsheetAction {
  action: string;
  data?: any;
  record?: any;         // For add_record - single record object
  records?: any[];      // For add_records - array of records
  recordId?: string;
  recordIds?: string[];
  column?: any;
  columnName?: string;
  updates?: Record<string, any>;
  condition?: string;
  message?: string;
  confirmationRequired?: boolean;
  affectedCount?: number;
}

interface DataChatPanelProps {
  tableProjectId: string;
  tableName: string;
  tableSchema: { fields: TableField[] };
  tableData: TableRecord[];
  isOpen: boolean;
  onClose: () => void;
  // New action callbacks
  onAddRecord?: (record: any) => Promise<void>;
  onAddRecords?: (records: any[]) => Promise<void>;
  onUpdateRecord?: (recordId: string, updates: any) => Promise<void>;
  onUpdateRecords?: (recordIds: string[], updates: any) => Promise<void>;
  onDeleteRecord?: (recordId: string) => Promise<void>;
  onDeleteRecords?: (recordIds: string[]) => Promise<void>;
  onAddColumn?: (column: TableField) => Promise<void>;
  onUpdateColumn?: (columnName: string, updates: Partial<TableField>) => Promise<void>;
  onDeleteColumn?: (columnName: string) => Promise<void>;
  onClearData?: () => Promise<void>;
  onRefresh?: () => void;
}

interface SuggestedQuestion {
  text: string;
  icon: React.ReactNode;
  category: 'analysis' | 'insights' | 'statistics' | 'visualization' | 'action';
}

export function DataChatPanel({ 
  tableProjectId, 
  tableName, 
  tableSchema, 
  tableData, 
  isOpen, 
  onClose,
  onAddRecord,
  onAddRecords,
  onUpdateRecord,
  onUpdateRecords,
  onDeleteRecord,
  onDeleteRecords,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onClearData,
  onRefresh
}: DataChatPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedModel, setSelectedModel } = useAISidebarStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: SpreadsheetAction } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Check if edit capabilities are available
  const hasEditCapabilities = !!(onAddRecord || onUpdateRecord || onDeleteRecord || onAddColumn);
  
  // Check if deep research model is selected
  const isDeepResearchModel = selectedModel === 'gemini-deep-research' || selectedModel === 'openai-deep-research';
  
  // Model display names
  const modelLabels: Record<AIModelType, { label: string; icon: React.ReactNode; description: string }> = {
    'gemini-3-pro': { label: 'Gemini 3 Pro', icon: <Sparkles className="h-4 w-4" />, description: 'Latest & powerful' },
    'gemini-3-flash': { label: 'Gemini 3 Flash', icon: <Sparkles className="h-4 w-4" />, description: 'Fast & capable' },
    'gemini-2.5-flash': { label: 'Gemini 2.5 Flash', icon: <Sparkles className="h-4 w-4" />, description: 'Fast & accurate' },
    'gemini-2.5-pro': { label: 'Gemini 2.5 Pro', icon: <Sparkles className="h-4 w-4" />, description: 'Advanced reasoning' },
    'claude-sonnet-4': { label: 'Claude Sonnet 4', icon: <Bot className="h-4 w-4" />, description: 'Advanced analysis' },
    'gpt-5': { label: 'GPT-5', icon: <Globe className="h-4 w-4" />, description: 'Powerful reasoning' },
    'gpt-5-mini': { label: 'GPT-5 Mini', icon: <Globe className="h-4 w-4" />, description: 'Fast & efficient' },
    'gemini-deep-research': { label: 'gemini-2.5-pro-deep-research', icon: <Search className="h-4 w-4" />, description: '' },
    'openai-deep-research': { label: 'o3-deep-research', icon: <Search className="h-4 w-4" />, description: '' },
    'minimax-m2.5': { label: 'MiniMax M2.5', icon: <Zap className="h-4 w-4" />, description: 'Fast coding agent' },
  };

  // Generate suggested questions based on data structure
  useEffect(() => {
    if (!tableSchema.fields.length) return;

    const fields = tableSchema.fields;
    const numericFields = fields.filter(f => f.type === 'number');
    const textFields = fields.filter(f => f.type === 'text');
    
    const suggestions: SuggestedQuestion[] = [
      {
        text: `Show me a summary of the ${tableName} data`,
        icon: <BarChart3 className="h-4 w-4" />,
        category: 'analysis'
      },
      {
        text: `How many records are in this table?`,
        icon: <Search className="h-4 w-4" />,
        category: 'statistics'
      }
    ];

    if (numericFields.length > 0) {
      suggestions.push({
        text: `What are the average values for ${numericFields[0].name}?`,
        icon: <TrendingUp className="h-4 w-4" />,
        category: 'statistics'
      });
    }

    if (textFields.length > 0) {
      suggestions.push({
        text: `What are the most common values in ${textFields[0].name}?`,
        icon: <BarChart3 className="h-4 w-4" />,
        category: 'insights'
      });
    }

    // Add action-based suggestions if edit capabilities are available
    if (hasEditCapabilities) {
      suggestions.push(
        {
          text: 'Add a new record to this table',
          icon: <Plus className="h-4 w-4" />,
          category: 'action'
        },
        {
          text: 'Add a new column called "status" with options active/inactive',
          icon: <Columns className="h-4 w-4" />,
          category: 'action'
        }
      );
    }

    suggestions.push(
      {
        text: 'Find any data quality issues or missing values',
        icon: <Lightbulb className="h-4 w-4" />,
        category: 'insights'
      },
      {
        text: 'What insights can you provide about this data?',
        icon: <Lightbulb className="h-4 w-4" />,
        category: 'insights'
      }
    );

    setSuggestedQuestions(suggestions);
  }, [tableSchema, tableName, hasEditCapabilities]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const executeAction = async (action: SpreadsheetAction, messageId: string) => {
    let actionExecuted = false;
    
    try {
      // Handle different field names from the edge function
      const recordData = action.record || action.data;
      const recordsData = action.records || (Array.isArray(action.data) ? action.data : null);
      
      switch (action.action) {
        case 'add_record':
          if (onAddRecord && recordData && typeof recordData === 'object') {
            const recordToAdd = { ...recordData, id: recordData.id || generateRecordId(tableData) };
            await onAddRecord(recordToAdd);
            toast({ title: "Success", description: action.message || "Record added successfully" });
            actionExecuted = true;
          } else if (!recordData) {
            toast({ title: "Error", description: "No record data provided by AI", variant: "destructive" });
          }
          break;
        case 'add_records':
          if (onAddRecords && Array.isArray(recordsData) && recordsData.length > 0) {
            const allRecords = [...tableData];
            const recordsToAdd = recordsData.map(r => {
              const newRecord = { ...r, id: r.id || generateRecordId(allRecords) };
              allRecords.push(newRecord);
              return newRecord;
            });
            await onAddRecords(recordsToAdd);
            toast({ title: "Success", description: action.message || `${recordsData.length} records added successfully` });
            actionExecuted = true;
          } else if (!recordsData || recordsData.length === 0) {
            toast({ title: "Error", description: "No records array provided by AI", variant: "destructive" });
          }
          break;
        case 'update_record':
          if (onUpdateRecord && action.recordId && action.updates) {
            await onUpdateRecord(action.recordId, action.updates);
            toast({ title: "Success", description: action.message || "Record updated successfully" });
            actionExecuted = true;
          } else if (!action.recordId) {
            toast({ title: "Error", description: "No record ID provided for update", variant: "destructive" });
          }
          break;
        case 'update_records':
          if (onUpdateRecords && action.recordIds && action.updates) {
            await onUpdateRecords(action.recordIds, action.updates);
            toast({ title: "Success", description: action.message || `${action.recordIds.length} records updated` });
            actionExecuted = true;
          }
          break;
        case 'delete_record':
          if (onDeleteRecord && action.recordId) {
            await onDeleteRecord(action.recordId);
            toast({ title: "Success", description: action.message || "Record deleted successfully" });
            actionExecuted = true;
          }
          break;
        case 'delete_records':
          if (onDeleteRecords && action.recordIds) {
            await onDeleteRecords(action.recordIds);
            toast({ title: "Success", description: action.message || `${action.recordIds.length} records deleted` });
            actionExecuted = true;
          }
          break;
        case 'add_column':
          if (onAddColumn && action.column) {
            await onAddColumn({
              id: crypto.randomUUID(),
              ...action.column
            });
            toast({ title: "Success", description: action.message || "Column added successfully" });
            actionExecuted = true;
          }
          break;
        case 'update_column':
          if (onUpdateColumn && action.columnName && action.updates) {
            await onUpdateColumn(action.columnName, action.updates);
            toast({ title: "Success", description: action.message || "Column updated successfully" });
            actionExecuted = true;
          }
          break;
        case 'delete_column':
          if (onDeleteColumn && action.columnName) {
            await onDeleteColumn(action.columnName);
            toast({ title: "Success", description: action.message || "Column deleted successfully" });
            actionExecuted = true;
          }
          break;
        case 'clear_data':
          if (onClearData) {
            await onClearData();
            toast({ title: "Success", description: action.message || "All records cleared" });
            actionExecuted = true;
          }
          break;
      }

      // Update message status only if action was executed
      if (actionExecuted) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, actionStatus: 'executed' as const } : msg
        ));
        // Refresh data
        onRefresh?.();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to execute action",
        variant: "destructive"
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    
    await executeAction(pendingAction.action, pendingAction.messageId);
    setPendingAction(null);
  };

  const handleCancelAction = () => {
    if (pendingAction) {
      setMessages(prev => prev.map(msg => 
        msg.id === pendingAction.messageId ? { ...msg, actionStatus: 'cancelled' as const } : msg
      ));
      setPendingAction(null);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !user) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Update conversation history
    const newHistory = [...conversationHistory, { role: 'user', content: text }];

    try {
      // Check if deep research model is selected - always use data-chat for deep research
      const isDeepResearch = selectedModel === 'gemini-deep-research' || selectedModel === 'openai-deep-research';
      
      // Use data-chat for deep research OR if no edit capabilities
      if (isDeepResearch || !hasEditCapabilities) {
        console.log('[DataChatPanel] Calling data-chat with model:', selectedModel);
        
        const { data, error } = await supabase.functions.invoke('data-chat', {
          body: {
            question: text,
            tableProjectId,
            sampleLimit: 50,
            model: selectedModel
          },
        });

        if (error) throw new Error(error.message || 'Failed to get AI response');

        const response = data as any;
        const actualResponse = response.success ? response : response;
        
        const aiMessage: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: actualResponse.message || actualResponse.response || 'No response from AI.',
          timestamp: new Date(),
          model: actualResponse.model,
          chartConfig: actualResponse.chartConfig,
          context: actualResponse.usedContext,
          research: actualResponse.research
        };

        setMessages(prev => [...prev, aiMessage]);
      } else if (hasEditCapabilities) {
        // Use spreadsheet-ai-actions for edit capabilities with non-deep-research models
        console.log('[DataChatPanel] Calling spreadsheet-ai-actions with:', {
          message: text,
          tableProjectId,
          tableName,
          schemaFieldsCount: tableSchema.fields.length,
          recordsCount: tableData.length
        });

        const { data, error } = await supabase.functions.invoke('spreadsheet-ai-actions', {
          body: {
            message: text,
            tableProjectId,
            tableSchema,
            tableData: tableData.slice(0, 100), // Send first 100 records for context
            tableName,
            conversationHistory: newHistory.slice(-10) // Send last 10 messages for context
          },
        });

        console.log('[DataChatPanel] Response from spreadsheet-ai-actions:', { data, error });

        if (error) {
          console.error('[DataChatPanel] Edge function error:', error);
          throw new Error(error.message || 'Failed to get AI response');
        }

        const response = data as any;
        
        // Update conversation history with AI response
        setConversationHistory([...newHistory, { role: 'assistant', content: response.message || 'Action processed.' }]);

        if (response.action) {
          // AI wants to perform an action
          const aiMessage: ChatMessage = {
            id: `msg_${Date.now()}_ai`,
            role: 'assistant',
            content: response.message || `I'll ${response.action.replace('_', ' ')} for you.`,
            timestamp: new Date(),
            model: 'Claude Sonnet 4.5', // spreadsheet-ai-actions uses Claude
            action: response,
            actionStatus: response.confirmationRequired ? 'pending' : undefined
          };

          setMessages(prev => [...prev, aiMessage]);

          // If confirmation is required, show dialog
          if (response.confirmationRequired) {
            setPendingAction({ messageId: aiMessage.id, action: response });
          } else {
            // Execute immediately if no confirmation needed
            await executeAction(response, aiMessage.id);
          }
        } else {
          // Just a conversational response
          const aiMessage: ChatMessage = {
            id: `msg_${Date.now()}_ai`,
            role: 'assistant',
            content: response.message || 'No response from AI.',
            timestamp: new Date(),
            model: 'Claude Sonnet 4.5' // spreadsheet-ai-actions uses Claude
          };

          setMessages(prev => [...prev, aiMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard"
    });
  };

  const downloadChat = () => {
    const chatData = {
      tableName,
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        context: msg.context,
        action: msg.action
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-chat-${tableName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Chat exported successfully"
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add_record':
      case 'add_records':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update_record':
      case 'update_records':
        return <Pencil className="h-4 w-4 text-yellow-500" />;
      case 'delete_record':
      case 'delete_records':
      case 'clear_data':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'add_column':
      case 'update_column':
      case 'delete_column':
        return <Columns className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getActionStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Awaiting Confirmation</Badge>;
      case 'executed':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Executed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="h-full w-full bg-background flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Chat with Data</h3>
              {hasEditCapabilities && (
                <Badge variant="secondary" className="text-xs">
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    {modelLabels[selectedModel].icon}
                    <span className="hidden sm:inline">{modelLabels[selectedModel].label}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setSelectedModel('gemini-3-pro')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Gemini 3 Pro</span>
                      <span className="text-xs text-muted-foreground">Latest & powerful</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedModel('gemini-3-flash')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Gemini 3 Flash</span>
                      <span className="text-xs text-muted-foreground">Fast & capable</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedModel('gemini-2.5-flash')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Gemini 2.5 Flash</span>
                      <span className="text-xs text-muted-foreground">Fast & accurate</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedModel('claude-sonnet-4')}>
                    <Bot className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Claude Sonnet 4</span>
                      <span className="text-xs text-muted-foreground">Advanced analysis</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedModel('gpt-5')}>
                    <Globe className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>GPT-5</span>
                      <span className="text-xs text-muted-foreground">Powerful reasoning</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedModel('gemini-deep-research')}>
                    <Search className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">gemini-2.5-pro-deep-research</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedModel('openai-deep-research')}>
                    <Search className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">o3-deep-research</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadChat}
                className="h-8 w-8 p-0"
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {tableName}
            </Badge>
            <span>•</span>
            <span>{tableData.length} records</span>
            <span>•</span>
            <span>{tableSchema.fields.length} columns</span>
            {isDeepResearchModel && (
              <>
                <span>•</span>
                <Badge variant="default" className="text-xs bg-primary/10 text-primary">
                  <Search className="h-3 w-3 mr-1" />
                  Deep Research Mode
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h4 className="text-xl font-medium mb-3">
                  {hasEditCapabilities ? 'Ask questions or make changes to your data' : 'Ask questions about your data'}
                </h4>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {hasEditCapabilities 
                    ? 'Get insights, analyze patterns, create visualizations, or edit your data using natural language.'
                    : 'Get insights, analyze patterns, create visualizations, or explore your data using natural language.'}
                </p>

                {/* Analysis Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <Search className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Ask</h5>
                    <p className="text-xs text-muted-foreground">General questions about your data</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Analyze</h5>
                    <p className="text-xs text-muted-foreground">Statistical analysis and patterns</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h5 className="font-medium mb-1">Visualize</h5>
                    <p className="text-xs text-muted-foreground">Create charts and visualizations</p>
                  </div>
                  {hasEditCapabilities ? (
                    <div className="p-4 border rounded-lg bg-muted/20">
                      <Pencil className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h5 className="font-medium mb-1">Edit</h5>
                      <p className="text-xs text-muted-foreground">Add, update, or delete data</p>
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg bg-muted/20">
                      <Lightbulb className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h5 className="font-medium mb-1">Insights</h5>
                      <p className="text-xs text-muted-foreground">Data quality and insights</p>
                    </div>
                  )}
                </div>

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
                  {suggestedQuestions.slice(0, 6).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto p-4 text-sm"
                      onClick={() => handleSendMessage(suggestion.text)}
                    >
                      <div className="flex items-start gap-3">
                        {suggestion.icon}
                        <span>{suggestion.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  
                  <div className="space-y-1">
                    <Card className={`${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
                      <CardContent className="p-3 text-sm">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Action indicator */}
                        {message.action && (
                          <div className="mt-3 p-3 bg-background/50 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              {getActionIcon(message.action.action)}
                              <span className="font-medium capitalize">{message.action.action.replace('_', ' ')}</span>
                              {getActionStatusBadge(message.actionStatus)}
                            </div>
                            
                            {message.action.affectedCount && (
                              <p className="text-xs text-muted-foreground">
                                {message.action.affectedCount} record(s) affected
                              </p>
                            )}
                            
                            {message.actionStatus === 'pending' && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => setPendingAction({ messageId: message.id, action: message.action! })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMessages(prev => prev.map(msg => 
                                      msg.id === message.id ? { ...msg, actionStatus: 'cancelled' as const } : msg
                                    ));
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Render deep research results if present */}
                        {message.research && message.role === 'assistant' && (
                          <div className="mt-4">
                            <DeepResearchResult result={message.research} />
                          </div>
                        )}
                        
                        {/* Render chart if present */}
                        {message.chartConfig && message.role === 'assistant' && (
                          <div className="mt-4 p-4 bg-background rounded-lg border">
                            <h4 className="text-sm font-medium mb-3">{message.chartConfig.title}</h4>
                            <div className="w-full h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                {message.chartConfig.type === 'pie' ? (
                                  <PieChart>
                                    <Pie
                                      data={message.chartConfig.data}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                      nameKey="label"
                                    >
                                      {message.chartConfig.data?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'][index % 8]} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                ) : message.chartConfig.type === 'bar' ? (
                                  <BarChart data={message.chartConfig.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8884d8" />
                                  </BarChart>
                                ) : message.chartConfig.type === 'line' ? (
                                  <LineChart data={message.chartConfig.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                                  </LineChart>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Unsupported chart type: {message.chartConfig.type}
                                  </div>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                        
                        {message.context && (
                          <div className="mt-2 pt-2 border-t border-border/20">
                            <div className="flex items-center gap-2 text-xs opacity-75">
                              <span>Analyzed {message.context.sampleCount} of {message.context.recordCount} records</span>
                              {message.chartConfig && <span>• Chart generated</span>}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                        {message.role === 'assistant' && message.model && (
                          <> • {message.model}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <Card className="bg-muted max-w-[85%]">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-muted-foreground">
                        {hasEditCapabilities ? 'Processing your request...' : 'Analyzing your data...'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={hasEditCapabilities ? "Ask a question or describe a change..." : "Ask a question about your data..."}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isLoading}
                className="flex-1 h-12 text-base"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                size="lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick suggestions */}
            {messages.length === 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.slice(-3).map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-3"
                    onClick={() => handleSendMessage(suggestion.text)}
                  >
                    {suggestion.icon}
                    <span className="ml-2 truncate max-w-[200px]">
                      {suggestion.text.split(' ').slice(0, 4).join(' ')}...
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Actions */}
      <AlertDialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action.message}
              {pendingAction?.action.affectedCount && (
                <span className="block mt-2 font-medium">
                  This will affect {pendingAction.action.affectedCount} record(s).
                </span>
              )}
              {(pendingAction?.action.action.includes('delete') || pendingAction?.action.action === 'clear_data') && (
                <span className="block mt-2 text-red-500 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={pendingAction?.action.action.includes('delete') ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
