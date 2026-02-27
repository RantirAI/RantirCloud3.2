// SearchModal - Chat history persistence fix v3
import { useState, useEffect } from "react";
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import searchModalBg from "@/assets/search-modal-bg.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Clock, TrendingUp, Copy, ExternalLink, Tag, MessageSquare, FileText, Star, PenTool, Upload, X, Paperclip, Image as ImageIcon, Send, Database, Workflow, AppWindow, Cloud, Link2, Network, Sparkles, Zap, Loader2, ChevronUp, ChevronDown, Users, Truck, Building2, MoreHorizontal, CornerDownLeft, Trash2, RotateCcw, BrainCircuit, File, HardDrive, Maximize2, Minimize2, Plus, Save, FolderPlus, Expand } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import Lottie from "lottie-react";
import generatingAnimation from "@/assets/generating-loader.json";
import { searchService, SearchDocument, UserSearch } from "@/services/searchService";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAISidebarStore, Conversation } from "@/stores/aiSidebarStore";
import { integrationsService, NodeIntegration } from "@/services/integrationsService";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { projectGenerationService, type AvailableNodeType } from "@/services/projectGenerationService";
import { nodeRegistry } from "@/lib/node-registry";
import { databaseService } from "@/services/databaseService";
import { documentService } from "@/services/documentService";
import { convertSectionsToLexical } from "@/utils/lexicalConverter";
import { generateMediaForSections, sectionsNeedMediaGeneration } from "@/utils/mediaGenerationService";
import { driveService } from "@/services/driveService";
import { workspaceService, Workspace } from "@/services/workspaceService";
import { detectIntegrationKeywords, detectMissingIntegrations, getNodeDisplayName } from "@/utils/detectRequiredIntegrations";
import { useDynamicSearchPrompts } from "@/hooks/useDynamicSearchPrompts";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
  activateAISearch?: boolean;
}
interface PromptCategory {
  name: string;
  prompts: string[];
}
interface Integration {
  id: string;
  name: string;
  icon: string | null;
}
export function SearchModal({
  isOpen,
  onClose,
  onSelectPrompt,
  activateAISearch = false
}: SearchModalProps) {
  const {
    user
  } = useAuth();
  const { data: profile } = useUserProfile();
  const displayName = profile?.name || user?.email?.split('@')[0] || 'You';
  const navigate = useNavigate();
  const {
    addConversation,
    addInitialPromptToConversation,
    selectedModel
  } = useAISidebarStore();
  const { dynamicPrompts } = useDynamicSearchPrompts();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchDocument[]>([]);
  const [recentSearches, setRecentSearches] = useState<UserSearch[]>([]);
  const [popularSearches, setPopularSearches] = useState<{
    query: string;
    count: number;
  }[]>([]);
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [isChatView, setIsChatView] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dbConversations, setDbConversations] = useState<Conversation[]>([]);
  const [isSearchNavigatorView, setIsSearchNavigatorView] = useState(false);
  const [navigatorSearchQuery, setNavigatorSearchQuery] = useState("");
  const [navigatorFilter, setNavigatorFilter] = useState<string>("all");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [chatMessages, setChatMessages] = useState<{
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
    image?: File;
  }[]>([]);

  // Prompt box state
  const [promptValue, setPromptValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState(""); // Only set when search is clicked
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
  const [aiSuggestedTypes, setAiSuggestedTypes] = useState<string[]>([]); // AI-detected project types
  const [isGenerating, setIsGenerating] = useState(false);
  const [installedIntegrations, setInstalledIntegrations] = useState<Integration[]>([]);
  const [integrationSearchQuery, setIntegrationSearchQuery] = useState("");
  const [detectedIntegrations, setDetectedIntegrations] = useState<Integration[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  // Real project data state
  const [navigatorDatabases, setNavigatorDatabases] = useState<any[]>([]);
  const [navigatorTables, setNavigatorTables] = useState<any[]>([]);
  const [navigatorDocuments, setNavigatorDocuments] = useState<any[]>([]);
  const [navigatorFlows, setNavigatorFlows] = useState<any[]>([]);
  const [navigatorApps, setNavigatorApps] = useState<any[]>([]);
  const [navigatorFiles, setNavigatorFiles] = useState<any[]>([]);
  const [isLoadingNavigator, setIsLoadingNavigator] = useState(false);
  const [selectedNavigatorIndex, setSelectedNavigatorIndex] = useState(0);

  // AI Question state
  const [isAIQuestion, setIsAIQuestion] = useState(false);
  const [isFileQuestion, setIsFileQuestion] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    message: string;
    relatedItems?: { type: string; id: string; name: string; database_id?: string }[];
    referencedFiles?: { id: string; name: string; file_type: string; file_path: string; database_id: string; database_name: string }[];
    workspaceSummary?: { totalDatabases: number; totalTables: number; totalDocuments: number; totalFlows: number; totalApps: number; totalFiles?: number };
  } | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  
  // Expanded AI Chat state
  const [isExpandedAIView, setIsExpandedAIView] = useState(false);
  const [aiConversationHistory, setAiConversationHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAIChatLoading, setIsAIChatLoading] = useState(false);

  // Get model display name
  const getModelDisplayName = (modelId: string): string => {
    const modelNames: Record<string, string> = {
      'gemini-3-pro': 'Gemini 3 Pro',
      'gemini-3-flash': 'Gemini 3 Flash',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'claude-sonnet-4': 'Claude Sonnet 4',
      'gpt-5': 'GPT-5',
      'gpt-5-mini': 'GPT-5 Mini',
      'minimax-m2.5': 'MiniMax M2.5',
      'google/gemini-3-pro-preview': 'Gemini 3 Pro',
      'google/gemini-3-flash-preview': 'Gemini 3 Flash',
      'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
      'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
      'openai/gpt-5': 'GPT-5',
      'openai/gpt-5-mini': 'GPT-5 Mini',
      'minimax/MiniMax-M2.5': 'MiniMax M2.5',
    };
    return modelNames[modelId] || 'AI';
  };

  // Question detection
  const isQuestion = (text: string): boolean => {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.endsWith('?')) return true;
    
    const questionStarters = [
      'what', 'who', 'when', 'where', 'why', 'how', 'which', 
      'can', 'is', 'are', 'do', 'does', 'have', 'has',
      'tell me', 'show me', 'find', 'list all', 'count', 
      'how many', 'do i have', "what's", 'whats'
    ];
    
    return questionStarters.some(starter => 
      trimmed.startsWith(starter + ' ') || trimmed === starter
    );
  };

  // File-related question detection
  const isFileRelatedQuestion = (text: string): boolean => {
    const trimmed = text.trim().toLowerCase();
    const fileKeywords = [
      'file', 'files', 'pdf', 'spreadsheet', 'excel', 'csv', 'image', 'images',
      'drive', 'upload', 'uploaded', 'attachment', 'attachments', 'report',
      'find in files', 'search files', 'look in', 'what does the file say',
      'read the', 'analyze the file', 'in my files', 'my pdfs', 'my documents',
      'txt', 'json', 'xml', 'markdown', '.md', '.pdf', '.xlsx', '.csv', '.txt',
      'invoice', 'invoices', 'receipt', 'receipts', 'contract', 'contracts'
    ];
    
    return fileKeywords.some(kw => trimmed.includes(kw));
  };

  // Detect if input is a question or file-related
  useEffect(() => {
    const query = navigatorSearchQuery;
    setIsAIQuestion(isQuestion(query));
    setIsFileQuestion(isFileRelatedQuestion(query));
  }, [navigatorSearchQuery]);

  // Clear AI response when input is cleared
  useEffect(() => {
    if (!navigatorSearchQuery.trim()) {
      setAiResponse(null);
      setIsAIQuestion(false);
      setIsFileQuestion(false);
    }
  }, [navigatorSearchQuery]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedNavigatorIndex(0);
  }, [navigatorFilter, navigatorSearchQuery]);

  // Activate AI Search when triggered from dashboard
  useEffect(() => {
    if (isOpen && activateAISearch) {
      setIsSearchNavigatorView(true);
      // Focus the search input after a short delay
      setTimeout(() => {
        const searchInput = document.querySelector('[data-ai-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }, [isOpen, activateAISearch]);

  // Load navigator data when opened
  useEffect(() => {
    const loadNavigatorData = async () => {
      if (!isSearchNavigatorView || !user) return;
      
      setIsLoadingNavigator(true);
      try {
        const [databases, flows, apps, filesResult] = await Promise.all([
          databaseService.getUserDatabases(user.id),
          supabase.from('flow_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
          supabase.from('app_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
          supabase.from('drive_files').select('*').eq('uploaded_by', user.id).order('updated_at', { ascending: false }).limit(50)
        ]);

        setNavigatorDatabases(databases || []);
        setNavigatorFlows(flows.data || []);
        setNavigatorApps(apps.data || []);

        // Map files to include database names
        const files = (filesResult.data || []).map(f => ({
          ...f,
          database_name: databases?.find(db => db.id === f.database_id)?.name || 'Unknown'
        }));
        setNavigatorFiles(files);

        // Load tables and documents using batch queries (much faster than per-database queries)
        if (databases && databases.length > 0) {
          const dbIds = databases.map(db => db.id);
          
          // Single batch query instead of N queries per database
          const [tablesResult, docsResult] = await Promise.all([
            supabase.from('table_projects').select('*').in('database_id', dbIds),
            supabase.from('documents').select('*').in('database_id', dbIds).eq('archived', false)
          ]);
          
          // Map database names to items
          const allTables = (tablesResult.data || []).map(t => ({
            ...t,
            database_name: databases.find(db => db.id === t.database_id)?.name
          }));
          const allDocs = (docsResult.data || []).map(d => ({
            ...d,
            database_name: databases.find(db => db.id === d.database_id)?.name
          }));
          
          setNavigatorTables(allTables);
          setNavigatorDocuments(allDocs);
        }
      } catch (error) {
        console.error('Failed to load navigator data:', error);
      } finally {
        setIsLoadingNavigator(false);
      }
    };

    loadNavigatorData();
  }, [isSearchNavigatorView, user]);

  // Handle navigator item click - navigate to resource
  const handleNavigatorItemClick = (type: string, item: any) => {
    setIsSearchNavigatorView(false);
    onClose();
    
    switch (type) {
      case 'database':
        navigate(`/databases/${item.id}`);
        break;
      case 'table':
        navigate(`/databases/${item.database_id}/tables/${item.id}`);
        break;
      case 'document':
        navigate(`/databases/${item.database_id}/docs/${item.id}`);
        break;
      case 'flow':
        navigate(`/flows/${item.id}`);
        break;
      case 'app':
        navigate(`/apps/${item.id}`);
        break;
      case 'file':
        // Navigate to the database's drive tab with the file
        navigate(`/databases/${item.database_id}?tab=drive&file=${item.id}`);
        break;
    }
  };

  // Filter navigator results
  const filterByQuery = (items: any[], fields: string[]) => {
    if (!navigatorSearchQuery) return items;
    const query = navigatorSearchQuery.toLowerCase();
    return items.filter(item => 
      fields.some(field => item[field]?.toLowerCase().includes(query))
    );
  };

  const filteredDatabases = filterByQuery(navigatorDatabases, ['name', 'description']);
  const filteredTables = filterByQuery(navigatorTables, ['name', 'database_name']);
  const filteredDocuments = filterByQuery(navigatorDocuments, ['title', 'database_name']);
  const filteredFlows = filterByQuery(navigatorFlows, ['name', 'description']);
  const filteredApps = filterByQuery(navigatorApps, ['name', 'description']);
  const filteredFiles = filterByQuery(navigatorFiles, ['name', 'file_type', 'database_name']);

  // Build flat list of all filtered items for keyboard navigation
  const getAllNavigatorItems = () => {
    const items: { type: string; item: any }[] = [];
    if (navigatorFilter === 'all' || navigatorFilter === 'databases') {
      filteredDatabases.slice(0, 5).forEach(db => items.push({ type: 'database', item: db }));
    }
    if (navigatorFilter === 'all' || navigatorFilter === 'tables') {
      filteredTables.slice(0, 5).forEach(table => items.push({ type: 'table', item: table }));
    }
    if (navigatorFilter === 'all' || navigatorFilter === 'documents') {
      filteredDocuments.slice(0, 5).forEach(doc => items.push({ type: 'document', item: doc }));
    }
    if (navigatorFilter === 'all' || navigatorFilter === 'files') {
      filteredFiles.slice(0, 5).forEach(file => items.push({ type: 'file', item: file }));
    }
    if (navigatorFilter === 'all' || navigatorFilter === 'flows') {
      filteredFlows.slice(0, 5).forEach(flow => items.push({ type: 'flow', item: flow }));
    }
    if (navigatorFilter === 'all' || navigatorFilter === 'apps') {
      filteredApps.slice(0, 5).forEach(app => items.push({ type: 'app', item: app }));
    }
    return items;
  };

  const navigatorItems = getAllNavigatorItems();

  const handleNavigateUp = () => {
    setSelectedNavigatorIndex(prev => (prev > 0 ? prev - 1 : navigatorItems.length - 1));
  };

  const handleNavigateDown = () => {
    setSelectedNavigatorIndex(prev => (prev < navigatorItems.length - 1 ? prev + 1 : 0));
  };

  // Handle AI question (routes to file-search-chat if file-related)
  const handleAIQuestion = async () => {
    if (!navigatorSearchQuery.trim() || !user) return;
    
    setIsAILoading(true);
    setAiResponse(null);
    
    try {
      // Route to file-search-chat if the question is file-related
      if (isFileQuestion) {
        const { data, error } = await supabase.functions.invoke('file-search-chat', {
          body: { question: navigatorSearchQuery, userId: user.id }
        });

        if (error) throw error;
        
        setAiResponse({
          message: data.message,
          referencedFiles: data.referencedFiles,
          workspaceSummary: {
            totalDatabases: 0,
            totalTables: 0,
            totalDocuments: 0,
            totalFlows: 0,
            totalApps: 0,
            totalFiles: data.totalFilesSearched
          }
        });
      } else {
        // Use regular workspace-chat for general questions
        const { data, error } = await supabase.functions.invoke('workspace-chat', {
          body: { question: navigatorSearchQuery, userId: user.id }
        });

        if (error) throw error;
        
        setAiResponse({
          message: data.message,
          relatedItems: data.relatedItems,
          workspaceSummary: data.workspaceSummary
        });
      }
    } catch (error) {
      console.error('AI question error:', error);
      toast.error('Failed to get AI response');
    } finally {
      setIsAILoading(false);
    }
  };

  // Clear AI response
  const clearAIResponse = () => {
    setAiResponse(null);
    setNavigatorSearchQuery('');
    setIsExpandedAIView(false);
    setAiConversationHistory([]);
  };

  // Expand to full AI chat view
  const expandToAIChat = () => {
    if (aiResponse && navigatorSearchQuery) {
      setAiConversationHistory([
        { role: 'user', content: navigatorSearchQuery },
        { role: 'assistant', content: aiResponse.message }
      ]);
      setIsExpandedAIView(true);
    }
  };

  // Handle continued conversation in expanded view
  const handleAIChatSend = async () => {
    if (!aiChatInput.trim() || !user || isAIChatLoading) return;
    
    const userMessage = aiChatInput.trim();
    setAiChatInput('');
    setIsAIChatLoading(true);
    
    // Add user message to history
    const newHistory = [...aiConversationHistory, { role: 'user' as const, content: userMessage }];
    setAiConversationHistory(newHistory);
    
    try {
      // Route based on original question type
      const endpoint = isFileQuestion ? 'file-search-chat' : 'workspace-chat';
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { 
          question: userMessage, 
          userId: user.id,
          conversationHistory: newHistory.slice(-10) // Send last 10 messages for context
        }
      });

      if (error) throw error;
      
      // Add assistant response to history
      setAiConversationHistory(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      // Update the main aiResponse for related items
      if (data.relatedItems || data.referencedFiles) {
        setAiResponse(prev => ({
          ...prev!,
          message: data.message,
          relatedItems: data.relatedItems || prev?.relatedItems,
          referencedFiles: data.referencedFiles || prev?.referencedFiles
        }));
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast.error('Failed to send message');
      // Remove the user message on error
      setAiConversationHistory(aiConversationHistory);
    } finally {
      setIsAIChatLoading(false);
    }
  };

  // Save conversation to Drive as markdown file
  const saveConversationToDrive = async () => {
    if (!user || aiConversationHistory.length === 0) return;
    
    try {
      // Get first database to save to
      const databases = await databaseService.getUserDatabases(user.id);
      if (!databases || databases.length === 0) {
        toast.error('No database found to save to');
        return;
      }
      
      const content = aiConversationHistory.map(msg => 
        `## ${msg.role === 'user' ? 'You' : 'AI Assistant'}\n\n${msg.content}`
      ).join('\n\n---\n\n');
      
      const fileName = `AI-Chat-${new Date().toISOString().slice(0,10)}.md`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const file = new window.File([blob], fileName, { type: 'text/markdown' });
      
      await driveService.uploadFile(databases[0].id, file);
      toast.success('Conversation saved to Drive');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save conversation');
    }
  };

  // Add conversation to document
  const addToDocument = async () => {
    if (!user || aiConversationHistory.length === 0) return;
    
    try {
      const databases = await databaseService.getUserDatabases(user.id);
      if (!databases || databases.length === 0) {
        toast.error('No database found');
        return;
      }
      
      const sections = aiConversationHistory.map(msg => ({
        type: msg.role === 'user' ? 'heading' : 'paragraph',
        level: msg.role === 'user' ? 3 : undefined,
        content: msg.role === 'user' ? `Question: ${msg.content}` : msg.content
      }));
      
      const lexicalContent = convertSectionsToLexical([
        { type: 'heading', level: 1, content: 'AI Search Conversation' },
        { type: 'paragraph', content: `Created on ${new Date().toLocaleDateString()}` },
        ...sections
      ]);
      
      await documentService.createDocument({
        database_id: databases[0].id,
        title: `AI Search: ${navigatorSearchQuery.slice(0, 50)}`,
        content: lexicalContent
      });
      
      toast.success('Added to Documents');
    } catch (error) {
      console.error('Add to document error:', error);
      toast.error('Failed to add to document');
    }
  };

  // Handle keyboard navigation for search navigator
  useEffect(() => {
    if (!isSearchNavigatorView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNavigateUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNavigateDown();
      } else if (e.key === 'Enter' && navigatorItems.length > 0) {
        e.preventDefault();
        const selectedItem = navigatorItems[selectedNavigatorIndex];
        if (selectedItem) {
          handleNavigatorItemClick(selectedItem.type, selectedItem.item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchNavigatorView, navigatorItems, selectedNavigatorIndex]);

  const loadConversationMessages = (conv: Conversation) => {
    const messages = conv.messages.map((msg, idx) => ({
      id: `${conv.id}-${idx}`,
      content: msg.content,
      isUser: msg.role === 'user',
      timestamp: new Date(msg.timestamp)
    }));
    setChatMessages(messages);
    setSelectedPrompt('');
    setIsChatView(true);
  };

  // Load conversations directly from database (like recent searches pattern)
  const loadConversationsFromDb = async (userId: string) => {
    try {
      // Fetch conversations
      const { data: convData, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!convData || convData.length === 0) {
        setDbConversations([]);
        return;
      }

      // Load messages for each conversation
      const conversationsWithMessages = await Promise.all(
        convData.map(async (conv) => {
          const { data: msgData } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          return {
            id: conv.id,
            pageContext: conv.page_context as 'database' | 'flow' | 'app' | 'cloud',
            contextId: conv.context_id,
            timestamp: new Date(conv.updated_at),
            messages: (msgData || []).map((msg) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              snapshotData: msg.snapshot_data as any,
              isInitialPrompt: msg.is_initial_prompt || false
            })),
            preview: conv.preview_text,
            activeIntegrations: (conv as any).active_integrations || []
          };
        })
      );

      setDbConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Failed to load conversations from database:', error);
      setDbConversations([]);
    }
  };

  // Handle ESC key for navigator view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchNavigatorView) {
        e.preventDefault();
        setIsSearchNavigatorView(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchNavigatorView]);

  // Load current workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setCurrentWorkspace(workspace);
    };
    if (isOpen) loadWorkspace();
  }, [isOpen]);

  // Load available integrations (like Dashboard)
  useEffect(() => {
    const loadIntegrations = async () => {
      if (!user) return;
      try {
        const nodeIntegrations = await integrationsService.getUserNodeIntegrations(user.id);
        setInstalledIntegrations(nodeIntegrations.map(item => ({
          id: item.id,
          name: item.name,
          icon: item.icon || null
        })));
      } catch (error) {
        console.error('Failed to load integrations:', error);
      }
    };
    if (isOpen && user) loadIntegrations();
  }, [isOpen, user]);

  // Detect integrations mentioned in prompt (like Dashboard)
  useEffect(() => {
    if (!promptValue.trim() || installedIntegrations.length === 0) {
      setDetectedIntegrations([]);
      return;
    }
    
    const lowerText = promptValue.toLowerCase();
    const flowKeywords = ['logic', 'flow', 'workflow', 'connect', 'automation', 'automate'];
    const hasFlowContext = flowKeywords.some(kw => lowerText.includes(kw));
    
    if (!hasFlowContext) {
      setDetectedIntegrations([]);
      return;
    }
    
    const detected = installedIntegrations.filter(integration => {
      const integrationName = integration.name.toLowerCase();
      return lowerText.includes(integrationName);
    });
    
    setDetectedIntegrations(detected);
    
    // Auto-select flow type when integrations are detected
    if (detected.length > 0 && !selectedProjectTypes.includes('flow')) {
      setSelectedProjectTypes(prev => [...prev, 'flow']);
    }
  }, [promptValue, installedIntegrations]);

  // Handle file attachment
  const handleFileAttachment = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle project type selection
  const toggleProjectType = (type: string) => {
    setSelectedProjectTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  // Real-time AI intent detection as user types
  useEffect(() => {
    if (!promptValue.trim()) {
      setAiSuggestedTypes([]);
      return;
    }
    
    const debounceTimer = setTimeout(() => {
      const prompt = promptValue.toLowerCase();
      const suggestions: string[] = [];
      
      // Helper: word boundary matching to prevent false positives
      const matchesKeyword = (text: string, keyword: string) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(text);
      };
      
      // Database indicators (removed 'content' to prevent "containing" false positive)
      const databaseKeywords = ['database', 'table', 'data', 'store', 'record', 'crm', 'inventory', 'contact', 'customer', 'product', 'order', 'user', 'collection', 'manage', 'list', 'track', 'report', 'document'];
      if (databaseKeywords.some(kw => matchesKeyword(prompt, kw))) {
        suggestions.push('database');
      }

      // Flow indicators
      const flowKeywords = ['automat', 'workflow', 'trigger', 'schedule', 'sync', 'webhook', 'notification', 'email', 'api', 'integration', 'process', 'logic', 'flow', 'timetable'];
      if (flowKeywords.some(kw => matchesKeyword(prompt, kw))) {
        suggestions.push('flow');
      }

      // App indicators (moved 'report' to document detection, not app)
      const appKeywords = ['app', 'website', 'site', 'dashboard', 'portal', 'interface', 'ui', 'form', 'page', 'admin', 'panel', 'visual', 'builder'];
      if (appKeywords.some(kw => matchesKeyword(prompt, kw))) {
        suggestions.push('app');
      }

      // Default to database if nothing detected but has meaningful content
      if (suggestions.length === 0 && promptValue.trim().length > 10) {
        suggestions.push('database');
      }

      setAiSuggestedTypes(suggestions);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [promptValue]);

  // Check if prompt contains document keywords
  const containsDocumentKeywords = (text: string): boolean => {
    const keywords = ['doc', 'document', 'documents', 'report', 'reports', 'write', 'draft', 'article'];
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
  };

  // Check if prompt contains table keywords
  const containsTableKeywords = (text: string): boolean => {
    const keywords = ['table', 'tables', 'spreadsheet', 'sheet', 'collection', 'collections'];
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
  };

  // Check if prompt contains media keywords (image, chart, video)
  const containsMediaKeywords = (text: string): { hasImage: boolean; hasChart: boolean; hasVideo: boolean } => {
    const lowerText = text.toLowerCase();
    const matchWord = (keyword: string) => new RegExp(`\\b${keyword}\\b`, 'i').test(lowerText);
    
    const imageKeywords = ['image', 'picture', 'photo', 'illustration', 'diagram', 'infographic', 'visual'];
    const chartKeywords = ['chart', 'graph', 'visualization', 'visualize', 'statistics', 'data viz', 'bar chart', 'pie chart', 'line chart'];
    const videoKeywords = ['video', 'animation', 'motion', 'explainer', 'animated', 'clip'];
    
    return {
      hasImage: imageKeywords.some(matchWord),
      hasChart: chartKeywords.some(matchWord),
      hasVideo: videoKeywords.some(matchWord)
    };
  };

  // Extract project name from prompt using shared utility
  const extractProjectName = (text: string): string | null => {
    const { extractSmartProjectName } = require('@/utils/projectNaming');
    const name = extractSmartProjectName(text);
    return name !== 'New Project' ? name : null;
  };

  // Using shared convertSectionsToLexical from utils - supports chart/image/video

  // Handle generate - full functionality like Dashboard
  const handleGenerate = async () => {
    if (!promptValue.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (!user) {
      toast.error("Please sign in to generate projects");
      return;
    }

    // Use AI suggestions or selected types, or fall back to smart detection
    let projectTypes = [...selectedProjectTypes];
    if (projectTypes.length === 0) {
      // Use AI-detected suggestions first
      if (aiSuggestedTypes.length > 0) {
        projectTypes = [...aiSuggestedTypes];
        console.log('Using AI-suggested project types:', projectTypes);
      } else {
        // Fallback detection - use independent if statements to detect MULTIPLE types
        const prompt = promptValue.toLowerCase();
        if (prompt.includes('flow') || prompt.includes('logic') || prompt.includes('workflow') || prompt.includes('automation')) {
          projectTypes.push('flow');
        }
        if (prompt.includes('app') || prompt.includes('website') || prompt.includes('site') || prompt.includes('ui')) {
          projectTypes.push('app');
        }
        if (prompt.includes('database') || prompt.includes('report') || prompt.includes('document') || prompt.includes('data') || prompt.includes('table')) {
          if (!projectTypes.includes('database')) {
            projectTypes.push('database');
          }
        }
        // Default to database if nothing detected
        if (projectTypes.length === 0) {
          projectTypes.push('database');
        }
      }
    }

    setIsGenerating(true);
    
    try {
      const hasAttachments = attachedFiles.length > 0;
      const shouldGenerateDocument = containsDocumentKeywords(promptValue);

      // Documents + attachments need a database container; ensure it exists.
      if ((hasAttachments || shouldGenerateDocument) && !projectTypes.includes('database')) {
        projectTypes = [...projectTypes, 'database'];
      }

      // Always use full generation for ALL project types
      toast.loading(`Generating ${projectTypes.join(", ")}...`, { id: 'gen-toast' });

      const integrationsForGeneration = installedIntegrations.map(i => ({
        id: i.id,
        name: i.name,
        nodeType: i.id,
        category: 'integration',
        description: ''
      }));

      // Get ALL available node types from registry for AI context (including those requiring installation)
      // Match ai-assistant format with installation status markers
      const allNodeTypesForAI = nodeRegistry.getAllNodeTypesForAI();
      const userInstalledTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
      
      const availableNodeTypes: AvailableNodeType[] = allNodeTypesForAI.map(p => ({
        type: p.type,
        name: p.name,
        description: p.description || p.name,
        category: p.category,
        requiresInstallation: p.requiresInstallation || false,
        isInstalled: !p.requiresInstallation || userInstalledTypes.includes(p.type)
      }));

      // Note: Auto-installation of integrations is now handled centrally in 
      // projectGenerationService.createFlowProject() - it analyzes actual AI-generated 
      // nodes and installs any missing integrations before saving the flow.
      // This ensures all node types the AI suggests get installed, not just keyword matches.

      const [createdProjects] = await Promise.all([
        projectGenerationService.handleFullGeneration(
          promptValue,
          projectTypes,
          user.id,
          integrationsForGeneration,
          availableNodeTypes
        ),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);

      // Find the created database if any
      const createdDatabase = createdProjects.find(p => p.type === 'database');

      // If database was created and we have attachments or document keywords, add content to it
      if (createdDatabase && (hasAttachments || shouldGenerateDocument)) {
        // Upload files to the database drive
        if (hasAttachments) {
          toast.loading(`Uploading ${attachedFiles.length} file(s)...`, { id: 'gen-toast' });
          for (const file of attachedFiles) {
            await driveService.uploadFile(createdDatabase.id, file);
          }
        }

        // Generate document if keywords detected
        if (shouldGenerateDocument) {
          toast.loading('Generating document with AI...', { id: 'gen-toast' });
          
          try {
            const { data: aiResponse, error: aiError } = await supabase.functions.invoke('database-ai-actions', {
              body: {
                prompt: promptValue,
                databaseId: createdDatabase.id,
                userId: user.id,
                existingTables: [],
                existingDocuments: []
              }
            });

            if (!aiError && aiResponse?.action === 'create_document' && aiResponse?.document) {
              let sections = aiResponse.document.sections || [];
              
              // Generate images/videos for sections that have prompts
              if (sectionsNeedMediaGeneration(sections)) {
                toast.loading('Generating images and media...', { id: 'gen-toast' });
                sections = await generateMediaForSections(sections, {
                  databaseId: createdDatabase.id,
                  userId: user.id
                });
              }
              
              const lexicalContent = convertSectionsToLexical(sections);
              await documentService.createDocument({
                database_id: createdDatabase.id,
                title: aiResponse.document.title || promptValue.slice(0, 100).trim(),
                content: lexicalContent
              });
            } else if (aiResponse?.action !== 'create_document') {
              // FALLBACK: AI returned wrong action, create basic document anyway
              console.log('AI returned wrong action for document, creating fallback document');
              const docTitle = extractProjectName(promptValue) || `Report: ${promptValue.slice(0, 50)}`;
              const fallbackSections = [
                { type: 'heading', level: 1, content: docTitle },
                { type: 'paragraph', content: `This document was created based on your request: "${promptValue}"` },
                { type: 'heading', level: 2, content: 'Overview' },
                { type: 'paragraph', content: 'Add your content here.' }
              ];
              const lexicalContent = convertSectionsToLexical(fallbackSections);
              await documentService.createDocument({
                database_id: createdDatabase.id,
                title: docTitle,
                content: lexicalContent
              });
            }
          } catch (docError) {
            console.error('Error generating AI document:', docError);
            // Even on error, create a basic document
            const docTitle = extractProjectName(promptValue) || `Document: ${promptValue.slice(0, 50)}`;
            const basicSections = [
              { type: 'heading', level: 1, content: docTitle },
              { type: 'paragraph', content: 'Document content goes here.' }
            ];
            try {
              const lexicalContent = convertSectionsToLexical(basicSections);
              await documentService.createDocument({
                database_id: createdDatabase.id,
                title: docTitle,
                content: lexicalContent
              });
            } catch (fallbackError) {
              console.error('Even fallback document creation failed:', fallbackError);
            }
          }
        }
      }

      toast.success(
        `Successfully created ${createdProjects.length} project${createdProjects.length > 1 ? 's' : ''}!`,
        { id: 'gen-toast' }
      );

      // Save initial prompt to AI assistant conversation - single conversation with ALL created project types
      if (promptValue.trim() && createdProjects.length > 0) {
        // Use DETECTED project types (not just created) to ensure all badges show correctly
        const allProjectTypes = projectTypes.join(',');
        // Use the first project's ID as the context
        const firstProject = createdProjects[0];
        
        // Get actual node types used if flow was created
        let actualUsedIntegrations: string[] = [];
        const createdFlow = createdProjects.find(p => p.type === 'flow');
        
        if (createdFlow && allProjectTypes.includes('flow')) {
          try {
            // Query the flow_data to get actual nodes used
            const { data: flowData } = await supabase
              .from('flow_data')
              .select('nodes')
              .eq('flow_project_id', createdFlow.id)
              .order('version', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (flowData?.nodes && Array.isArray(flowData.nodes)) {
              // Extract unique node types from the flow
              const nodeTypes = (flowData.nodes as any[])
                .map((node: any) => node.data?.type)
                .filter(Boolean)
                .filter((type: string, idx: number, arr: string[]) => arr.indexOf(type) === idx);
              actualUsedIntegrations = nodeTypes.slice(0, 10);
            }
          } catch (err) {
            console.error('Error fetching flow nodes for chat history:', err);
          }
        }
        
        console.log('SearchModal saving conversation - types:', allProjectTypes, 'integrations:', actualUsedIntegrations);
        await addInitialPromptToConversation(allProjectTypes, firstProject.id, promptValue, user.id, actualUsedIntegrations, []);
      }

      // Navigate to first created project
      if (createdProjects.length > 0) {
        const firstProject = createdProjects[0];
        if (firstProject.type === 'flow') {
          navigate(`/flows/${firstProject.id}`);
        } else if (firstProject.type === 'app') {
          // Pass autoBuild param to trigger AI site generation in AppBuilder
          navigate(`/apps/${firstProject.id}?autoBuild=${encodeURIComponent(promptValue)}`);
        } else {
          navigate(`/databases/${firstProject.id}`);
        }
      }

      // Clear form
      setPromptValue("");
      setSelectedProjectTypes([]);
      setAttachedFiles([]);
      setDetectedIntegrations([]);
      onClose();
      
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error.message || 'Unknown error'}`, { id: 'gen-toast' });
    } finally {
      setIsGenerating(false);
    }
  };
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, user]);
  const loadInitialData = async () => {
    try {
      // Load prompt categories with dummy data
      const promptCategories: PromptCategory[] = [{
        name: "Marketing Operations",
        prompts: ["Generate email marketing campaigns from customer data", "Create social media content calendar", "Analyze campaign performance metrics", "Write product descriptions and copy"]
      }, {
        name: "Product Operations",
        prompts: ["Generate product roadmap insights", "Analyze user feedback for feature requests", "Create product requirement documents", "Track competitor product features"]
      }, {
        name: "Sales & CRM",
        prompts: ["Qualify leads and score prospects", "Generate personalized sales outreach", "Analyze sales pipeline performance", "Create follow-up sequences"]
      }, {
        name: "Operations",
        prompts: ["Automate workflow processes", "Generate operational reports", "Optimize resource allocation", "Track performance KPIs"]
      }, {
        name: "HR/Recruiting",
        prompts: ["Screen candidate resumes", "Generate job descriptions", "Analyze employee satisfaction", "Create onboarding checklists"]
      }];
      setCategories(promptCategories);

      // Load popular searches
      try {
        const popularData = await searchService.getPopularSearches();
        setPopularSearches(popularData);
      } catch (error) {
        console.error("Failed to load popular searches:", error);
        setPopularSearches([{
          query: "Generate reports",
          count: 150
        }, {
          query: "Analyze data trends",
          count: 120
        }, {
          query: "Create summaries",
          count: 95
        }]);
      }

      // Load user's recent searches if logged in
      if (user) {
        try {
          const recentData = await searchService.getUserSearchHistory(user.id);
          setRecentSearches(recentData);
        } catch (error) {
          console.error("Failed to load recent searches:", error);
        }

        // Load all conversations from database directly (like recent searches pattern)
        try {
          await loadConversationsFromDb(user.id);
        } catch (error) {
          console.error("Failed to load conversations:", error);
        }
      }

      // Load default prompts
      try {
        const defaultPrompts = await searchService.searchDocuments("", "prompt");
        setSearchResults(defaultPrompts);
      } catch (error) {
        console.error("Failed to load default prompts:", error);
      }
    } catch (error) {
      console.error("Failed to load search data:", error);
    }
  };

  // Search without tracking (for live typing)
  const handleSearchPreview = async (query: string) => {
    if (!query.trim()) {
      try {
        const defaultPrompts = await searchService.searchDocuments("", selectedCategory === "all" ? undefined : selectedCategory);
        setSearchResults(defaultPrompts);
      } catch (error) {
        console.error("Failed to load default prompts:", error);
      }
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchService.searchDocuments(query, selectedCategory === "all" ? undefined : selectedCategory);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Search with tracking (only on explicit submit - Enter or Search button)
  const handleSearchSubmit = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchService.searchDocuments(query, selectedCategory === "all" ? undefined : selectedCategory);
      setSearchResults(results);

      // Track the search only on explicit submit
      if (user) {
        await searchService.trackSearch(user.id, query, results.length, selectedCategory);
        // Refresh recent searches to show the new search immediately
        const recentData = await searchService.getUserSearchHistory(user.id);
        setRecentSearches(recentData);
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };
  const getFilteredProjects = () => {
    if (!submittedSearch.trim()) return [];
    const query = submittedSearch.toLowerCase();
    const results: { id: string; name: string; type: string; icon: any }[] = [];
    
    navigatorDatabases.filter(db => db.name.toLowerCase().includes(query)).forEach(db => 
      results.push({ id: db.id, name: db.name, type: 'database', icon: Database })
    );
    navigatorFlows.filter(f => f.name.toLowerCase().includes(query)).forEach(f => 
      results.push({ id: f.id, name: f.name, type: 'flow', icon: Workflow })
    );
    navigatorApps.filter(a => a.name.toLowerCase().includes(query)).forEach(a => 
      results.push({ id: a.id, name: a.name, type: 'app', icon: AppWindow })
    );
    
    return results;
  };
  const getFilteredConversations = () => {
    // Only show conversations with actual dialogue (2+ messages)
    const dialogues = dbConversations.filter(conv => conv.messages.length >= 2);
    if (!submittedSearch.trim()) return dialogues.slice(0, 5);
    return dialogues.filter(conv => conv.preview.toLowerCase().includes(submittedSearch.toLowerCase()) || conv.messages.some(msg => msg.content.toLowerCase().includes(submittedSearch.toLowerCase()))).slice(0, 5);
  };
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Debounced search preview (no tracking)
    const timeoutId = setTimeout(() => {
      handleSearchPreview(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleSearchSubmit(searchQuery);
    }
  };
  const handleSelectResult = (prompt: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    onClose();
  };
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    handleSearchPreview(searchQuery);
  };
  const handleRecentSearchClick = (search: UserSearch) => {
    setSelectedPrompt(search.search_query);
    setIsChatView(true);
    setChatInput(search.search_query);
  };
  const handlePopularSearchClick = (query: string) => {
    setSearchQuery(query);
    setActiveTab("search");
    handleSearchSubmit(query);
  };
  const handleCopyPrompt = (prompt: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    onClose();
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    
    const userMessage = {
      id: Date.now().toString(),
      content: chatInput,
      isUser: true,
      timestamp: new Date(),
      image: uploadedImage || undefined
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setUploadedImage(null);

    try {
      let conversationId = selectedConversation?.id;
      
      // Create new conversation if needed
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            page_context: 'search',
            context_id: user.id,
            preview_text: currentInput.slice(0, 100)
          })
          .select()
          .single();
          
        if (convError) throw convError;
        conversationId = newConv.id;
        
        setSelectedConversation({
          id: newConv.id,
          pageContext: 'search',
          contextId: newConv.context_id,
          timestamp: new Date(),
          messages: [],
          preview: currentInput.slice(0, 60)
        });
      }
      
      // Save user message to database
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: currentInput
      });
      
      // Determine which AI edge function to call based on context
      const pageContext = selectedConversation?.pageContext || 'search';
      let response;
      
      if (pageContext === 'database' || pageContext.includes('database')) {
        response = await supabase.functions.invoke('data-chat', {
          body: {
            message: currentInput,
            databaseId: selectedConversation?.contextId,
            conversationHistory: chatMessages.map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.content
            })),
            selectedModel
          }
        });
      } else {
        response = await supabase.functions.invoke('ai-assistant', {
          body: {
            message: currentInput,
            pageContext: pageContext,
            contextId: selectedConversation?.contextId,
            model: selectedModel,
            conversationHistory: chatMessages.map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.content
            }))
          }
        });
      }
      
      const aiContent = response.data?.message || response.data?.response || 
        'I apologize, but I encountered an issue processing your request.';
      
      const aiResponseMsg = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        isUser: false,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponseMsg]);
      
      // Save AI response to database
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiContent,
        model: selectedModel
      });
      
      // Update conversation's updated_at timestamp and preview
      await supabase
        .from('ai_conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          preview_text: currentInput.slice(0, 100)
        })
        .eq('id', conversationId);
        
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return <><Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] w-[95vw] h-[95vh]' : 'max-w-6xl w-full h-[80vh]'} overflow-hidden p-0 transition-all duration-200`} hideCloseButton={isChatView} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search your workspace</DialogTitle>
        
        <div className="flex h-full relative z-10">
          {!isChatView ? <>
              {/* Main content area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Dashboard Section with Background Image */}
                <div 
                  className="relative flex-shrink-0"
                >
                  {/* Background image with dark mode filter */}
                  <div 
                    className="absolute inset-0 dark:opacity-30 dark:mix-blend-luminosity"
                    style={{
                      backgroundImage: `url(${searchModalBg})`,
                      backgroundPosition: 'right center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: 'auto 100%',
                    }}
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/10 dark:via-background/95 dark:to-background/85" />
                  
                  <div className="relative z-10">
                    <div className="p-6 flex-shrink-0">
                      {/* Header with title and workspace badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-light text-foreground">Search your workspace</h1>
                          <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 bg-muted text-muted-foreground">
                            {currentWorkspace?.icon_url ? (
                              <img src={currentWorkspace.icon_url} alt="" className="w-4 h-4 rounded object-cover" />
                            ) : (
                              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-primary">
                                  {(currentWorkspace?.name || 'W').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-xs font-medium">{currentWorkspace?.name || 'Workspace'}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Description text */}
                      <p className="text-[13px] text-muted-foreground/70 leading-relaxed font-normal max-w-[85%]">Search information, docs, and users. Explore insights, research, and discoveries while summarizing<br />docs, threads and meetings or analyze for insights and answers all with {currentWorkspace?.name || 'your'} Cloud's Search</p>
                    </div>
                    
                    {/* Prompt Box - inside background section */}
                    <div className="px-6 pb-6">
                      <div className="space-y-4 relative">
                        {/* Suggestion tags with expand button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {dynamicPrompts.map((prompt, index) => (
                            <button 
                              key={index}
                              className="px-3 py-1.5 text-xs border border-border rounded-full hover:bg-muted/50 transition-colors bg-background/50 backdrop-blur-sm" 
                              onClick={() => setPromptValue(prompt.fullPrompt)}
                            >
                              {prompt.label}
                            </button>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 opacity-70 hover:opacity-100 rounded-full border border-border bg-background/50 backdrop-blur-sm"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                          >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                          </Button>
                        </div>
                        
                        {/* Prompt input box */}
                        <div className="relative border border-border bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden">
                          {/* Attached files and detected integrations preview */}
                          {(attachedFiles.length > 0 || detectedIntegrations.length > 0) && <div className="flex flex-wrap gap-2 p-2 border-b border-border">
                              {attachedFiles.map((file, index) => <div key={`file-${index}`} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                                  {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-muted-foreground" /> : <FileText className="h-3 w-3 text-muted-foreground" />}
                                  <span className="max-w-[100px] truncate">{file.name}</span>
                                  <button onClick={() => removeAttachedFile(index)} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>)}
                              {detectedIntegrations.map(integration => <div key={`integration-${integration.id}`} className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md text-xs border border-purple-200 dark:border-purple-700">
                                  {integration.icon ? <img src={integration.icon} alt="" className="h-3 w-3 rounded-sm" /> : <Network className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                                  <span className="text-purple-700 dark:text-purple-300">{integration.name}</span>
                                </div>)}
                            </div>}
                          
                          {/* Textarea */}
                          <div className="max-h-[200px] overflow-y-auto">
                            <Textarea placeholder="Describe what you want to build or search for..." className="min-h-[80px] text-sm px-3 py-2 pb-14 border-0 bg-transparent resize-none focus-visible:ring-0 rounded-none" value={promptValue} onChange={e => setPromptValue(e.target.value)} />
                          </div>
                          
                          {/* Hidden file input */}
                          <input type="file" id="search-modal-file-input" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md" onChange={e => handleFileAttachment(e.target.files)} />
                          
                          {/* Bottom action bar */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-background/90 via-background/70 to-transparent backdrop-blur-sm">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-full" onClick={() => document.getElementById('search-modal-file-input')?.click()}>
                                <Paperclip className="h-3 w-3 mr-1" />
                                Attach
                              </Button>
                              <DropdownMenu modal={false} onOpenChange={open => !open && setIntegrationSearchQuery("")}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-full">
                                    <Link2 className="h-3 w-3 mr-1" />
                                    Connect
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-background w-64" align="start" style={{ zIndex: 9999 }}>
                                  {installedIntegrations.length > 0 ? <>
                                      <div className="p-2 border-b border-border">
                                        <div className="relative">
                                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                          <Input placeholder="Search integrations..." value={integrationSearchQuery} onChange={e => setIntegrationSearchQuery(e.target.value)} className="h-7 pl-7 text-xs" />
                                        </div>
                                      </div>
                                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                        Available Integrations
                                      </div>
                                      <div className="max-h-[240px] overflow-y-auto">
                                        {installedIntegrations.filter(integration => integration.name.toLowerCase().includes(integrationSearchQuery.toLowerCase())).map(integration => <DropdownMenuItem key={integration.id} onClick={() => {
                                  const currentText = promptValue.trim();
                                  const flowPrefix = currentText.toLowerCase().includes('flow') || currentText.toLowerCase().includes('logic') ? '' : 'Create a logic flow with ';
                                  setPromptValue(prev => prev + (prev ? ' ' : flowPrefix) + integration.name);
                                  setIntegrationSearchQuery("");
                                }}>
                                            {integration.icon ? <img src={integration.icon} alt="" className="h-4 w-4 mr-2 rounded-sm" /> : <Network className="h-4 w-4 mr-2" />}
                                            {integration.name}
                                          </DropdownMenuItem>)}
                                      </div>
                                    </> : <div className="px-3 py-4 text-center">
                                      <Network className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                                      <p className="text-xs text-muted-foreground mb-2">No integrations installed</p>
                                      <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                navigate('/flows');
                                onClose();
                              }}>
                                        Browse Integrations
                                      </Button>
                                    </div>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button variant={isSearchNavigatorView ? "default" : "ghost"} size="sm" className={`h-7 px-2 text-xs rounded-full ${isSearchNavigatorView ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`} onClick={async () => {
                          setNavigatorSearchQuery(promptValue);
                          setIsSearchNavigatorView(!isSearchNavigatorView);
                          // Track search when user clicks Search button
                          if (promptValue.trim() && user) {
                            await searchService.trackSearch(user.id, promptValue, 0, 'search');
                            const recentData = await searchService.getUserSearchHistory(user.id);
                            setRecentSearches(recentData);
                          }
                        }}>
                                <Search className="h-3.5 w-3.5 mr-1" />
                                Search
                              </Button>
                              <button 
                                type="button" 
                                className={`relative flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                                  selectedProjectTypes.includes('database') 
                                    ? 'bg-gradient-to-b from-orange-100 to-orange-50 dark:from-orange-400/20 dark:to-orange-400/10 border-orange-200 dark:border-orange-400/30' 
                                    : aiSuggestedTypes.includes('database') && !selectedProjectTypes.length
                                      ? 'border-orange-300 dark:border-orange-500/50 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                                      : 'border-border hover:border-orange-200'
                                }`} 
                                onClick={() => toggleProjectType('database')}
                                title={aiSuggestedTypes.includes('database') ? 'AI suggests: Database' : 'Create Database'}
                              >
                                <Database className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                                  selectedProjectTypes.includes('database') || aiSuggestedTypes.includes('database') 
                                    ? 'text-orange-600 dark:text-orange-400' 
                                    : 'text-muted-foreground'
                                }`} />
                                {aiSuggestedTypes.includes('database') && !selectedProjectTypes.includes('database') && (
                                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Data</span>
                                )}
                              </button>
                              <button 
                                type="button" 
                                className={`relative flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                                  selectedProjectTypes.includes('flow') 
                                    ? 'bg-gradient-to-b from-purple-100 to-purple-50 dark:from-purple-400/20 dark:to-purple-400/10 border-purple-200 dark:border-purple-400/30' 
                                    : aiSuggestedTypes.includes('flow') && !selectedProjectTypes.length
                                      ? 'border-purple-300 dark:border-purple-500/50 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                                      : 'border-border hover:border-purple-200'
                                }`} 
                                onClick={() => toggleProjectType('flow')}
                                title={aiSuggestedTypes.includes('flow') ? 'AI suggests: Automation Flow' : 'Create Flow'}
                              >
                                <Network className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                                  selectedProjectTypes.includes('flow') || aiSuggestedTypes.includes('flow') 
                                    ? 'text-purple-600 dark:text-purple-400' 
                                    : 'text-muted-foreground'
                                }`} />
                                {aiSuggestedTypes.includes('flow') && !selectedProjectTypes.includes('flow') && (
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Logic</span>
                                )}
                              </button>
                              <button 
                                type="button" 
                                className={`relative flex items-center gap-1.5 h-7 px-2 rounded-full border transition-all duration-300 ${
                                  selectedProjectTypes.includes('app') 
                                    ? 'bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-400/20 dark:to-blue-400/10 border-blue-200 dark:border-blue-400/30' 
                                    : aiSuggestedTypes.includes('app') && !selectedProjectTypes.length
                                      ? 'border-blue-300 dark:border-blue-500/50 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                      : 'border-border hover:border-blue-200'
                                }`} 
                                onClick={() => toggleProjectType('app')}
                                title={aiSuggestedTypes.includes('app') ? 'AI suggests: App/Dashboard' : 'Create App'}
                              >
                                <Sparkles className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-300 ${
                                  selectedProjectTypes.includes('app') || aiSuggestedTypes.includes('app') 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-muted-foreground'
                                }`} />
                                {aiSuggestedTypes.includes('app') && !selectedProjectTypes.includes('app') && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">App</span>
                                )}
                              </button>
                              <Button className="rounded-full h-7 px-3 text-xs bg-primary hover:bg-primary/90" onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating ? <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    Generating...
                                  </> : <>
                                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                                    Generate
                                  </>}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Search Navigator Dropdown */}
                        {isSearchNavigatorView && <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg h-[600px] max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col min-h-0">
                            {/* Search Input */}
                            <div className="p-3 border-b border-border/50">
                              <div className={`relative flex items-center bg-muted/50 rounded-md border transition-colors ${isAIQuestion ? 'border-purple-400 dark:border-purple-500' : 'border-border'}`}>
                                {isAIQuestion ? (
                                  <BrainCircuit className="absolute left-3 h-4 w-4 text-purple-500 pointer-events-none z-10" />
                                ) : (
                                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                                )}
                                <input 
                                  type="text" 
                                  data-ai-search-input
                                  value={navigatorSearchQuery} 
                                  onChange={e => setNavigatorSearchQuery(e.target.value)} 
                                  onKeyDown={async (e) => {
                          if (e.key === 'Enter' && navigatorSearchQuery.trim() && user) {
                            e.preventDefault();
                            if (isAIQuestion) {
                              // Handle AI question
                              await handleAIQuestion();
                            } else {
                              // Handle regular search
                              await searchService.trackSearch(user.id, navigatorSearchQuery, 0, 'navigator_search');
                              const recentData = await searchService.getUserSearchHistory(user.id);
                              setRecentSearches(recentData);
                            }
                          }
                        }} placeholder={isAIQuestion ? "Ask about your workspace..." : "Search..."} className="w-full h-9 text-sm bg-transparent border-0 outline-none focus:ring-0 focus:outline-none" style={{
                          paddingLeft: '40px',
                          paddingRight: '80px'
                        }} autoFocus />
                                {isAIQuestion && (
                                  <Badge variant="secondary" className="absolute right-12 h-5 px-1.5 text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0">
                                    AI • {getModelDisplayName(selectedModel)}
                                  </Badge>
                                )}
                                <Button variant="ghost" size="icon" className="absolute right-1 h-7 w-7 rounded-full hover:bg-muted" onClick={() => setIsSearchNavigatorView(false)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Navigate Bar */}
                            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground">Navigate</span>
                                <div className="flex items-center border rounded">
                                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-r-none" onClick={handleNavigateUp}>
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  <div className="w-px h-3 bg-border" />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-l-none" onClick={handleNavigateDown}>
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1.5" onClick={() => setIsSearchNavigatorView(false)}>
                                Close
                                <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">esc</Badge>
                              </Button>
                            </div>
                            
                            {/* Filter Chips */}
                            <div className="flex items-center gap-1.5 px-3 py-2 border-b">
                              <Button variant={navigatorFilter === 'all' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('all')}>
                                <Sparkles className="h-3 w-3" />
                                All
                              </Button>
                              <Button variant={navigatorFilter === 'databases' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('databases')}>
                                <Database className="h-3 w-3" />
                                Databases
                              </Button>
                              <Button variant={navigatorFilter === 'tables' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('tables')}>
                                <Building2 className="h-3 w-3" />
                                Tables
                              </Button>
                              <Button variant={navigatorFilter === 'documents' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('documents')}>
                                <FileText className="h-3 w-3" />
                                Documents
                              </Button>
                              <Button variant={navigatorFilter === 'flows' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('flows')}>
                                <Workflow className="h-3 w-3" />
                                Flows
                              </Button>
                              <Button variant={navigatorFilter === 'apps' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] gap-1 rounded-full px-2" onClick={() => setNavigatorFilter('apps')}>
                                <AppWindow className="h-3 w-3" />
                                Apps
                              </Button>
                            </div>
                            
                            {/* Results */}
                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
                              {isAILoading ? (
                                <div className="flex flex-col items-center justify-center p-8 gap-3">
                                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                                  <span className="text-sm text-muted-foreground">Thinking...</span>
                                </div>
                              ) : aiResponse && !isExpandedAIView ? (
                                <div className="p-3">
                                  {/* AI Response Card */}
                                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-primary/10 rounded-lg border border-purple-500/20 mb-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <BrainCircuit className="h-4 w-4 text-purple-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {/* Header with model badge and expand button */}
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0">
                                            AI • {getModelDisplayName(selectedModel)}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-purple-500/20"
                                            onClick={expandToAIChat}
                                            title="Expand to full chat"
                                          >
                                            <Maximize2 className="h-3.5 w-3.5 text-purple-500" />
                                          </Button>
                                        </div>
                                        
                                        <MarkdownRenderer>{aiResponse.message}</MarkdownRenderer>
                                        
                                        {/* Related Items */}
                                        {aiResponse.relatedItems && aiResponse.relatedItems.length > 0 && (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {aiResponse.relatedItems.map((item, idx) => (
                                              <Button 
                                                key={idx}
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs gap-1.5"
                                                onClick={() => handleNavigatorItemClick(item.type, { id: item.id, database_id: item.database_id })}
                                              >
                                                {item.type === 'database' && <Database className="h-3 w-3 text-amber-600" />}
                                                {item.type === 'table' && <Building2 className="h-3 w-3 text-muted-foreground" />}
                                                {item.type === 'document' && <FileText className="h-3 w-3 text-blue-600" />}
                                                {item.type === 'flow' && <Workflow className="h-3 w-3 text-purple-600" />}
                                                {item.type === 'app' && <AppWindow className="h-3 w-3 text-green-600" />}
                                                {item.name}
                                              </Button>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Referenced Files */}
                                        {aiResponse.referencedFiles && aiResponse.referencedFiles.length > 0 && (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {aiResponse.referencedFiles.map((file, idx) => (
                                              <Button 
                                                key={idx}
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-xs gap-1.5"
                                                onClick={() => handleNavigatorItemClick('file', file)}
                                              >
                                                <File className="h-3 w-3 text-blue-600" />
                                                {file.name}
                                              </Button>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Workspace Summary */}
                                        {aiResponse.workspaceSummary && (
                                          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                                            <span>{aiResponse.workspaceSummary.totalDatabases} databases</span>
                                            <span>{aiResponse.workspaceSummary.totalTables} tables</span>
                                            <span>{aiResponse.workspaceSummary.totalDocuments} docs</span>
                                            {aiResponse.workspaceSummary.totalFiles !== undefined && (
                                              <span>{aiResponse.workspaceSummary.totalFiles} files searched</span>
                                            )}
                                            <span>{aiResponse.workspaceSummary.totalFlows} flows</span>
                                            <span>{aiResponse.workspaceSummary.totalApps} apps</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 mb-3">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 text-xs gap-1.5 flex-1"
                                      onClick={expandToAIChat}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      Continue Chat
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 text-xs gap-1.5"
                                      onClick={saveConversationToDrive}
                                    >
                                      <Save className="h-3 w-3" />
                                      Save
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 text-xs gap-1.5"
                                      onClick={addToDocument}
                                    >
                                      <FileText className="h-3 w-3" />
                                      Add to Doc
                                    </Button>
                                  </div>
                                  
                                  {/* Clear Button */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={clearAIResponse}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1.5" />
                                    Clear & browse workspace
                                  </Button>
                                </div>
                              ) : isExpandedAIView ? (
                                /* Expanded AI Chat View with Sidebar */
                                <div className="flex h-full">
                                  {/* Left Sidebar - Recent Search & Chats */}
                                  <div className="w-[260px] border-r flex flex-col h-full bg-background overflow-hidden flex-shrink-0">
                                    <div className="p-4 border-b flex-shrink-0">
                                      <h3 className="text-sm font-semibold">Recent Search & Chats</h3>
                                    </div>
                                    <ScrollArea className="flex-1">
                                      <div className="p-3 space-y-2">
                                        {(() => {
                                          const unifiedItems = [
                                            ...recentSearches.map(search => ({
                                              type: 'search' as const,
                                              timestamp: new Date(search.created_at),
                                              data: search
                                            })),
                                            ...dbConversations.filter(conv => conv.messages.length >= 2).map(conv => ({
                                              type: 'chat' as const,
                                              timestamp: new Date(conv.timestamp),
                                              data: conv
                                            }))
                                          ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                                          const getContextTags = (context: string) => {
                                            const tags: { label: string; color: string; bgColor: string; }[] = [];
                                            if (context.includes('database') || context.includes('data')) {
                                              tags.push({ label: 'Data & Docs', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' });
                                            }
                                            if (context.includes('app') || context.includes('builder')) {
                                              tags.push({ label: 'AI Apps', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' });
                                            }
                                            if (context.includes('flow') || context.includes('logic')) {
                                              tags.push({ label: 'Logic Flow', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' });
                                            }
                                            return tags;
                                          };

                                          return unifiedItems.slice(0, 20).map((item, index) => {
                                            if (item.type === 'search') {
                                              const search = item.data;
                                              return (
                                                <div 
                                                  key={`sidebar-search-${index}`} 
                                                  className="flex gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                                  onClick={() => {
                                                    setNavigatorSearchQuery(search.search_query);
                                                    setAiConversationHistory([{ role: 'user', content: search.search_query }]);
                                                    setTimeout(() => handleAIQuestion(), 100);
                                                  }}
                                                >
                                                  <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                      <Search className="h-4 w-4 text-primary" />
                                                    </div>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-foreground line-clamp-2">
                                                      "{search.search_query}"
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                      {format(new Date(search.created_at), 'M/d/yyyy')} at {format(new Date(search.created_at), 'h:mm a')}
                                                    </p>
                                                  </div>
                                                </div>
                                              );
                                            } else {
                                              const conv = item.data;
                                              const contextTags = getContextTags(conv.pageContext);
                                              return (
                                                <div 
                                                  key={`sidebar-chat-${index}`} 
                                                  className="flex gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                                  onClick={() => {
                                                    const firstUserMsg = conv.messages.find(m => m.role === 'user');
                                                    if (firstUserMsg) {
                                                      setNavigatorSearchQuery(firstUserMsg.content);
                                                      setAiConversationHistory(conv.messages.map(m => ({ 
                                                        role: m.role as 'user' | 'assistant', 
                                                        content: m.content 
                                                      })));
                                                    }
                                                  }}
                                                >
                                                  <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                      <MessageSquare className="h-4 w-4 text-primary" />
                                                    </div>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    {contextTags.length > 0 && (
                                                      <div className="flex flex-wrap gap-1 mb-1">
                                                        {contextTags.map((tag, tagIndex) => (
                                                          <span key={tagIndex} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded border ${tag.bgColor} ${tag.color}`}>
                                                            {tag.label}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    )}
                                                    <p className="text-xs text-foreground line-clamp-2">
                                                      "{conv.preview}"
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                      {format(new Date(conv.timestamp), 'M/d/yyyy')} at {format(new Date(conv.timestamp), 'h:mm a')}
                                                    </p>
                                                  </div>
                                                </div>
                                              );
                                            }
                                          });
                                        })()}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                  
                                  {/* Right Content - Chat */}
                                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    {/* Header with Action Buttons */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
                                      <div className="flex items-center gap-2">
                                        <BrainCircuit className="h-5 w-5 text-purple-500" />
                                        <span className="font-medium text-sm">AI Chat</span>
                                        <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0">
                                          {getModelDisplayName(selectedModel)}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-7 text-xs gap-1.5"
                                          onClick={addToDocument}
                                        >
                                          <FileText className="h-3 w-3" />
                                          Add to Doc
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-7 text-xs gap-1.5"
                                          onClick={saveConversationToDrive}
                                        >
                                          <HardDrive className="h-3 w-3" />
                                          Save to Drive
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => setIsExpandedAIView(false)}
                                        >
                                          <Minimize2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Messages */}
                                    <ScrollArea className="flex-1 p-4">
                                      <div className="space-y-4 pb-4">
                                        {aiConversationHistory.map((msg, idx) => (
                                          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                <BrainCircuit className="h-4 w-4 text-purple-500" />
                                              </div>
                                            )}
                                            <div className={`max-w-[80%] rounded-lg p-3 ${
                                              msg.role === 'user' 
                                                ? 'bg-primary text-primary-foreground' 
                                                : 'bg-muted'
                                            }`}>
                                              {msg.role === 'assistant' ? (
                                                <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                                              ) : (
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                              )}
                                            </div>
                                            {msg.role === 'user' && (
                                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                <Users className="h-4 w-4 text-primary" />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {isAIChatLoading && (
                                          <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                              <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                                            </div>
                                            <div className="bg-muted rounded-lg p-3">
                                              <p className="text-sm text-muted-foreground">Thinking...</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </ScrollArea>
                                    
                                    {/* Input with more padding */}
                                    <div className="p-4 pt-3 pb-6 border-t bg-background flex-shrink-0">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                          <input
                                            type="text"
                                            value={aiChatInput}
                                            onChange={(e) => setAiChatInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAIChatSend();
                                              }
                                            }}
                                            placeholder="Ask a follow-up question..."
                                            className="w-full h-12 px-4 pr-10 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            disabled={isAIChatLoading}
                                          />
                                        </div>
                                        <Button 
                                          size="icon" 
                                          className="h-12 w-12 rounded-lg bg-purple-600 hover:bg-purple-700"
                                          onClick={handleAIChatSend}
                                          disabled={!aiChatInput.trim() || isAIChatLoading}
                                        >
                                          {isAIChatLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Send className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : isLoadingNavigator ? (
                                <div className="flex items-center justify-center p-8">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                              <div className="p-3 space-y-4">
                                {/* Databases Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'databases') && filteredDatabases.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Databases</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredDatabases.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredDatabases.slice(0, 5).map((db, idx) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'database' && item.item.id === db.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={db.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('database', db)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                              <Database className="h-3 w-3 text-amber-600" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{db.name}</p>
                                              {db.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{db.description}</p>}
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Tables Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'tables') && filteredTables.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Tables</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredTables.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredTables.slice(0, 5).map((table, idx) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'table' && item.item.id === table.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={table.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('table', table)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                              <Building2 className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{table.name}</p>
                                              <p className="text-[10px] text-muted-foreground">{table.database_name}</p>
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Documents Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'documents') && filteredDocuments.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Documents</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredDocuments.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredDocuments.slice(0, 5).map((doc, idx) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'document' && item.item.id === doc.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={doc.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('document', doc)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                              <FileText className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{doc.title}</p>
                                              <p className="text-[10px] text-muted-foreground">{doc.database_name}</p>
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Flows Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'flows') && filteredFlows.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Flows</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredFlows.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredFlows.slice(0, 5).map((flow, idx) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'flow' && item.item.id === flow.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={flow.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('flow', flow)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                              <Workflow className="h-3 w-3 text-purple-600" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{flow.name}</p>
                                              {flow.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{flow.description}</p>}
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Apps Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'apps') && filteredApps.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Apps</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredApps.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredApps.slice(0, 5).map((app, idx) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'app' && item.item.id === app.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={app.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('app', app)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                              <AppWindow className="h-3 w-3 text-emerald-600" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{app.name}</p>
                                              {app.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{app.description}</p>}
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Files Section */}
                                {(navigatorFilter === 'all' || navigatorFilter === 'files') && filteredFiles.length > 0 && <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-foreground">Files</span>
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {filteredFiles.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-0.5">
                                      {filteredFiles.slice(0, 5).map((file) => {
                                        const globalIndex = navigatorItems.findIndex(item => item.type === 'file' && item.item.id === file.id);
                                        const isSelected = globalIndex === selectedNavigatorIndex;
                                        return (
                                        <div 
                                          key={file.id} 
                                          className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                          onClick={() => handleNavigatorItemClick('file', file)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                              <HardDrive className="h-3 w-3 text-cyan-600" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium">{file.name}</p>
                                              <p className="text-[10px] text-muted-foreground">{file.file_type.toUpperCase()} • {file.database_name}</p>
                                            </div>
                                          </div>
                                          <Button variant="ghost" size="sm" className={`h-5 text-[10px] transition-opacity gap-1 px-1.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Open
                                            <CornerDownLeft className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )})}
                                    </div>
                                  </div>}
                                
                                {/* Empty state */}
                                {filteredDatabases.length === 0 && filteredTables.length === 0 && filteredDocuments.length === 0 && filteredFiles.length === 0 && filteredFlows.length === 0 && filteredApps.length === 0 && (
                                  <div className="text-center py-8 text-muted-foreground text-sm">
                                    {navigatorSearchQuery ? 'No results found' : 'No projects yet'}
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Search & Chats Section - Plain background, below the dashboard section */}
                <div className="flex-1 h-full border-t overflow-y-auto overflow-x-hidden scrollbar-thin">
                  <div className="p-6">
                    {isSearching ? <div className="flex items-center justify-center h-64">
                        <WhirlpoolLoader size="md" />
                      </div> : <div className="space-y-6">
                        {/* Recent Search & Chats - always visible */}
                        <div className="flex flex-col gap-4">
                          {/* Full Width List - no split view */}
                          <div className="w-full flex flex-col">
                            <h3 className="text-lg font-semibold mb-4">Recent search & chat</h3>
                            <div className="max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden scrollbar-thin">
                            <div className="space-y-4 pr-2">
                              {/* Unified Timeline - searches and chats mixed by timestamp */}
                              {(() => {
                                // Combine searches and chats into unified array
                                const unifiedItems = [
                                  ...recentSearches.map(search => ({
                                    type: 'search' as const,
                                    timestamp: new Date(search.created_at),
                                    data: search
                                  })),
                                  ...dbConversations.filter(conv => conv.messages.length >= 2).map(conv => ({
                                    type: 'chat' as const,
                                    timestamp: new Date(conv.timestamp),
                                    data: conv
                                  }))
                                ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                                // Helper functions for chat items
                                const getContextTags = (context: string) => {
                                  const tags: { label: string; color: string; bgColor: string; }[] = [];
                                  if (context.includes('database') || context.includes('data')) {
                                    tags.push({ label: 'Data & Docs', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' });
                                  }
                                  if (context.includes('app') || context.includes('builder')) {
                                    tags.push({ label: 'AI Apps', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' });
                                  }
                                  if (context.includes('flow') || context.includes('logic')) {
                                    tags.push({ label: 'Logic Flow', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' });
                                  }
                                  return tags;
                                };

                                // Get integration tags - prioritize stored integrations, fallback to message content
                                const getIntegrationTags = (conv: any) => {
                                  // Only show integrations for flow-related conversations
                                  if (!conv.pageContext?.includes('flow') && !conv.pageContext?.includes('logic')) {
                                    return [];
                                  }
                                  // First try stored active integrations - max 10 for UI
                                  if (conv.activeIntegrations && conv.activeIntegrations.length > 0) {
                                    return conv.activeIntegrations.slice(0, 10);
                                  }
                                  // Fallback to scanning message content
                                  const integrationKeywords = ['Webflow', 'Google Sheets', 'Notion', 'Airtable', 'Slack', 'Discord', 'Stripe', 'Shopify', 'Snowflake', 'Gmail', 'ActiveCampaign', 'Firecrawl', 'WordPress', 'Mailchimp', 'HubSpot', 'Google Docs'];
                                  const foundTags: string[] = [];
                                  (conv.messages || []).forEach((msg: any) => {
                                    integrationKeywords.forEach(keyword => {
                                      if (msg.content?.toLowerCase().includes(keyword.toLowerCase()) && !foundTags.includes(keyword)) {
                                        foundTags.push(keyword);
                                      }
                                    });
                                  });
                                  return foundTags.slice(0, 10);
                                };

                                return unifiedItems.slice(0, 15).map((item, index) => {
                                  if (item.type === 'search') {
                                    const search = item.data;
                                    return (
                                      <div 
                                        key={`search-${index}`} 
                                        className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => {
                                          // Trigger expanded AI chat view with this search query
                                          setNavigatorSearchQuery(search.search_query);
                                          setIsSearchNavigatorView(true);
                                          setAiConversationHistory([{ role: 'user', content: search.search_query }]);
                                          setIsExpandedAIView(true);
                                          // Trigger AI search
                                          setTimeout(() => {
                                            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                                            handleAIQuestion();
                                          }, 100);
                                        }}
                                      >
                                        <div className="flex-shrink-0">
                                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Search className="h-5 w-5 text-primary" />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                                            "{search.search_query}"
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            By {displayName} at {format(new Date(search.created_at), 'M/d/yyyy')} at {format(new Date(search.created_at), 'h:mm a')}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const conv = item.data;
                                    const contextTags = getContextTags(conv.pageContext);
                                    const integrationTags = getIntegrationTags(conv);
                                    const isSelected = selectedConversation?.id === conv.id;
                                    return (
                                      <div 
                                        key={`chat-${index}`} 
                                        className="flex gap-4 p-4 rounded-xl border transition-colors cursor-pointer border-border/50 bg-card hover:bg-muted/30"
                                        onClick={() => {
                                          // Trigger expanded AI chat view with this conversation
                                          const firstUserMsg = conv.messages.find(m => m.role === 'user');
                                          if (firstUserMsg) {
                                            setNavigatorSearchQuery(firstUserMsg.content);
                                            setIsSearchNavigatorView(true);
                                            // Load full conversation history into the expanded view
                                            setAiConversationHistory(conv.messages.map(m => ({ 
                                              role: m.role as 'user' | 'assistant', 
                                              content: m.content 
                                            })));
                                            setIsExpandedAIView(true);
                                          } else {
                                            // Fallback to old behavior
                                            setSelectedConversation(conv);
                                            loadConversationMessages(conv);
                                          }
                                        }}
                                      >
                                        <div className="flex-shrink-0">
                                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <MessageSquare className="h-5 w-5 text-primary" />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                          {contextTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {contextTags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${tag.bgColor} ${tag.color}`}>
                                                  {tag.label === 'Data & Docs' && <FileText className="h-2.5 w-2.5" />}
                                                  {tag.label === 'AI Apps' && <AppWindow className="h-2.5 w-2.5" />}
                                                  {tag.label === 'Logic Flow' && <Workflow className="h-2.5 w-2.5" />}
                                                  {tag.label}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                                            "{conv.preview}"
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            By {displayName} at {format(new Date(conv.timestamp), 'M/d/yyyy')} at {format(new Date(conv.timestamp), 'h:mm a')}
                                          </p>
                                          {integrationTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                              {integrationTags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border/50">
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                });
                              })()}
                              
                              {/* Empty state when no searches and no chats */}
                              {recentSearches.length === 0 && dbConversations.filter(conv => conv.messages.length >= 2).length === 0 && (
                                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                                  No recent activity. Start a search or conversation to see your history here.
                                </div>
                              )}
                            </div>
                            </div>
                          </div>
                        </div>
                      </div>}
                  </div>
                </div>
              </div>
            </> : (/* Split-View Chat with Sidebar */
        <div className="flex w-full h-full overflow-hidden">
              {/* Left Sidebar - Recent Search & Chats */}
              <div className="w-[280px] border-r flex flex-col h-full bg-background overflow-hidden">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="text-sm font-semibold">Recent Search & Chats</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
                  <div className="p-3 space-y-2">
                    {(() => {
                      const unifiedItems = [
                        ...recentSearches.map(search => ({
                          type: 'search' as const,
                          timestamp: new Date(search.created_at),
                          data: search
                        })),
                        ...dbConversations.filter(conv => conv.messages.length >= 2).map(conv => ({
                          type: 'chat' as const,
                          timestamp: new Date(conv.timestamp),
                          data: conv
                        }))
                      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                      const getContextTags = (context: string) => {
                        const tags: { label: string; color: string; bgColor: string; }[] = [];
                        if (context.includes('database') || context.includes('data')) {
                          tags.push({ label: 'Data & Docs', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' });
                        }
                        if (context.includes('app') || context.includes('builder')) {
                          tags.push({ label: 'AI Apps', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' });
                        }
                        if (context.includes('flow') || context.includes('logic')) {
                          tags.push({ label: 'Logic Flow', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' });
                        }
                        return tags;
                      };

                      // Get integration tags - prioritize stored integrations, fallback to message content
                      const getIntegrationTags = (conv: any) => {
                        // Only show integrations for flow-related conversations
                        if (!conv.pageContext?.includes('flow') && !conv.pageContext?.includes('logic')) {
                          return [];
                        }
                        // First try stored active integrations - max 10 for UI
                        if (conv.activeIntegrations && conv.activeIntegrations.length > 0) {
                          return conv.activeIntegrations.slice(0, 10);
                        }
                        // Fallback to scanning message content
                        const integrationKeywords = ['Webflow', 'Google Sheets', 'Notion', 'Airtable', 'Slack', 'Discord', 'Stripe', 'Shopify', 'Snowflake', 'Gmail', 'ActiveCampaign', 'Firecrawl', 'WordPress', 'Mailchimp', 'HubSpot', 'Google Docs'];
                        const foundTags: string[] = [];
                        (conv.messages || []).forEach((msg: any) => {
                          integrationKeywords.forEach(keyword => {
                            if (msg.content?.toLowerCase().includes(keyword.toLowerCase()) && !foundTags.includes(keyword)) {
                              foundTags.push(keyword);
                            }
                          });
                        });
                        return foundTags.slice(0, 10);
                      };

                      return unifiedItems.slice(0, 20).map((item, index) => {
                        if (item.type === 'search') {
                          const search = item.data;
                          return (
                            <div 
                              key={`search-${index}`} 
                              className="flex gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                // Trigger expanded AI chat view with this search query
                                setNavigatorSearchQuery(search.search_query);
                                setIsSearchNavigatorView(true);
                                setAiConversationHistory([{ role: 'user', content: search.search_query }]);
                                setIsExpandedAIView(true);
                                // Trigger AI search
                                setTimeout(() => {
                                  handleAIQuestion();
                                }, 100);
                              }}
                            >
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Search className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground line-clamp-2">
                                  "{search.search_query}"
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  By {displayName} at {format(new Date(search.created_at), 'M/d/yyyy')} at {format(new Date(search.created_at), 'h:mm a')}
                                </p>
                              </div>
                            </div>
                          );
                        } else {
                          const conv = item.data;
                          const contextTags = getContextTags(conv.pageContext);
                          const integrationTags = getIntegrationTags(conv);
                          const isSelected = selectedConversation?.id === conv.id;
                          return (
                            <div 
                              key={`chat-${index}`} 
                              className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}
                              onClick={() => {
                                // Trigger expanded AI chat view with this conversation
                                const firstUserMsg = conv.messages.find(m => m.role === 'user');
                                if (firstUserMsg) {
                                  setNavigatorSearchQuery(firstUserMsg.content);
                                  setIsSearchNavigatorView(true);
                                  // Load full conversation history into the expanded view
                                  setAiConversationHistory(conv.messages.map(m => ({ 
                                    role: m.role as 'user' | 'assistant', 
                                    content: m.content 
                                  })));
                                  setIsExpandedAIView(true);
                                } else {
                                  // Fallback to old behavior
                                  setSelectedConversation(conv);
                                  loadConversationMessages(conv);
                                }
                              }}
                            >
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                {contextTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {contextTags.map((tag, tagIndex) => (
                                      <span key={tagIndex} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded border ${tag.bgColor} ${tag.color}`}>
                                        {tag.label === 'Data & Docs' && <FileText className="h-2 w-2" />}
                                        {tag.label === 'AI Apps' && <AppWindow className="h-2 w-2" />}
                                        {tag.label === 'Logic Flow' && <Workflow className="h-2 w-2" />}
                                        {tag.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-foreground line-clamp-2">
                                  "{conv.preview}"
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  By {displayName} at {format(new Date(conv.timestamp), 'M/d/yyyy')} at {format(new Date(conv.timestamp), 'h:mm a')}
                                </p>
                                {integrationTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {integrationTags.map((tag, tagIndex) => (
                                      <span key={tagIndex} className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Content - Conversation */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header with context tags */}
                <div className="p-4 border-b flex items-start justify-between flex-shrink-0 bg-background">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {selectedConversation?.preview || 'Conversation'}
                      </p>
                    </div>
                    {selectedConversation && (
                      <div className="flex items-center gap-2 ml-11">
                        {(() => {
                          const tags: { label: string; color: string; bgColor: string; icon: any }[] = [];
                          if (selectedConversation.pageContext.includes('database') || selectedConversation.pageContext.includes('data')) {
                            tags.push({ label: 'Data & Docs', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: FileText });
                          }
                          if (selectedConversation.pageContext.includes('app') || selectedConversation.pageContext.includes('builder')) {
                            tags.push({ label: 'AI Apps', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: AppWindow });
                          }
                          if (selectedConversation.pageContext.includes('flow') || selectedConversation.pageContext.includes('logic')) {
                            tags.push({ label: 'Logic Flow', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Workflow });
                          }
                          return tags.map((tag, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border shadow-sm bg-white ${tag.color}`}>
                              <span className="text-muted-foreground">◀ View</span>
                              <tag.icon className="h-2.5 w-2.5" />
                              {tag.label}
                            </span>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    setIsChatView(false);
                    setChatMessages([]);
                    setSelectedConversation(null);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6 max-w-2xl">
                    {chatMessages.length === 0 && !selectedPrompt && (
                      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                        No messages in this conversation.
                      </div>
                    )}
                    
                    {chatMessages.map((message, msgIndex) => (
                      <div key={message.id} className="space-y-2">
                        {/* Message Header */}
                        <div className="flex items-center gap-2">
                          {message.isUser ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-medium text-primary-foreground">
                                {user?.email?.substring(0, 2).toUpperCase() || 'YO'}
                              </div>
                              <span className="text-xs font-semibold text-primary uppercase">You</span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <Sparkles className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase">Agent</span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(message.timestamp, 'h:mm a')}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div className={`rounded-xl p-4 ${message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                          {message.image && (
                            <div className="mb-2 text-xs opacity-70">
                              📎 {message.image.name}
                            </div>
                          )}
                          {message.isUser ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-primary-foreground">
                              {message.content}
                            </p>
                          ) : (
                            <MarkdownRenderer>{message.content}</MarkdownRenderer>
                          )}
                        </div>
                        
                        {/* Action buttons for user messages */}
                        {message.isUser && (
                          <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                            <span>{format(message.timestamp, 'h:mm a')}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                navigator.clipboard.writeText(message.content);
                                toast.success("Copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setChatMessages(prev => prev.filter(m => m.id !== message.id));
                                toast.success("Message deleted");
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  <span className="text-[10px]">Restore</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="end" className="w-64 p-3">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Restore to this point?</p>
                                  <p className="text-xs text-muted-foreground">
                                    This will remove all messages after this point.
                                  </p>
                                  <div className="flex justify-end gap-2 mt-3">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        // Keep messages up to and including this one
                                        setChatMessages(prev => prev.slice(0, msgIndex + 1));
                                        toast.success("Conversation restored to this point");
                                      }}
                                    >
                                      Restore
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                        
                        {/* Action buttons for agent messages */}
                        {!message.isUser && (
                          <div className="flex items-center gap-1 mt-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                navigator.clipboard.writeText(message.content);
                                toast.success("Copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setChatMessages(prev => prev.filter(m => m.id !== message.id));
                                toast.success("Message deleted");
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>)}
        </div>

      </DialogContent>
      
    </Dialog>

  </>;
}