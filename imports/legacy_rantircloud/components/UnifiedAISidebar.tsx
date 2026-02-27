import { useEffect, useState, useRef } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { X, Sparkles, Paperclip, FileSpreadsheet, Image as ImageIcon, FileText, Globe, Sheet, Database, Workflow, AppWindow, Cloud, Clock, Figma as FigmaIcon, Zap, ChevronUp, Copy, Trash2, RotateCcw, StopCircle, ArrowRight, Wand2, Search, MessageSquare, LayoutTemplate, ClipboardList, PanelTop, Import, Palette, MessageCircle, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAISidebarStore, Message, Conversation, AIModelType } from '@/stores/aiSidebarStore';
import { ConversationHistory } from '@/components/ConversationHistory';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useFlowStore } from '@/lib/flow-store';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useSnapshotStore } from '@/stores/snapshotStore';
import { nodeRegistry } from '@/lib/node-registry';
import { parseSpreadsheetFile, parseCSVText, toGoogleSheetCSVUrl } from '@/lib/dataImporters';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { FlowNodeCard } from '@/components/FlowNodeCard';

import { convertSectionsToLexical } from '@/utils/lexicalConverter';
import { generateMediaForSections, sectionsNeedMediaGeneration } from '@/utils/mediaGenerationService';
import { detectMissingIntegrations, getNodeDisplayName } from '@/utils/detectRequiredIntegrations';
import { integrationsService } from '@/services/integrationsService';
import { generateRecordId, generateFakeValue } from '@/utils/generateRecordId';
import { useAIAppBuildStream } from '@/hooks/useAIAppBuildStream';
import { AIBuildProgress } from '@/components/app-builder/AIBuildProgress';
import { ImportOptionsModal } from '@/components/app-builder/ImportOptionsModal';
import webflowIcon from '@/assets/icons/webflow-icon.png';
import figmaIcon from '@/assets/icons/figma-icon.jpg';
import framerIcon from '@/assets/icons/framer-icon.png';
import { AIWallSidebarContent } from '@/components/ai-wall/AIWallSidebarContent';

interface UnifiedAISidebarProps {
  pageContext: 'database' | 'flow' | 'app';
  contextId: string;
  contextData?: any;
}

export function UnifiedAISidebar({ pageContext, contextId, contextData }: UnifiedAISidebarProps) {
  const { user } = useAuth();
  const dbPageContext = pageContext;
  const {
    isOpen,
    activeTab,
    currentConversationId,
    conversations,
    selectedModel,
    setActiveTab,
    setCurrentConversation,
    addConversation,
    updateConversation,
    setConversations,
    loadConversations,
    saveConversations,
    toggleSidebar,
    setSelectedModel
  } = useAISidebarStore();


  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMode, setAiMode] = useState<'build' | 'chat'>(() => (pageContext === 'app' ? 'build' : 'chat'));
  const [thinkingStatus, setThinkingStatus] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedDatasets, setImportedDatasets] = useState<Array<{ name: string; fields: string[]; rows: any[]; source: string }>>([]);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    recordIds?: string[];
    recordId?: string;
    affectedCount?: number;
    tableId: string;
    tableRecords: any[];
    columnName?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { logAIChatStarted, logAIChatMessage } = useActivityLogger();
  const { addNode, nodes, setEdges } = useFlowStore();
  const { triggerDocumentsRefresh, triggerTablesRefresh } = useDatabaseStore();

  // App-only Build mode support
  const isAppBuildMode = pageContext === 'app' && aiMode === 'build';
  const [currentBuildPrompt, setCurrentBuildPrompt] = useState<string>('');
  const {
    isBuilding,
    buildSteps,
    progress,
    startBuild: originalStartBuild,
    cancelBuild,
    resetBuild,
  } = useAIAppBuildStream();

  // Wrapper for startBuild to track the prompt and add to conversation
  const handleStartBuild = async (prompt: string) => {
    setCurrentBuildPrompt(prompt);
    
    // Add user message to conversation
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Save to conversation in DB
    let conversationDbId = currentConversationId;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && !conversationDbId) {
        const { data: convData } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: authUser.id,
            page_context: dbPageContext,
            context_id: contextId,
            preview_text: prompt.substring(0, 60) + (prompt.length > 60 ? '...' : ''),
          })
          .select()
          .single();
        if (convData) {
          conversationDbId = convData.id;
          setCurrentConversation(convData.id);
        }
      }
      if (conversationDbId) {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationDbId,
          role: 'user',
          content: prompt,
        });
        updateConversation(conversationDbId, newMessages);
      }
    } catch (err) {
      console.warn('Failed to save build message:', err);
    }
    
    await originalStartBuild(prompt);
    
    // After build completes, add an AI response message
    const aiMessage: Message = {
      role: 'assistant',
      content: '✅ Build complete! Your app has been generated on the canvas.',
      timestamp: new Date(),
      model: 'AI Builder',
    };
    const finalMessages = [...newMessages, aiMessage];
    setMessages(finalMessages);
    
    if (conversationDbId) {
      try {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationDbId,
          role: 'assistant',
          content: aiMessage.content,
        });
        updateConversation(conversationDbId, finalMessages);
      } catch (err) {
        console.warn('Failed to save build response:', err);
      }
    }
  };

  const buildTemplates = [
    { 
      label: 'Landing Page + Assessment', 
      icon: LayoutTemplate,
      prompt: 'Build an enterprise landing page that routes users into a guided assessment. Include a hero, value proposition, and CTA that launches a multi-step wizard. The wizard should collect company size, industry, goals, and technical maturity.',
      description: 'Enterprise landing with hero, value props, and multi-step assessment wizard'
    },
    { 
      label: 'Marketing Site with Intake Wizard', 
      icon: ClipboardList,
      prompt: 'Create a multi-step intake wizard used across enterprise sites including company info, roles, goals, technical stack, and compliance constraints.',
      description: 'Multi-step wizard collecting company info, roles, and technical requirements'
    },
    { 
      label: 'Assessment-Driven Dashboard', 
      icon: PanelTop,
      prompt: 'Generate a personalized dashboard layout based on completed intake data with conditional KPI cards and modules.',
      description: 'Dynamic dashboard with conditional KPIs based on user assessment data'
    },
    { 
      label: 'Existing Website Migration', 
      icon: Import,
      prompt: 'Migrate an existing website into Rantir while adding an assessment layer to qualify and route users.',
      description: 'Convert existing sites to Rantir with added user qualification layer'
    },
    { 
      label: 'Import from Sketch or Figma', 
      icon: Palette,
      prompt: 'Convert Figma designs into editable dashboard or marketing site based Rantir elements and components.',
      description: 'Transform Figma/Sketch designs into editable Rantir components'
    },
    { 
      label: 'Chat Wizard + Assessment Hybrid', 
      icon: MessageCircle,
      prompt: 'Create a conversational wizard that collects structured data through chat interactions inside a large hero section with a simple navigation.',
      description: 'Conversational data collection in a hero section with chat interface'
    },
  ];

  // Cancel message handler
  const handleCancelMessage = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (isAppBuildMode) {
      cancelBuild();
    }
    setIsProcessing(false);
    setThinkingStatus('');
    toast.info(isAppBuildMode ? 'Build cancelled' : 'Message cancelled');
  };

  const defaultPrompts = {
    database: [
      'Help me optimize this database schema',
      'Generate SQL queries for common operations',
      'Suggest indexes for better performance',
      'Review my table relationships'
    ],
    flow: [
      'Watch how to Get Started',
      'Generate a Video Dashboard Flow',
      'Task manager automation',
      'Habit tracker workflow'
    ],
    app: [
      'Create a new component',
      'Suggest UI improvements',
      'Help with responsive design',
      'Add authentication flow'
    ],
    cloud: [
      'Help me set up a new project',
      'Explain the file structure',
      'Generate boilerplate code',
      'Debug terminal errors'
    ]
  };

  // Load conversations for this context on mount
  useEffect(() => {
    // Load from localStorage first for immediate hydration, then DB
    loadConversations(pageContext, contextId);
    loadConversationsFromDB();
  }, [pageContext, contextId]);

  const loadConversationsFromDB = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('page_context', dbPageContext)
        .eq('context_id', contextId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convError) throw convError;

      // Load messages for each conversation
      const conversationsWithMessages = await Promise.all(
        (convData || []).map(async (conv) => {
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
            messages: (msgData || []).map((msg: any) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              snapshotData: msg.snapshot_data || undefined,
              isInitialPrompt: msg.is_initial_prompt || false,
              model: msg.snapshot_data?.model || undefined
            })),
            preview: conv.preview_text
          };
        })
      );

      // Load into store - replace all conversations for this context
      if (conversationsWithMessages.length > 0) {
        // Filter out any existing conversations for this context, then add the new ones
        const otherContextConvs = conversations.filter(
          c => !(c.pageContext === pageContext && c.contextId === contextId)
        );
        setConversations([...conversationsWithMessages, ...otherContextConvs]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Auto-scroll to bottom when messages or streaming content change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pageContext]);

  // Save conversations when they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations();
    }
  }, [conversations]);

  // Auto-select the most recent conversation after hydration
  useEffect(() => {
    if (!currentConversationId && conversations.length > 0 && messages.length === 0) {
      const latest = conversations[0];
      setCurrentConversation(latest.id);
      setMessages(latest.messages || []);
    }
  }, [conversations, currentConversationId]);

  // Sync messages when currentConversationId changes (e.g., from dashboard generation or switching conversations)
  useEffect(() => {
    if (currentConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation) {
        // Always load the correct conversation's messages when ID changes
        setMessages(conversation.messages || []);
      }
    }
  }, [currentConversationId]);

  // Helper function to create document from AI response
  const createDocumentFromAI = async (databaseId: string, title: string, markdownContent: string) => {
    const lexicalContent = convertMarkdownToLexical(markdownContent);
    
    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        database_id: databaseId,
        title: title,
        content: lexicalContent,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return doc;
  };

  // Helper function to create table from AI response
  const createTableFromAI = async (databaseId: string, userId: string, tableData: any) => {
    type ValidFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'image' | 'pdf' | 'codescript' | 'reference' | 'multireference' | 'document' | 'multidocument' | 'json' | 'email' | 'password' | 'timestamp';
    
    const mapFieldType = (type: string): ValidFieldType => {
      const typeMap: Record<string, ValidFieldType> = {
        'string': 'text',
        'text': 'text',
        'number': 'number',
        'integer': 'number',
        'float': 'number',
        'date': 'date',
        'datetime': 'timestamp',
        'boolean': 'boolean',
        'bool': 'boolean',
        'select': 'select',
        'dropdown': 'select',
        'multiselect': 'multiselect',
        'email': 'email',
        'textarea': 'textarea',
        'longtext': 'textarea',
        'image': 'image',
        'file': 'pdf',
        'json': 'json',
        'password': 'password'
      };
      return typeMap[type.toLowerCase()] || 'text';
    };

    const tableSchema = {
      id: crypto.randomUUID(),
      name: tableData.name,
      fields: tableData.schema.fields.map((field: any) => ({
        id: crypto.randomUUID(),
        name: field.name,
        type: mapFieldType(field.type),
        required: field.required || false,
        options: field.options,
        description: field.description
      }))
    };

    const { data: table, error } = await supabase
      .from('table_projects')
      .insert({
        name: tableData.name,
        description: tableData.description || '',
        user_id: userId,
        database_id: databaseId,
        schema: tableSchema,
        records: []
      })
      .select()
      .single();
    
    if (error) throw error;
    return table;
  };

  // Helper function to generate default value for populate_column
  const generateDefaultValue = (field: any, index: number, record: any): any => {
    if (!field) return null;
    const nameLower = (field.name || '').toLowerCase();
    const type = field.type || 'text';
    
    switch (type) {
      case 'number':
        if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
          return Math.floor(Math.random() * 1000) + 10;
        }
        if (nameLower.includes('quantity') || nameLower.includes('stock') || nameLower.includes('count')) {
          return Math.floor(Math.random() * 100) + 1;
        }
        return Math.floor(Math.random() * 1000);
      case 'checkbox':
        return Math.random() > 0.3;
      case 'select':
        if (field.options && field.options.length > 0) {
          return field.options[Math.floor(Math.random() * field.options.length)];
        }
        return null;
      case 'date':
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 365));
        return date.toISOString().split('T')[0];
      case 'email':
        return `user${index + 1}@example.com`;
      case 'url':
        return `https://example.com/item-${index + 1}`;
      default: // text
        if (nameLower.includes('description') || nameLower.includes('desc')) {
          return `Description for item ${index + 1}`;
        }
        if (nameLower.includes('category') || nameLower.includes('type')) {
          const categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Books', 'Toys'];
          return categories[Math.floor(Math.random() * categories.length)];
        }
        // Try to derive from record name/title
        const baseName = record?.name || record?.title || `Item ${index + 1}`;
        return `${baseName} - ${field.name}`;
    }
  };

  // Helper function to convert markdown to Lexical editor format
  const convertMarkdownToLexical = (markdown: string): any => {
    const lines = markdown.split('\n');
    const children: any[] = [];
    
    let currentList: any[] | null = null;
    let listType: 'bullet' | 'number' | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '') {
        if (currentList && currentList.length > 0) {
          children.push({
            type: 'list',
            listType: listType,
            start: 1,
            tag: listType === 'bullet' ? 'ul' : 'ol',
            children: currentList
          });
          currentList = null;
          listType = null;
        }
        continue;
      }

      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);
      
      if (h1Match) {
        children.push({ type: 'heading', tag: 'h1', children: [{ type: 'text', text: h1Match[1] }] });
        continue;
      }
      if (h2Match) {
        children.push({ type: 'heading', tag: 'h2', children: [{ type: 'text', text: h2Match[1] }] });
        continue;
      }
      if (h3Match) {
        children.push({ type: 'heading', tag: 'h3', children: [{ type: 'text', text: h3Match[1] }] });
        continue;
      }

      const bulletMatch = line.match(/^[-*] (.+)$/);
      if (bulletMatch) {
        if (!currentList || listType !== 'bullet') {
          if (currentList && currentList.length > 0) {
            children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList });
          }
          currentList = [];
          listType = 'bullet';
        }
        currentList.push({ type: 'listitem', children: [{ type: 'text', text: bulletMatch[1] }] });
        continue;
      }

      const numberMatch = line.match(/^\d+\. (.+)$/);
      if (numberMatch) {
        if (!currentList || listType !== 'number') {
          if (currentList && currentList.length > 0) {
            children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList });
          }
          currentList = [];
          listType = 'number';
        }
        currentList.push({ type: 'listitem', children: [{ type: 'text', text: numberMatch[1] }] });
        continue;
      }

      if (currentList && currentList.length > 0) {
        children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList });
        currentList = null;
        listType = null;
      }

      const textContent = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
      children.push({ type: 'paragraph', children: [{ type: 'text', text: textContent }] });
    }

    if (currentList && currentList.length > 0) {
      children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList });
    }

    return {
      root: {
        type: 'root',
        children: children.length > 0 ? children : [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
        direction: 'ltr',
        format: '',
        indent: 0
      }
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    // Convert attached images to base64
    const imageData = await Promise.all(
      attachedFiles
        .filter(file => file.type.startsWith('image/'))
        .map(async (file) => {
          return new Promise<{ type: string; data: string }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              // Extract base64 data and media type
              const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                resolve({
                  type: matches[1],
                  data: matches[2]
                });
              }
            };
            reader.readAsDataURL(file);
          });
        })
    );

    // Capture snapshot before AI makes changes - this captures state BEFORE this request
    const { captureFlowSnapshot, captureTableSnapshot, captureDocumentSnapshot, getSnapshot } = useSnapshotStore.getState();
    let preChangeSnapshotId: string | undefined;
    let postChangeSnapshotId: string | undefined;
    let preSnapshotDataForMessage: Message['snapshotData'] = undefined;
    
    try {
      const messageIndex = messages.length; // Index of the new user message
      
      if (pageContext === 'flow') {
        preChangeSnapshotId = captureFlowSnapshot(contextId, messageIndex);
        // Get the snapshot data immediately for the message
        const preSnap = preChangeSnapshotId ? getSnapshot(preChangeSnapshotId) : null;
        if (preSnap?.flowData) {
          preSnapshotDataForMessage = { nodes: preSnap.flowData.nodes, edges: preSnap.flowData.edges };
        }
      } else if (pageContext === 'database' && contextData?.activeTableId) {
        preChangeSnapshotId = await captureTableSnapshot(contextData.activeTableId, messageIndex);
        const preSnap = preChangeSnapshotId ? getSnapshot(preChangeSnapshotId) : null;
        if (preSnap?.tableData) {
          preSnapshotDataForMessage = { records: preSnap.tableData.records, schema: preSnap.tableData.schema };
        }
      } else if (pageContext === 'database' && contextData?.activeDocumentId) {
        preChangeSnapshotId = await captureDocumentSnapshot(contextData.activeDocumentId, messageIndex);
        const preSnap = preChangeSnapshotId ? getSnapshot(preChangeSnapshotId) : null;
        if (preSnap?.documentData) {
          preSnapshotDataForMessage = { content: preSnap.documentData.content, title: preSnap.documentData.title };
        }
      }
    } catch (snapError) {
      console.warn('[UnifiedAISidebar] Failed to capture snapshot:', snapError);
    }

    const messageText = input.trim();

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      snapshotId: preChangeSnapshotId, // Link pre-change snapshot to user message
      snapshotData: preSnapshotDataForMessage // Include snapshot data for immediate restore
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]); // Clear attached files after sending
    setIsProcessing(true);
    setThinkingStatus('Analyzing your request...');

    let conversationDbId = currentConversationId;

    try {
      // Create or get conversation in database
      if (!conversationDbId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Only capture integrations for flow context - extract unique node types from actual nodes
        let activeNodeTypes: string[] = [];
        if (pageContext === 'flow' && nodes.length > 0) {
          activeNodeTypes = [...new Set(
            nodes
              .map(n => n.data?.type || n.data?.label || n.type)
              .filter(Boolean)
          )].slice(0, 10);
        }
        
        const { data: convData, error: convError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            page_context: dbPageContext,
            context_id: contextId,
            preview_text: userMessage.content.substring(0, 60) + (userMessage.content.length > 60 ? '...' : ''),
            active_integrations: activeNodeTypes.length > 0 ? activeNodeTypes : null
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationDbId = convData.id;
        setCurrentConversation(conversationDbId);

        // Log new chat started to activity timeline
        await logAIChatStarted(pageContext, conversationDbId, convData.preview_text);
      }

      // Save user message to database with snapshot data
      const { error: userMsgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationDbId,
          role: 'user',
          content: userMessage.content,
          snapshot_data: preSnapshotDataForMessage || null
        });

      if (userMsgError) throw userMsgError;

      // Build imports/attachments context
      const importsSummary = importedDatasets.map(ds => ({
        name: ds.name,
        fields: ds.fields,
        rowCount: ds.rows.length,
        sample: ds.rows.slice(0, 20)
      }));

      // Route to appropriate handler based on context
      let data, error;
      
      if (pageContext === 'database') {
        setThinkingStatus('Analyzing your request...');
        
        // Get current user for context
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // Check if we're on a specific table (activeTableId) - use spreadsheet-ai-actions
        if (contextData?.activeTableId) {
          console.log('[UnifiedAISidebar] Using spreadsheet-ai-actions for table:', contextData.activeTableId);
          
          // Fetch table project data
          const { data: tableProject, error: tableError } = await supabase
            .from('table_projects')
            .select('*')
            .eq('id', contextData.activeTableId)
            .single();
          
          if (tableError) {
            throw new Error('Failed to load table: ' + tableError.message);
          }
          
          const tableSchema = typeof tableProject.schema === 'string' 
            ? JSON.parse(tableProject.schema) 
            : tableProject.schema;
          const tableRecords = typeof tableProject.records === 'string'
            ? JSON.parse(tableProject.records)
            : (tableProject.records || []);
          
          setThinkingStatus('Processing your spreadsheet request...');
          
          // Check if user is confirming a pending action
          const confirmationWords = ['yes', 'confirm', 'proceed', 'ok', 'okay', 'sure', 'do it', 'go ahead', 'approved', 'accept', 'yep', 'yeah', 'yup', 'y'];
          const cancelWords = ['no', 'cancel', 'stop', 'abort', 'nevermind', "don't", 'nope', 'n'];
          const messageLower = messageText.toLowerCase().trim();
          
          // More robust matching - check if ANY confirmation word matches
          const isConfirmation = confirmationWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(messageLower);
          });
          
          // Check for cancellation
          const isCancellation = cancelWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(messageLower);
          });
          
          // Handle cancellation of pending action
          if (pendingAction && isCancellation && pendingAction.tableId === contextData.activeTableId) {
            setPendingAction(null);
            const assistantMessage: Message = {
              role: 'assistant',
              content: '✅ Action cancelled. No changes were made.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsProcessing(false);
            setThinkingStatus('');
            return;
          }
          
          if (pendingAction && isConfirmation && pendingAction.tableId === contextData.activeTableId) {
            // Execute the pending action directly
            const { tableService } = await import('@/services/tableService');
            
            try {
              switch (pendingAction.action) {
                case 'delete_records':
                  if (pendingAction.recordIds?.length) {
                    await tableService.deleteRecords(pendingAction.tableId, pendingAction.recordIds, tableRecords);
                    toast.success(`Deleted ${pendingAction.recordIds.length} records`);
                  }
                  break;
                case 'delete_record':
                  if (pendingAction.recordId) {
                    await tableService.deleteRecord(pendingAction.tableId, pendingAction.recordId, tableRecords);
                    toast.success('Record deleted');
                  }
                  break;
                case 'clear_data':
                  await tableService.updateTableProject(pendingAction.tableId, { records: [] });
                  toast.success(`Cleared all ${pendingAction.affectedCount || ''} records`);
                  break;
                case 'delete_column':
                  if (pendingAction.columnName) {
                    const currentSchema = typeof tableProject.schema === 'string' 
                      ? JSON.parse(tableProject.schema) : tableProject.schema;
                    const updatedFields = currentSchema.fields.filter(
                      (f: any) => f.name.toLowerCase() !== pendingAction.columnName?.toLowerCase()
                    );
                    await tableService.updateTableProject(pendingAction.tableId, {
                      schema: { ...currentSchema, fields: updatedFields }
                    });
                    toast.success('Column deleted');
                  }
                  break;
              }
              
              // Trigger UI refresh
              window.dispatchEvent(new CustomEvent('table-project-updated', { 
                detail: { tableId: pendingAction.tableId } 
              }));
              triggerTablesRefresh();
              
            } catch (err: any) {
              toast.error('Failed to execute action: ' + err.message);
            }
            
            setPendingAction(null);
            
            // Add confirmation response
            const assistantMessage: Message = {
              role: 'assistant',
              content: '✅ Action completed successfully!',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsProcessing(false);
            setThinkingStatus('');
            return;
          }
          
          const result = await supabase.functions.invoke('spreadsheet-ai-actions', {
            body: {
              message: messageText,
              tableProjectId: contextData.activeTableId,
              tableSchema,
              tableData: tableRecords.slice(0, 100), // Send sample for context
              allRecordIds: tableRecords.map((r: any) => r.id), // Send ALL IDs for delete operations
              tableName: tableProject.name,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
          
          console.log('[UnifiedAISidebar] spreadsheet-ai-actions response:', result);
          
          if (result.error) {
            throw new Error(result.error.message || 'Failed to process spreadsheet request');
          }
          
          const response = result.data;
          
          // Handle spreadsheet actions
          if (response?.action && response.success !== false) {
            const { action, message: responseMessage } = response;
            
            // Parse action data - handle different field names from the edge function
            // Edge function returns: record (singular), records (array), recordId, recordIds, updates, column
            const recordData = response.record || response.data;
            const recordsData = response.records || (Array.isArray(response.data) ? response.data : null);
            const recordId = response.recordId;
            const recordIds = response.recordIds;
            const updates = response.updates;
            const columnData = response.column;
            
            setThinkingStatus(`Executing ${action}...`);
            
            let actionExecuted = false;
            
            try {
              // Import tableService dynamically to avoid circular dependencies
              const { tableService } = await import('@/services/tableService');
              
              switch (action) {
                case 'add_record':
                  if (recordData && typeof recordData === 'object') {
                    // Ensure ID is set - import generateRecordId dynamically
                    const { generateRecordId } = await import('@/utils/generateRecordId');
                    const recordToAdd = { 
                      ...recordData, 
                      id: recordData.id || generateRecordId(recordData) 
                    };
                    await tableService.addRecord(contextData.activeTableId, recordToAdd, tableRecords);
                    toast.success('Record added successfully');
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] add_record missing record data:', response);
                    toast.error('Failed to add record: No data provided by AI');
                  }
                  break;
                  
                case 'add_records':
                  if (Array.isArray(recordsData) && recordsData.length > 0) {
                    // Use bulk addRecords for efficiency with 5-digit sequential IDs
                    const allRecords = [...tableRecords];
                    const recordsToAdd = recordsData.map(record => {
                      const newRecord = {
                        ...record,
                        id: record.id || generateRecordId(allRecords)
                      };
                      allRecords.push(newRecord);
                      return newRecord;
                    });
                    await tableService.addRecords(contextData.activeTableId, recordsToAdd, tableRecords);
                    toast.success(`Added ${recordsData.length} records`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] add_records missing records array:', response);
                    toast.error('Failed to add records: No records array provided by AI');
                  }
                  break;
                  
                case 'update_record':
                  if (recordId && updates) {
                    await tableService.updateRecord(contextData.activeTableId, recordId, updates, tableRecords);
                    toast.success('Record updated successfully');
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] update_record missing recordId or updates:', response);
                    toast.error('Failed to update record: Missing ID or updates');
                  }
                  break;
                  
                case 'update_records':
                  const hasRecordUpdates = response.recordUpdates && Array.isArray(response.recordUpdates) && response.recordUpdates.length > 0;
                  const hasUniformUpdates = recordIds && Array.isArray(recordIds) && recordIds.length > 0 && updates && Object.keys(updates).length > 0;

                  if (hasRecordUpdates) {
                    // Apply unique updates to each record
                    console.log('[UnifiedAISidebar] Applying per-record unique updates:', response.recordUpdates.length);
                    const updatedRecords = tableRecords.map(record => {
                      const recordUpdate = response.recordUpdates.find((ru: any) => ru.id === record.id);
                      if (recordUpdate && recordUpdate.updates) {
                        return { ...record, ...recordUpdate.updates };
                      }
                      return record;
                    });
                    
                    // Save updated records
                    const { error: saveError } = await supabase
                      .from('table_projects')
                      .update({ records: updatedRecords, updated_at: new Date().toISOString() })
                      .eq('id', contextData.activeTableId);
                    
                    if (saveError) {
                      console.error('[UnifiedAISidebar] Error saving recordUpdates:', saveError);
                      toast.error('Failed to save record updates');
                    } else {
                      toast.success(`Updated ${response.recordUpdates.length} records with unique values`);
                      actionExecuted = true;
                    }
                  } else if (hasUniformUpdates) {
                    // Original: same updates for all records
                    await tableService.updateRecords(contextData.activeTableId, recordIds, updates, tableRecords);
                    toast.success(`Updated ${recordIds.length} records`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] update_records missing data:', { recordUpdates: response.recordUpdates, recordIds, updates });
                    toast.error('Failed to update records: No update data provided');
                  }
                  break;
                  
                case 'delete_record':
                  if (response.confirmationRequired) {
                    // Store pending action for confirmation
                    setPendingAction({
                      action: 'delete_record',
                      recordId: recordId,
                      affectedCount: 1,
                      tableId: contextData.activeTableId,
                      tableRecords
                    });
                    // Don't execute, just show confirmation message
                    actionExecuted = true; // Mark as handled
                  } else if (recordId) {
                    await tableService.deleteRecord(contextData.activeTableId, recordId, tableRecords);
                    toast.success('Record deleted successfully');
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] delete_record missing recordId:', response);
                    toast.error('Failed to delete record: Missing record ID');
                  }
                  break;
                  
                case 'delete_records':
                  if (response.confirmationRequired) {
                    // Store pending action for confirmation
                    setPendingAction({
                      action: 'delete_records',
                      recordIds: recordIds,
                      affectedCount: response.affectedCount || recordIds?.length || 0,
                      tableId: contextData.activeTableId,
                      tableRecords
                    });
                    // Don't execute, just show confirmation message
                    actionExecuted = true;
                  } else if (Array.isArray(recordIds) && recordIds.length > 0) {
                    const deletedCount = await tableService.deleteRecords(contextData.activeTableId, recordIds, tableRecords);
                    toast.success(`Deleted ${deletedCount} records`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] delete_records missing recordIds:', response);
                    toast.error('Failed to delete records: Missing record IDs');
                  }
                  break;
                  
                case 'clear_data':
                  if (response.confirmationRequired) {
                    // Store pending action for confirmation
                    setPendingAction({
                      action: 'clear_data',
                      affectedCount: response.affectedCount || tableRecords.length,
                      tableId: contextData.activeTableId,
                      tableRecords
                    });
                    actionExecuted = true;
                  } else {
                    await tableService.updateTableProject(contextData.activeTableId, { records: [] });
                    toast.success(`Cleared all ${response.affectedCount || tableRecords.length} records`);
                    actionExecuted = true;
                  }
                  break;
                  
                case 'update_column':
                  if (response.columnName && response.updates) {
                    const fieldIndex = tableSchema.fields.findIndex(
                      (f: any) => f.name.toLowerCase() === response.columnName.toLowerCase()
                    );
                    if (fieldIndex !== -1) {
                      const updatedFields = [...tableSchema.fields];
                      updatedFields[fieldIndex] = { ...updatedFields[fieldIndex], ...response.updates };
                      await tableService.updateTableProject(contextData.activeTableId, {
                        schema: { ...tableSchema, fields: updatedFields }
                      });
                      toast.success('Column updated successfully');
                      actionExecuted = true;
                    } else {
                      toast.error(`Column "${response.columnName}" not found`);
                    }
                  }
                  break;
                  
                case 'delete_column':
                  if (response.confirmationRequired) {
                    setPendingAction({
                      action: 'delete_column',
                      columnName: response.columnName,
                      tableId: contextData.activeTableId,
                      tableRecords
                    });
                    actionExecuted = true;
                  } else if (response.columnName) {
                    const updatedFields = tableSchema.fields.filter(
                      (f: any) => f.name.toLowerCase() !== response.columnName.toLowerCase()
                    );
                    await tableService.updateTableProject(contextData.activeTableId, {
                      schema: { ...tableSchema, fields: updatedFields }
                    });
                    toast.success('Column deleted successfully');
                    actionExecuted = true;
                  }
                  break;
                  
                case 'add_column':
                  if (columnData && columnData.name) {
                    const newField = {
                      id: crypto.randomUUID(),
                      ...columnData
                    };
                    const updatedFields = [...tableSchema.fields, newField];
                    await tableService.updateTableProject(contextData.activeTableId, {
                      schema: { ...tableSchema, fields: updatedFields }
                    });
                    toast.success('Column added successfully');
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] add_column missing column data:', response);
                    toast.error('Failed to add column: Missing column definition');
                  }
                  break;
                
                case 'add_columns':
                  if (response.columns && Array.isArray(response.columns) && response.columns.length > 0) {
                    const newFields = response.columns.map((col: any) => ({
                      id: crypto.randomUUID(),
                      name: col.name,
                      type: col.type || 'text',
                      required: col.required || false,
                      options: col.options
                    }));
                    const updatedFields = [...tableSchema.fields, ...newFields];
                    await tableService.updateTableProject(contextData.activeTableId, {
                      schema: { ...tableSchema, fields: updatedFields }
                    });
                    toast.success(`Added ${response.columns.length} columns`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] add_columns missing columns array:', response);
                    toast.error('Failed to add columns: Missing column definitions');
                  }
                  break;
                
                case 'setup_table': {
                  // Combined operation: add columns AND records in one go
                  let columnsAdded = 0;
                  let recordsAdded = 0;
                  
                  // First add columns
                  if (response.columns && Array.isArray(response.columns) && response.columns.length > 0) {
                    const newFields = response.columns.map((col: any) => ({
                      id: crypto.randomUUID(),
                      name: col.name,
                      type: col.type || 'text',
                      required: col.required || false,
                      options: col.options
                    }));
                    const updatedFields = [...tableSchema.fields, ...newFields];
                    const updatedSchema = { ...tableSchema, fields: updatedFields };
                    
                    // Then add records with the new schema
                    let newRecords = [...tableRecords];
                    if (response.records && Array.isArray(response.records) && response.records.length > 0) {
                      const allRecords = [...tableRecords];
                      const recordsToAdd = response.records.map((record: any) => {
                        const newRecord = {
                          ...record,
                          id: record.id || generateRecordId(allRecords)
                        };
                        allRecords.push(newRecord);
                        return newRecord;
                      });
                      newRecords = [...tableRecords, ...recordsToAdd];
                      recordsAdded = recordsToAdd.length;
                    }
                    
                    // Save both schema and records together
                    await tableService.updateTableProject(contextData.activeTableId, {
                      schema: updatedSchema,
                      records: newRecords
                    });
                    
                    columnsAdded = response.columns.length;
                    toast.success(`Added ${columnsAdded} columns and ${recordsAdded} records`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] setup_table missing columns array:', response);
                    toast.error('Failed to setup table: Missing column definitions');
                  }
                  break;
                }
                
                case 'populate_column':
                  if (response.columnName) {
                    setThinkingStatus(`Populating ${response.columnName}...`);
                    
                    // Get current records
                    const { data: currentData } = await supabase
                      .from('table_projects')
                      .select('records')
                      .eq('id', contextData.activeTableId)
                      .single();
                    
                    let records = (currentData?.records as any[]) || [];
                    
                    // Apply the update to all records based on strategy
                    records = records.map((record: any, idx: number) => {
                      let value: any;
                      switch (response.strategy) {
                        case 'fixed':
                          value = response.value;
                          break;
                        case 'copy':
                          value = record[response.sourceColumn];
                          break;
                        case 'sequence':
                          value = `${response.value || ''}${idx + 1}`;
                          break;
                        case 'generate':
                        default:
                          // Check if AI pre-generated values
                          if (response.generatedValues && Array.isArray(response.generatedValues)) {
                            const genVal = response.generatedValues.find((g: any) => g.recordId === record.id);
                            value = genVal?.value ?? response.value ?? null;
                          } else {
                            // Generate based on column name and type
                            const field = tableSchema.fields.find((f: any) => f.name === response.columnName);
                            value = generateDefaultValue(field, idx, record);
                          }
                          break;
                      }
                      return { ...record, [response.columnName]: value };
                    });
                    
                    await tableService.updateTableProject(contextData.activeTableId, { records });
                    toast.success(`Populated ${records.length} records with ${response.columnName}`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] populate_column missing columnName:', response);
                    toast.error('Failed to populate column: Missing column name');
                  }
                  break;
                  
                case 'populate_columns':
                  if (response.columns && Array.isArray(response.columns) && response.columns.length > 0) {
                    setThinkingStatus(`Populating ${response.columns.length} columns...`);
                    
                    // Get current records
                    const { data: currentBatchData } = await supabase
                      .from('table_projects')
                      .select('records')
                      .eq('id', contextData.activeTableId)
                      .single();
                    
                    let batchRecords = (currentBatchData?.records as any[]) || [];
                    
                    // Populate each column
                    for (const colSpec of response.columns) {
                      const columnName = colSpec.columnName;
                      const strategy = colSpec.strategy || 'generate';
                      
                      setThinkingStatus(`Populating ${columnName}...`);
                      
                      batchRecords = batchRecords.map((record: any, idx: number) => {
                        let value: any;
                        switch (strategy) {
                          case 'fixed':
                            value = colSpec.value;
                            break;
                          case 'copy':
                            value = record[colSpec.sourceColumn];
                            break;
                          case 'sequence':
                            value = `${colSpec.value || ''}${idx + 1}`;
                            break;
                          case 'generate':
                          default:
                            // Generate based on column name and type
                            const field = tableSchema.fields.find((f: any) => f.name === columnName);
                            value = generateDefaultValue(field, idx, record);
                            break;
                        }
                        return { ...record, [columnName]: value };
                      });
                    }
                    
                    await tableService.updateTableProject(contextData.activeTableId, { records: batchRecords });
                    toast.success(`Populated ${response.columns.length} columns across ${batchRecords.length} records`);
                    actionExecuted = true;
                  } else {
                    console.error('[UnifiedAISidebar] populate_columns missing columns array:', response);
                    toast.error('Failed to populate columns: Missing column specifications');
                  }
                  break;
                  
                case 'query':
                case 'analysis':
                  // No action needed, just show the response
                  actionExecuted = true;
                  break;
                  
                default:
                  console.warn('[UnifiedAISidebar] Unknown action:', action);
              }
              
              // Only trigger refresh if an action was actually executed
              if (actionExecuted) {
                // Trigger UI refresh by dispatching custom event
                window.dispatchEvent(new CustomEvent('table-project-updated', { 
                  detail: { tableId: contextData.activeTableId } 
                }));
                
                // Trigger sidebar refresh
                triggerTablesRefresh();
              }
              
            } catch (actionError: any) {
              console.error('[UnifiedAISidebar] Error executing action:', actionError);
              toast.error('Failed to execute action: ' + actionError.message);
            }
            
            data = {
              message: responseMessage || (actionExecuted ? `✅ Action completed successfully!` : 'I understood your request but couldn\'t execute it. Please try again.'),
              model: selectedModel
            };
            error = null;
          } else {
            // No action, just analysis/query response
            data = {
              message: response?.message || response?.analysis || 'I analyzed your data but couldn\'t determine a specific action.',
              model: selectedModel
            };
            error = null;
          }
          
        } else {
          // Database-level context (not on a specific table) - use database-ai-actions
          // Try to get existing tables and documents for context
          let existingTables: any[] = [];
          let existingDocuments: any[] = [];
          
          try {
            const [tablesRes, docsRes] = await Promise.all([
              supabase.from('table_projects').select('id, name, schema').eq('database_id', contextId),
              supabase.from('documents').select('id, title').eq('database_id', contextId).eq('archived', false)
            ]);
            existingTables = (tablesRes.data || []).map(t => ({
              id: t.id,
              name: t.name,
              fieldCount: (t.schema as any)?.fields?.length || 0,
              schema: t.schema // Include full schema for record generation
            }));
            existingDocuments = (docsRes.data || []).map(d => ({
              id: d.id,
              title: d.title
            }));
          } catch (e) {
            console.warn('Could not fetch context:', e);
          }

          // Use database-ai-actions for AI-powered document/table creation
          const result = await supabase.functions.invoke('database-ai-actions', {
            body: {
              prompt: input.trim(),
              databaseId: contextId,
              userId: currentUser?.id,
              existingTables,
              existingDocuments
            }
          });

          // Handle AI action response - PROGRESSIVE GENERATION like flow builder
          if (result.data?.action === 'create_document' && result.data.document) {
          let sections = result.data.document.sections || [];
          setThinkingStatus(`Creating document: ${result.data.document.title}...`);
          
          // Generate images/videos for sections that have prompts
          if (sectionsNeedMediaGeneration(sections)) {
            setThinkingStatus('Generating media content...');
            sections = await generateMediaForSections(sections, {
              databaseId: contextId,
              userId: currentUser?.id,
              onProgress: setThinkingStatus
            });
          }
          
          // Step 1: Create empty document first
          const emptyContent = {
            root: {
              type: 'root',
              children: [],
              direction: 'ltr',
              format: '',
              indent: 0
            }
          };

          const { data: doc, error: createError } = await supabase
            .from('documents')
            .insert({
              database_id: contextId,
              title: result.data.document.title,
              content: emptyContent,
              created_by: currentUser?.id
            })
            .select()
            .single();
          
          if (createError) throw createError;
          
          setThinkingStatus(`Writing ${sections.length} sections...`);
          
          // Step 2: Progressively add each section (like flow adds nodes)
          let currentContent = emptyContent;
          
          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            setThinkingStatus(`Writing section ${i + 1}/${sections.length}: ${section.type}...`);
            
            // Convert section to Lexical node using shared utility
            const singleSectionResult = convertSectionsToLexical([section]);
            const lexicalNode = singleSectionResult.root.children[0];
            
            // Append to content
            currentContent = {
              ...currentContent,
              root: {
                ...currentContent.root,
                children: [...currentContent.root.children, lexicalNode]
              }
            };
            
            // Update document with new content
            await supabase
              .from('documents')
              .update({ content: currentContent })
              .eq('id', doc.id);
            
            // Small delay for visual progressive effect
            if (i < sections.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          // Trigger sidebar refresh
          triggerDocumentsRefresh();
          
          data = {
            message: `✅ Document "${doc.title}" has been created with ${sections.length} sections!`,
            model: selectedModel
          };
          error = null;
          
        } else if (result.data?.action === 'create_table' && result.data.table) {
          const fields = result.data.table.fields || [];
          setThinkingStatus(`Creating table: ${result.data.table.name}...`);
          
          // Step 1: Create empty table first
          const tableSchema = {
            id: crypto.randomUUID(),
            name: result.data.table.name,
            fields: []
          };

          const { data: table, error: createError } = await supabase
            .from('table_projects')
            .insert({
              name: result.data.table.name,
              description: result.data.table.description || '',
              user_id: currentUser?.id,
              database_id: contextId,
              schema: tableSchema,
              records: []
            })
            .select()
            .single();
          
          if (createError) throw createError;
          
          // Step 2: Progressively add each field (like flow adds nodes)
          let currentSchema = tableSchema;
          
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            setThinkingStatus(`Adding field ${i + 1}/${fields.length}: ${field.name}...`);
            
            // Map field type
            const typeMap: Record<string, string> = {
              'string': 'text', 'text': 'text', 'number': 'number', 'integer': 'number',
              'float': 'number', 'date': 'date', 'datetime': 'timestamp', 'boolean': 'boolean',
              'bool': 'boolean', 'select': 'select', 'dropdown': 'select', 'multiselect': 'multiselect',
              'email': 'email', 'textarea': 'textarea', 'longtext': 'textarea', 'image': 'image',
              'file': 'pdf', 'json': 'json', 'password': 'password', 'timestamp': 'timestamp'
            };
            
            const newField = {
              id: crypto.randomUUID(),
              name: field.name,
              type: typeMap[field.type?.toLowerCase()] || 'text',
              required: field.required || false,
              options: field.options,
              description: field.description
            };
            
            // Add field to schema
            currentSchema = {
              ...currentSchema,
              fields: [...currentSchema.fields, newField]
            };
            
            // Update table with new schema
            await supabase
              .from('table_projects')
              .update({ schema: currentSchema })
              .eq('id', table.id);
            
            // Small delay for visual progressive effect
            if (i < fields.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 150));
            }
          }
          
          // Step 3: Handle records - prioritize user-provided data over generated samples
          const sampleRecords = result.data.table.sampleRecords || [];
          const recordCount = result.data.table.recordCount || 0;
          let finalRecords: any[] = [];
          let recordsSource: 'user' | 'generated' | 'none' = 'none';
          
          if (sampleRecords.length > 0) {
            // PRIORITY: Use user-provided data
            setThinkingStatus(`Adding ${sampleRecords.length} records from your data...`);
            
            for (let i = 0; i < sampleRecords.length; i++) {
              setThinkingStatus(`Adding record ${i + 1}/${sampleRecords.length}...`);
              
              // Preserve user-provided ID if present, otherwise generate 5-digit ID
              const userRecord = sampleRecords[i];
              // Destructure to separate id from rest to prevent overwriting
              const { id: userProvidedId, ...userRecordWithoutId } = userRecord;
              
              const record: Record<string, any> = {
                ...userRecordWithoutId,  // Spread user data FIRST (without id)
                id: userProvidedId || generateRecordId(finalRecords),  // Set id LAST to guarantee uniqueness
                createdAt: new Date().toISOString()
              };
              
              finalRecords.push(record);
            }
            recordsSource = 'user';
            
          } else if (recordCount > 0) {
            // FALLBACK: Generate sample records only if user asked for them without providing data
            setThinkingStatus(`Generating ${recordCount} sample records...`);
            
            for (let i = 0; i < recordCount; i++) {
              setThinkingStatus(`Generating record ${i + 1}/${recordCount}...`);
              
              const record: Record<string, any> = {
                id: generateRecordId(finalRecords),
                createdAt: new Date().toISOString()
              };
              
              // Generate realistic sample data based on field types and names
              // Skip id and createdAt as they are already set above
              currentSchema.fields.forEach((field: any) => {
                if (field.name === 'id' || field.name === 'createdAt') return;
                record[field.name] = generateFakeValue(field, i);
              });
              
              finalRecords.push(record);
            }
            recordsSource = 'generated';
          }
          
          // Save records if any
          if (finalRecords.length > 0) {
            await supabase
              .from('table_projects')
              .update({ records: finalRecords })
              .eq('id', table.id);
          }
          
          // Trigger sidebar refresh
          triggerTablesRefresh();
          
          const successMessage = recordsSource === 'user'
            ? `✅ Table "${table.name}" has been created with ${fields.length} fields and ${finalRecords.length} records from your data!`
            : recordsSource === 'generated'
              ? `✅ Table "${table.name}" has been created with ${fields.length} fields and ${finalRecords.length} sample records!`
              : `✅ Table "${table.name}" has been created with ${fields.length} fields!`;
          
          data = {
            message: successMessage,
            model: selectedModel
          };
          error = null;
          
        } else if (result.data?.action === 'add_records' && result.data.records) {
          // Handle record generation
          const { tableId, tableName, data: recordsToAdd } = result.data.records;
          
          if (!tableId || !recordsToAdd || recordsToAdd.length === 0) {
            data = {
              message: 'Could not generate records. Please specify a valid table name.',
              model: selectedModel
            };
            error = null;
          } else {
            setThinkingStatus(`Adding ${recordsToAdd.length} records to ${tableName}...`);
            
            // Get current table data
            const { data: tableData, error: fetchError } = await supabase
              .from('table_projects')
              .select('records, schema')
              .eq('id', tableId)
              .single();
            
            if (fetchError) throw fetchError;
            
            const existingRecordsArr = (tableData?.records as any[]) || [];
            const schemaFields = (tableData?.schema as any)?.fields || [];
            
            // Progressively add each record
            for (let i = 0; i < recordsToAdd.length; i++) {
              const record = recordsToAdd[i];
              setThinkingStatus(`Adding record ${i + 1}/${recordsToAdd.length}...`);
              
              // Preserve user-provided ID if present, otherwise generate 5-digit ID
              const newRecord: Record<string, any> = {
                id: record.id || generateRecordId(existingRecordsArr),
                createdAt: new Date().toISOString()
              };
              
              // Map record data to schema fields
              schemaFields.forEach((field: any) => {
                if (record[field.name] !== undefined) {
                  newRecord[field.name] = record[field.name];
                }
              });
              
              existingRecordsArr.push(newRecord);
              
              // Update table with new records
              await supabase
                .from('table_projects')
                .update({ records: existingRecordsArr })
                .eq('id', tableId);
              
              // Small delay for visual effect
              if (i < recordsToAdd.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 80));
              }
            }
            
            // Trigger refresh
            triggerTablesRefresh();
            
            data = {
              message: `✅ Added ${recordsToAdd.length} records to "${tableName}"!`,
              model: selectedModel
            };
            error = null;
          }
          
          } else {
            // Regular query response - fall back to data-chat for data queries
            setThinkingStatus('Querying your database...');
            const chatResult = await supabase.functions.invoke('data-chat', {
              body: {
                question: input.trim(),
                tableProjectId: contextId,
                sampleLimit: 50,
                model: selectedModel
              }
            });
            data = chatResult.data;
            error = chatResult.error;
          }
        } // End of else (database-level context)
      } else {
        if (pageContext === 'flow') {
          setThinkingStatus('Understanding your flow requirements...');
        } else if (pageContext === 'app') {
          setThinkingStatus('Generating app components...');
        }
        
        // Get ALL available node types from registry for AI context (including those requiring installation)
        // This allows AI to suggest any integration, and we'll auto-install as needed
        const allNodeTypesForAI = nodeRegistry.getAllNodeTypesForAI();
        // Also get currently installed types for context
        let userInstalledTypes: string[] = [];
        if (user) {
          try {
            userInstalledTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
          } catch (err) {
            console.warn('Could not fetch installed node types for AI context:', err);
          }
        }
        
        // Enhance node info with installation status
        const availableNodeTypes = allNodeTypesForAI.map(node => ({
          ...node,
          isInstalled: !node.requiresInstallation || userInstalledTypes.includes(node.type)
        }));

        // Use ai-assistant for other contexts
        const result = await supabase.functions.invoke('ai-assistant', {
          body: {
            prompt: input.trim(),
            model: selectedModel,
            images: imageData, // Include base64 image data
            context: {
              pageType: pageContext,
              contextId,
              contextData,
              previousMessages: messages,
              currentNodes: pageContext === 'flow' ? nodes : undefined,
              imports: importsSummary,
              attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
              availableNodeTypes: pageContext === 'flow' ? availableNodeTypes : undefined
            }
          }
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Check if AI generated nodes
      if (pageContext === 'flow' && data.nodes && Array.isArray(data.nodes)) {
        // Ensure conditional flows always include both true and false path nodes
        try {
          const nodesArray = data.nodes as any[];
          const enhancedNodes: any[] = [];

          for (let i = 0; i < nodesArray.length; i++) {
            const node = nodesArray[i];
            enhancedNodes.push(node);

            // When we see a condition node, inspect following nodes for pathType-based connections
            if (node.type === 'condition') {
              console.log('🔍 Condition node detected:', node.label);
              
              const pathNodes = { true: null as any, false: null as any };

              // Look at ALL subsequent nodes with more flexible detection
              for (let j = i + 1; j < nodesArray.length; j++) {
                const candidate = nodesArray[j];
                
                // More flexible detection - check pathType OR position after condition
                const hasPathType = candidate.pathType && 
                                   (candidate.pathType === 'true' || candidate.pathType === 'false');
                const connectsToPrevious = candidate.connectTo === 'previous';
                
                // If it's right after a condition and has no other condition between, assume it's a path
                const isLikelyPathNode = j === i + 1 || j === i + 2;
                
                if (hasPathType && (connectsToPrevious || isLikelyPathNode)) {
                  if (!pathNodes[candidate.pathType as 'true' | 'false']) {
                    pathNodes[candidate.pathType as 'true' | 'false'] = candidate;
                    console.log(`✓ Found ${candidate.pathType} path node:`, candidate.label);
                  }
                } else if (candidate.type === 'condition') {
                  break;  // Stop at next condition
                }
              }

              console.log('Path nodes found:', { true: !!pathNodes.true, false: !!pathNodes.false });

              // Auto-generate missing path with better defaults
              const trueNode = pathNodes.true;
              const falseNode = pathNodes.false;

              if (trueNode && !falseNode) {
                console.warn('⚠️ Missing FALSE path - auto-generating...');
                enhancedNodes.push({
                  type: trueNode.type || 'http-request',
                  label: `False Branch Action`,
                  inputs: { ...trueNode.inputs },
                  connectTo: 'previous',
                  pathType: 'false',
                });
              } else if (falseNode && !trueNode) {
                console.warn('⚠️ Missing TRUE path - auto-generating...');
                enhancedNodes.push({
                  type: falseNode.type || 'http-request',
                  label: `True Branch Action`,
                  inputs: { ...falseNode.inputs },
                  connectTo: 'previous',
                  pathType: 'true',
                });
              } else if (!trueNode && !falseNode) {
                console.error('❌ NO PATHS FOUND - creating default branches');
                // Create both default branches
                enhancedNodes.push(
                  {
                    type: 'http-request',
                    label: 'True Branch Action',
                    inputs: { method: 'POST' },
                    connectTo: 'previous',
                    pathType: 'true',
                  },
                  {
                    type: 'http-request',
                    label: 'False Branch Action',
                    inputs: { method: 'GET' },
                    connectTo: 'previous',
                    pathType: 'false',
                  }
                );
              }
            }
          }

          data.nodes = enhancedNodes;
        } catch (e) {
          console.warn('Failed to auto-complete condition branches from AI response:', e);
        }

        // Extract node types from AI response
        const requestedNodeTypes = data.nodes.map((n: any) => n.type).filter(Boolean);
        
        // Get user's installed node types
        let installedNodeTypes: string[] = [];
        if (user) {
          try {
            installedNodeTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
          } catch (err) {
            console.warn('Could not fetch installed node types:', err);
          }
        }
        
        // Detect missing integrations that need to be installed
        const missingIntegrations = detectMissingIntegrations(requestedNodeTypes, installedNodeTypes);
        
        // Auto-install missing integrations
        if (missingIntegrations.length > 0 && user) {
          const integrationNames = missingIntegrations.map(getNodeDisplayName).join(', ');
          setThinkingStatus(`Installing required integrations: ${integrationNames}...`);
          
          const { installed, failed } = await integrationsService.batchInstallIntegrations(
            user.id,
            missingIntegrations
          );
          
          if (installed.length > 0) {
            // Refresh the node registry with newly installed nodes
            const newInstalledTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
            nodeRegistry.registerConditionally(newInstalledTypes);
            installedNodeTypes = newInstalledTypes;
            
            // Update global cache so FlowBuilder can pick it up
            if (typeof window !== 'undefined') {
              window.flowUserNodeInstallations = {
                ...window.flowUserNodeInstallations,
                installedNodeTypes: newInstalledTypes
              };
            }
            
            // Dispatch event for FlowBuilder to refresh registry
            window.dispatchEvent(new CustomEvent('nodeInstallationsUpdated', {
              detail: { installedNodeTypes: newInstalledTypes }
            }));
            
            toast.success(`Installed ${installed.length} integration${installed.length > 1 ? 's' : ''}`);
          }
          
          if (failed.length > 0) {
            console.warn('Some integrations failed to install:', failed);
            toast.warning(`Could not install: ${failed.map(getNodeDisplayName).join(', ')}`);
          }
        }

        setThinkingStatus(`Creating ${data.nodes.length} node${data.nodes.length > 1 ? 's' : ''} for your flow...`);
        
        // Add generated nodes to the flow with connections
        const { nodes: currentNodes, edges: currentEdges, setEdges } = useFlowStore.getState();
        let nodesAdded = 0;
        const newNodeIds: string[] = [];
        
        // Find the last existing node to connect to
        const lastExistingNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
        
        for (const nodeData of data.nodes) {
          try {
            // Validate node has required type
            if (!nodeData.type) {
              console.warn('Node missing type, skipping:', nodeData);
              continue;
            }

            // Check if plugin is available in registry
            let plugin = nodeRegistry.getPlugin(nodeData.type);
            
            // Install-on-demand: If plugin is missing, try to install it
            if (!plugin && user) {
              console.log(`[UnifiedAISidebar] Plugin not found for ${nodeData.type}, attempting install-on-demand...`);
              
              // Check if this node type exists in the database
              const exists = await integrationsService.nodeTypeExistsInDatabase(nodeData.type);
              
              if (exists) {
                setThinkingStatus(`Installing ${nodeData.type}...`);
                
                try {
                  await integrationsService.installIntegration(user.id, nodeData.type, {});
                  
                  // Refresh registry after installation
                  const newInstalledTypes = await integrationsService.getUserInstalledNodeTypes(user.id);
                  nodeRegistry.registerConditionally(newInstalledTypes);
                  installedNodeTypes = newInstalledTypes;
                  
                  // Update global cache
                  if (typeof window !== 'undefined') {
                    window.flowUserNodeInstallations = {
                      ...window.flowUserNodeInstallations,
                      installedNodeTypes: newInstalledTypes
                    };
                  }
                  
                  // Dispatch event for FlowBuilder
                  window.dispatchEvent(new CustomEvent('nodeInstallationsUpdated', {
                    detail: { installedNodeTypes: newInstalledTypes }
                  }));
                  
                  // Try to get plugin again after installation
                  plugin = nodeRegistry.getPlugin(nodeData.type);
                  
                  if (plugin) {
                    console.log(`[UnifiedAISidebar] Successfully installed ${nodeData.type} on-demand`);
                    toast.success(`Installed ${getNodeDisplayName(nodeData.type)}`);
                  }
                } catch (installError) {
                  console.error(`[UnifiedAISidebar] Failed to install ${nodeData.type} on-demand:`, installError);
                }
              } else {
                console.warn(`[UnifiedAISidebar] Node type ${nodeData.type} not found in database`);
              }
            }
            
            // Final check: skip if still no plugin available
            if (!plugin) {
              console.warn('Node type not available after install attempt:', nodeData.type);
              toast.warning(`Could not add node: ${getNodeDisplayName(nodeData.type)} - not available`);
              continue;
            }

            // Create node with proper structure
            const newNode = {
              id: `${nodeData.type}-${Date.now()}-${nodesAdded}`,
              type: nodeData.type === 'condition' ? 'conditional' : 'custom',
              position: { x: 0, y: 0 }, // Will be auto-positioned by store
              data: {
                type: nodeData.type,
                label: nodeData.label || nodeData.type,
                inputs: nodeData.inputs || {},
                isFirstNode: currentNodes.length === 0 && nodesAdded === 0
              }
            };

            addNode(newNode);
            newNodeIds.push(newNode.id);
            nodesAdded++;
          } catch (err) {
            console.error('Error adding node:', err);
          }
        }

        // Create edges to connect the new nodes
        if (newNodeIds.length > 0) {
          setThinkingStatus('Connecting nodes in your flow...');
          
          const newEdges: any[] = [];
          
          // Build a map of nodes for quick lookup
          const nodeMap = new Map();
          data.nodes.forEach((node: any, index: number) => {
            nodeMap.set(newNodeIds[index], {
              nodeData: node,
              nodeId: newNodeIds[index]
            });
          });
          
          // Connect first new node to the last existing node (if exists)
          if (lastExistingNode && newNodeIds.length > 0) {
            const firstNode = data.nodes[0];
            
            // Check if first node should connect to a specific path
            if (firstNode.connectTo === 'parent' && firstNode.pathType) {
              newEdges.push({
                id: `${lastExistingNode.id}-${newNodeIds[0]}`,
                source: lastExistingNode.id,
                target: newNodeIds[0],
                sourceHandle: firstNode.pathType, // 'true' or 'false'
                type: 'straight',
                animated: false,
              });
            } else {
              newEdges.push({
                id: `${lastExistingNode.id}-${newNodeIds[0]}`,
                source: lastExistingNode.id,
                target: newNodeIds[0],
                type: 'straight',
                animated: false,
              });
            }
          }
          
          // Debug: Log AI-generated nodes
          console.log('AI nodes:', data.nodes);
          
          // Connect all new nodes based on their relationship
          for (let i = 0; i < data.nodes.length; i++) {
            const currentNodeData = data.nodes[i];
            const currentNodeId = newNodeIds[i];
            
            // If this is a condition node with explicit connections
            if (currentNodeData.type === 'condition' && currentNodeData.connections) {
              // Connect to true path nodes
              if (currentNodeData.connections.true) {
                currentNodeData.connections.true.forEach((targetId: string) => {
                  const targetIndex = data.nodes.findIndex((n: any) => n.id === targetId);
                  if (targetIndex !== -1) {
                    newEdges.push({
                      id: `${currentNodeId}-${newNodeIds[targetIndex]}`,
                      source: currentNodeId,
                      target: newNodeIds[targetIndex],
                      sourceHandle: 'true',
                      type: 'straight',
                      animated: false,
                    });
                  }
                });
              }
              
              // Connect to false path nodes
              if (currentNodeData.connections.false) {
                currentNodeData.connections.false.forEach((targetId: string) => {
                  const targetIndex = data.nodes.findIndex((n: any) => n.id === targetId);
                  if (targetIndex !== -1) {
                    newEdges.push({
                      id: `${currentNodeId}-${newNodeIds[targetIndex]}`,
                      source: currentNodeId,
                      target: newNodeIds[targetIndex],
                      sourceHandle: 'false',
                      type: 'straight',
                      animated: false,
                    });
                  }
                });
              }
              
              // Create incoming edge from previous node to this condition node
              if (i > 0) {
                const previousNodeId = newNodeIds[i - 1];
                newEdges.push({
                  id: `${previousNodeId}-${currentNodeId}`,
                  source: previousNodeId,
                  target: currentNodeId,
                  type: 'straight',
                  animated: false,
                });
                console.log('Created incoming edge to condition node from:', previousNodeId);
              }
              
              // Log condition edges for debugging
              console.log('Edges created for condition', {
                nodeIndex: i,
                nodeId: currentNodeId,
                edges: newEdges.filter(e => e.source === currentNodeId),
              });
            }
            // If node specifies connectTo parent with pathType
            else if (currentNodeData.connectTo === 'previous' && i > 0) {
              // If this node is a branch (has pathType), attach it to the nearest previous condition node
              if (currentNodeData.pathType === 'true' || currentNodeData.pathType === 'false') {
                // Find the closest condition node before this index
                let conditionIndex = -1;
                for (let k = i - 1; k >= 0; k--) {
                  if (data.nodes[k].type === 'condition') {
                    conditionIndex = k;
                    break;
                  }
                }

                if (conditionIndex !== -1) {
                  const conditionNodeId = newNodeIds[conditionIndex];
                  newEdges.push({
                    id: `${conditionNodeId}-${currentNodeId}`,
                    source: conditionNodeId,
                    target: currentNodeId,
                    sourceHandle: currentNodeData.pathType, // 'true' or 'false'
                    type: 'straight',
                    animated: false,
                  });
                  console.log(`Branch node connected: ${currentNodeData.pathType} path from condition at index ${conditionIndex}`);
                } else {
                  // Fallback: no condition found, keep previous sequential behavior
                  const previousNodeId = newNodeIds[i - 1];
                  newEdges.push({
                    id: `${previousNodeId}-${currentNodeId}`,
                    source: previousNodeId,
                    target: currentNodeId,
                    type: 'straight',
                    animated: false,
                  });
                }
              } else {
                // Regular sequential connection when no branching is involved
                const previousNodeId = newNodeIds[i - 1];
                newEdges.push({
                  id: `${previousNodeId}-${currentNodeId}`,
                  source: previousNodeId,
                  target: currentNodeId,
                  type: 'straight',
                  animated: false,
                });
              }
            }
            // Default sequential connection (fallback)
            else if (i > 0 && !currentNodeData.connectTo) {
              // Treat nodes with pathType as branch nodes even without explicit connectTo
              if (currentNodeData.pathType === 'true' || currentNodeData.pathType === 'false') {
                let conditionIndex = -1;
                for (let k = i - 1; k >= 0; k--) {
                  if (data.nodes[k].type === 'condition') {
                    conditionIndex = k;
                    break;
                  }
                }
                if (conditionIndex !== -1) {
                  const conditionNodeId = newNodeIds[conditionIndex];
                  newEdges.push({
                    id: `${conditionNodeId}-${currentNodeId}`,
                    source: conditionNodeId,
                    target: currentNodeId,
                    sourceHandle: currentNodeData.pathType,
                    type: 'straight',
                    animated: false,
                  });
                  console.log(`Branch node (no connectTo) connected: ${currentNodeData.pathType} path from condition at index ${conditionIndex}`);
                } else {
                  // Fallback to sequential if no condition found
                  newEdges.push({
                    id: `${newNodeIds[i - 1]}-${currentNodeId}`,
                    source: newNodeIds[i - 1],
                    target: currentNodeId,
                    type: 'straight',
                    animated: false,
                  });
                }
              } else {
                // Regular sequential connection
                newEdges.push({
                  id: `${newNodeIds[i - 1]}-${currentNodeId}`,
                  source: newNodeIds[i - 1],
                  target: currentNodeId,
                  type: 'straight',
                  animated: false,
                });
              }
            }
          }
          
          // Add all new edges at once
          if (newEdges.length > 0) {
            setEdges((prevEdges) => [...prevEdges, ...newEdges]);
          }
        }

        if (nodesAdded > 0) {
          toast.success(`Added ${nodesAdded} connected node${nodesAdded > 1 ? 's' : ''} to your flow`);
          
          // Capture snapshot AFTER AI made changes - this is what restore will go back to
          try {
            const { captureFlowSnapshot } = useSnapshotStore.getState();
            postChangeSnapshotId = captureFlowSnapshot(contextId, messages.length + 1);
            console.log('[UnifiedAISidebar] Captured post-change snapshot:', postChangeSnapshotId);
          } catch (err) {
            console.warn('[UnifiedAISidebar] Failed to capture post-change snapshot:', err);
          }
        }
      }

      // Utility to strip JSON and code blocks from content
      const stripJsonFromContent = (content: string): string => {
        if (!content || typeof content !== 'string') return content;
        
        let cleaned = content;
        
        // Remove fenced code blocks ```...```
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '').trim();
        
        // Remove trailing JSON blocks that contain "nodes" or "success"
        const jsonBlockRegex = /\{[\s\S]*(?:"nodes"|"success")[\s\S]*\}$/;
        const match = cleaned.match(jsonBlockRegex);
        if (match && match.index !== undefined) {
          cleaned = cleaned.slice(0, match.index).trim();
        }
        
        return cleaned;
      };

      // Extract message content based on response structure
      setThinkingStatus('Preparing response...');
      
      let messageContent: string;
      if (pageContext === 'database') {
        // data-chat returns { message, chartConfig, usedContext }
        messageContent = data?.message || 'I apologize, but I encountered an issue processing your request.';
      } else {
        // ai-assistant returns { message } or { success, message }
        let rawMessage = data?.message || '';
        
        // Check if message is actually JSON string - if so, extract the real message
        try {
          if (rawMessage.startsWith('{') || rawMessage.startsWith('[')) {
            const parsed = JSON.parse(rawMessage);
            rawMessage = parsed.message || '';
          }
        } catch {
          // Not JSON, use as-is
        }
        
        // Strip any JSON or code blocks from the message
        rawMessage = stripJsonFromContent(rawMessage);
        
        // If we created nodes but have no message, provide a friendly default
        if (pageContext === 'flow' && data.nodes && Array.isArray(data.nodes) && !rawMessage) {
          rawMessage = `I've created ${data.nodes.length} node${data.nodes.length > 1 ? 's' : ''} for your flow. You can see them connected in the canvas.`;
        }
        
        messageContent = rawMessage || 'I apologize, but I encountered an issue processing your request.';
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: messageContent,
        timestamp: new Date(),
        model: data.model || 'AI Model',
        nodes: pageContext === 'flow' && data.nodes ? data.nodes : undefined,
        snapshotId: postChangeSnapshotId || preChangeSnapshotId // Use post-change snapshot, fallback to pre-change
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);

      // Save AI message to database with snapshot data and model info
      const postSnapshotData = postChangeSnapshotId ? useSnapshotStore.getState().getSnapshot(postChangeSnapshotId) : null;
      const baseSnapshotPayload = postSnapshotData?.flowData 
        ? { nodes: postSnapshotData.flowData.nodes, edges: postSnapshotData.flowData.edges }
        : postSnapshotData?.tableData 
          ? { records: postSnapshotData.tableData.records, schema: postSnapshotData.tableData.schema }
          : postSnapshotData?.documentData
            ? { content: postSnapshotData.documentData.content, title: postSnapshotData.documentData.title }
            : {};
      
      // Always include model in snapshot_data for persistence
      const aiSnapshotPayload = { ...baseSnapshotPayload, model: aiMessage.model };

      // Update aiMessage with snapshot data for immediate restore
      aiMessage.snapshotData = aiSnapshotPayload || undefined;
      
      // Update the messages array with the snapshot data
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      const { error: aiMsgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationDbId,
          role: 'assistant',
          content: aiMessage.content,
          snapshot_data: aiSnapshotPayload
        });

      if (aiMsgError) throw aiMsgError;

      // Update local conversation store
      if (currentConversationId) {
        updateConversation(currentConversationId, finalMessages);
      } else {
        const newConversation: Conversation = {
          id: conversationDbId,
          pageContext,
          contextId,
          timestamp: new Date(),
          messages: finalMessages,
          preview: userMessage.content.substring(0, 60) + (userMessage.content.length > 60 ? '...' : '')
        };
        addConversation(newConversation);
      }

      // Log messages to activity timeline
      await logAIChatMessage(pageContext, conversationDbId, userMessage.content, 'user');
      await logAIChatMessage(pageContext, conversationDbId, aiMessage.content, 'assistant');
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsProcessing(false);
      setThinkingStatus('');
    }
  };

  const handleSelectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setMessages(conv.messages);
      setCurrentConversation(id);
      setActiveTab('chat');
      
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversation(null);
    setAttachedFiles([]);
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Import actions
  const handleSpreadsheetChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const { rows, fields } = await parseSpreadsheetFile(files[0]);
      setImportedDatasets(prev => [...prev, { name: files[0].name, fields, rows, source: 'spreadsheet' }]);
      toast.success(`Imported ${rows.length} rows from ${files[0].name}`);
    } catch (err) {
      console.error('Spreadsheet import error:', err);
      toast.error('Failed to import spreadsheet');
    } finally {
      e.currentTarget.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
      toast.success(`Attached ${files.length} image${files.length > 1 ? 's' : ''}`);
    }
    e.currentTarget.value = '';
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
      toast.success(`Attached ${files.length} document${files.length > 1 ? 's' : ''}`);
    }
    e.currentTarget.value = '';
  };

  const handleGoogleSheetsImport = async () => {
    const url = window.prompt('Paste a public Google Sheets URL');
    if (!url) return;
    const exportUrl = toGoogleSheetCSVUrl(url);
    if (!exportUrl) {
      toast.error('Invalid Google Sheets URL');
      return;
    }
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Failed to fetch sheet');
      const csv = await res.text();
      const { rows, fields } = parseCSVText(csv);
      setImportedDatasets(prev => [...prev, { name: 'Google Sheet', fields, rows, source: 'google-sheets' }]);
      toast.success(`Imported ${rows.length} rows from Google Sheets`);
    } catch (err) {
      console.error('Google Sheets import error:', err);
      toast.error('Failed to import Google Sheet');
    }
  };

  const getContextIcon = () => {
    switch (pageContext) {
      case 'database':
        return Database;
      case 'flow':
        return Workflow;
      case 'app':
        return AppWindow;
      default:
        return FileText;
    }
  };

  const getContextLabel = () => {
    switch (pageContext) {
      case 'database':
        return 'Database';
      case 'flow':
        return 'Logic Flow';
      case 'app':
        return 'App Builder';
      default:
        return 'Document';
    }
  };

  const ContextIcon = getContextIcon();

  return (
    <div
      className={cn(
        'fixed left-[40px] top-[44px] bottom-0 w-[320px] bg-zinc-100 dark:bg-zinc-900 transition-transform duration-300 z-20',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ContextIcon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-semibold text-xs truncate">{getContextLabel()}</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                AI Assistant
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'wall' | 'timeline')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className={cn("grid w-full mx-3 mt-2 p-1 h-8", pageContext === 'app' ? "grid-cols-2" : "grid-cols-1")}>
            <TabsTrigger 
              value="chat" 
              className="text-xs h-6 data-[state=active]:shadow-none data-[state=active]:border-0"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI Chat
            </TabsTrigger>
            {pageContext === 'app' && (
              <TabsTrigger 
                value="wall" 
                className="text-xs h-6 data-[state=active]:shadow-none data-[state=active]:border-0"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                AI Wall
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chat" className="data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:overflow-hidden mt-0">
            {/* Build/Chat tabs removed - AI sidebar is build-only now */}
            {/* Messages */}
            <ScrollArea className="flex-1 px-2">
              <div className="flex flex-col gap-4 py-4">
                {/* Build mode: show conversation thread with inline progress */}
                {isAppBuildMode ? (
                  <>
                    {/* Empty state with templates */}
                    {messages.length === 0 && !isBuilding && buildSteps.length === 0 && (
                      <div className="py-4">
                        <div className="text-center mb-6">
                          <Wand2 className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                          <p className="text-sm font-medium">AI App Builder</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Describe what you want to build
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Quick templates:</p>
                          <div className="grid gap-2">
                            {buildTemplates.map((template, idx) => {
                              const IconComponent = template.icon;
                              return (
                                <div key={idx} className="group relative">
                                  <button
                                    onClick={() => {
                                      setInput(template.prompt);
                                    }}
                                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all flex items-start gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <IconComponent className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{template.label}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                                    </div>
                                  </button>
                                  <div className="absolute left-0 right-0 bottom-full mb-2 p-3 rounded-lg bg-popover border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                    <p className="text-xs text-muted-foreground leading-relaxed">{template.prompt}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conversation messages */}
                    {messages.map((msg, idx) => (
                      msg.role === 'user' ? (
                        <div key={idx} className="flex flex-col gap-1.5 max-w-[80%] self-end ml-8">
                          <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5">
                            <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground self-end">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div key={idx} className="flex gap-2 max-w-[90%]">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2.5">
                              <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              {msg.model || 'AI Builder'} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    ))}

                    {/* Inline build progress when actively building */}
                    {(isBuilding || buildSteps.length > 0) && (
                      <div className="flex gap-2 max-w-full">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          {isBuilding ? (
                            <Loader2 className="h-3 w-3 text-primary animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <AIBuildProgress 
                            steps={buildSteps} 
                            progress={progress} 
                            isBuilding={isBuilding}
                            onCancel={cancelBuild}
                          />
                        </div>
                      </div>
                    )}

                    {/* Thinking indicator - shows immediately after user sends, before build steps appear */}
                    {isBuilding && buildSteps.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 max-w-[90%]"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Loader2 className="h-3 w-3 text-primary animate-spin" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-muted/50 rounded-xl border border-border/40 px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <motion.div
                                  className="w-1.5 h-1.5 rounded-full bg-primary"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                                />
                                <motion.div
                                  className="w-1.5 h-1.5 rounded-full bg-primary"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                                />
                                <motion.div
                                  className="w-1.5 h-1.5 rounded-full bg-primary"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  /* Chat mode: show regular messages */
                  <>
                    {messages.length === 0 && (
                      <div className="py-8">
                        <div className="text-center mb-6">
                          <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Ask me anything about your {pageContext}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {defaultPrompts[pageContext]?.map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => setInput(prompt)}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                {messages.map((msg, idx) => (
                   msg.role === 'user' ? (
                    <div key={idx} className="flex flex-col gap-1.5 max-w-[80%] self-end ml-8">
                      <div className={cn(
                        "text-white rounded-2xl px-4 py-2.5",
                        msg.isInitialPrompt 
                          ? "bg-purple-600" 
                          : "bg-blue-600"
                      )}>
                        <div className="flex gap-2 items-center mb-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {user?.email?.substring(0, 2).toUpperCase() || 'YU'}
                          </div>
                          <span className="text-sm font-medium">You</span>
                        </div>
                        <div className="text-sm">
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground self-end">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-muted/50"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-muted/50"
                          onClick={() => {
                            const newMessages = messages.filter((_, i) => i !== idx);
                            setMessages(newMessages);
                            if (currentConversationId) {
                              updateConversation(currentConversationId, newMessages);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 hover:bg-muted/50"
                              title={(msg.snapshotId || msg.snapshotData) ? `Restore ${pageContext} state and conversation to this point` : "Restore conversation to this point"}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              <span>Restore</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="end" className="w-64 p-3">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium">Restore to this point?</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(msg.snapshotId || msg.snapshotData)
                                    ? `This will restore your ${pageContext === 'flow' ? 'flow' : 'data'} and conversation. All changes after this point will be undone.`
                                    : pageContext === 'flow' 
                                      ? "Conversation will be restored (no flow snapshot for this message)."
                                      : "Conversation will be restored."
                                  }
                                </p>
                              </div>
                              <div className="flex justify-end gap-2">
                                <PopoverClose asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs">
                                    Cancel
                                  </Button>
                                </PopoverClose>
                                <PopoverClose asChild>
                                  <Button 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={async () => {
                                      console.log('[Restore] Starting restore from message index:', idx, 'role:', msg.role, 'hasSnapshotData:', !!msg.snapshotData, 'hasSnapshotId:', !!msg.snapshotId);
                                      
                                      const { setNodes, setEdges, setShouldSaveImmediately } = useFlowStore.getState();
                                      const { getSnapshot } = useSnapshotStore.getState();
                                      
                                      // Step 1: Try to get snapshot data from multiple sources
                                      let snapshotData = msg.snapshotData;
                                      
                                      if (snapshotData) {
                                        console.log('[Restore] Found snapshotData on message:', { hasNodes: !!snapshotData.nodes, hasEdges: !!snapshotData.edges, nodeCount: snapshotData.nodes?.length, edgeCount: snapshotData.edges?.length });
                                      }
                                      
                                      // Step 1a: If no snapshotData, try in-memory store with snapshotId
                                      if (!snapshotData && msg.snapshotId) {
                                        const inMemorySnapshot = getSnapshot(msg.snapshotId);
                                        if (inMemorySnapshot?.flowData) {
                                          snapshotData = { 
                                            nodes: inMemorySnapshot.flowData.nodes, 
                                            edges: inMemorySnapshot.flowData.edges 
                                          };
                                          console.log('[Restore] Found snapshot in memory store:', msg.snapshotId);
                                        }
                                      }
                                      
                                      // Step 2: If still no snapshot, search backwards through messages
                                      if (!snapshotData) {
                                        console.log('[Restore] No snapshot on current message, searching backwards through', idx + 1, 'messages...');
                                        for (let i = idx; i >= 0; i--) {
                                          const prevMsg = messages[i];
                                          
                                          // Try snapshotData first (persisted in DB)
                                          if (prevMsg.snapshotData) {
                                            snapshotData = prevMsg.snapshotData;
                                            console.log('[Restore] Found snapshotData from message index:', i, 'role:', prevMsg.role);
                                            break;
                                          }
                                          
                                          // Try in-memory store with snapshotId
                                          if (prevMsg.snapshotId) {
                                            const snap = getSnapshot(prevMsg.snapshotId);
                                            if (snap?.flowData) {
                                              snapshotData = { 
                                                nodes: snap.flowData.nodes, 
                                                edges: snap.flowData.edges 
                                              };
                                              console.log('[Restore] Found snapshot in memory from message index:', i, prevMsg.snapshotId);
                                              break;
                                            }
                                          }
                                        }
                                      }
                                      
                                      // Step 3: Restore based on available snapshot data
                                      if (snapshotData) {
                                        try {
                                          if (pageContext === 'flow' && (snapshotData.nodes !== undefined || snapshotData.edges !== undefined)) {
                                            // Restore flow directly from snapshot data
                                            const nodesToRestore = snapshotData.nodes || [];
                                            const edgesToRestore = snapshotData.edges || [];
                                            console.log('[Restore] Restoring flow with:', nodesToRestore.length, 'nodes,', edgesToRestore.length, 'edges');
                                            setNodes(nodesToRestore);
                                            setEdges(edgesToRestore);
                                            setShouldSaveImmediately(true);
                                            toast.success(`Flow & conversation restored (${nodesToRestore.length} nodes)`);
                                          } else if (pageContext === 'database' && snapshotData.records !== undefined) {
                                            // Restore table data
                                            await supabase
                                              .from('table_projects')
                                              .update({ 
                                                records: snapshotData.records,
                                                schema: snapshotData.schema || undefined 
                                              })
                                              .eq('id', contextId);
                                            triggerTablesRefresh();
                                            toast.success(`Table & conversation restored (${snapshotData.records?.length || 0} records)`);
                                          } else if (pageContext === 'database' && snapshotData.content !== undefined) {
                                            // Restore document data
                                            await supabase
                                              .from('documents')
                                              .update({ 
                                                content: snapshotData.content,
                                                title: snapshotData.title || 'Untitled' 
                                              })
                                              .eq('id', contextId);
                                            triggerDocumentsRefresh();
                                            toast.success("Document & conversation restored");
                                          } else {
                                            console.warn('[Restore] Snapshot data format not recognized:', { pageContext, hasNodes: !!snapshotData.nodes, hasRecords: snapshotData.records !== undefined, hasContent: snapshotData.content !== undefined });
                                            toast.warning("Snapshot data format not recognized for this context");
                                          }
                                        } catch (restoreError) {
                                          console.error('[UnifiedAISidebar] Restore failed:', restoreError);
                                          toast.error("Failed to restore data");
                                        }
                                      } else {
                                        // No snapshot available - inform user, conversation is still restored
                                        console.log('[Restore] No snapshot data found, conversation restored only');
                                        if (pageContext === 'flow') {
                                          toast.info("Conversation restored (no flow snapshot for this message)");
                                        } else if (pageContext === 'database') {
                                          toast.info("Conversation restored (no data snapshot for this message)");
                                        } else {
                                          toast.info("Conversation restored");
                                        }
                                      }
                                      
                                      // Step 4: Always restore conversation messages (remove everything after this point)
                                      const restoredMessages = messages.slice(0, idx + 1);
                                      console.log('[Restore] Truncating conversation from', messages.length, 'to', restoredMessages.length, 'messages');
                                      setMessages(restoredMessages);
                                      if (currentConversationId) {
                                        updateConversation(currentConversationId, restoredMessages);
                                      }
                                    }}
                                  >
                                    Restore
                                  </Button>
                                </PopoverClose>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="max-w-[85%] self-start mr-4 flex flex-col gap-1.5">
                      <div className="bg-background border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            AGENT
                          </div>
                        </div>
                        <MarkdownRenderer className="mb-3">
                          {(() => {
                            // Strip JSON/code blocks as final safety check
                            const stripJsonFromContent = (content: string): string => {
                              if (!content || typeof content !== 'string') return content;
                              let cleaned = content;
                              cleaned = cleaned.replace(/```[\s\S]*?```/g, '').trim();
                              const jsonBlockRegex = /\{[\s\S]*(?:"nodes"|"success")[\s\S]*\}$/;
                              const match = cleaned.match(jsonBlockRegex);
                              if (match && match.index !== undefined) {
                                cleaned = cleaned.slice(0, match.index).trim();
                              }
                              return cleaned;
                            };
                            
                            let displayContent = typeof msg.content === 'string' 
                              ? stripJsonFromContent(msg.content) 
                              : msg.content;
                            
                            // Final fallback: if content is still pure JSON, extract message
                            if (typeof displayContent === 'string' && (displayContent.trim().startsWith('{') || displayContent.trim().startsWith('['))) {
                              try {
                                const parsed = JSON.parse(displayContent);
                                if (parsed.message) {
                                  displayContent = parsed.message;
                                } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
                                  displayContent = `I've created ${parsed.nodes.length} node${parsed.nodes.length > 1 ? 's' : ''} for your flow.`;
                                }
                              } catch {
                                // If parsing fails, just show the original content
                              }
                            }
                            return displayContent;
                          })()}
                        </MarkdownRenderer>
                        
                        {/* Node type badges and action buttons */}
                        {msg.nodes && msg.nodes.length > 0 && (
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {msg.nodes.map((node: any, nodeIdx: number) => (
                                <Badge 
                                  key={nodeIdx} 
                                  variant="secondary" 
                                  className="text-xs font-normal"
                                >
                                  {node.category || node.type}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                Preview
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                Code
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Node cards if present */}
                        {msg.nodes && msg.nodes.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {msg.nodes.map((node: any, nodeIdx: number) => (
                              <FlowNodeCard
                                key={nodeIdx}
                                nodeName={node.label || node.name}
                                nodeType={node.type}
                                category={node.category}
                                description={node.description}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp and actions */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</span>
                        <span className="text-muted-foreground/60 mx-1">•</span>
                        <span className="text-muted-foreground/80">
                          {msg.model || 'AI Model'}
                        </span>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-muted/50"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-muted/50"
                          onClick={() => {
                            const newMessages = messages.filter((_, i) => i !== idx);
                            setMessages(newMessages);
                            if (currentConversationId) {
                              updateConversation(currentConversationId, newMessages);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                ))}
                
                {/* Thinking indicator */}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in-50 duration-300 whitespace-nowrap">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="font-semibold uppercase tracking-wide text-xs">
                      THINKING...
                    </span>
                    <span className="text-xs truncate">{thinkingStatus || 'Processing your request...'}</span>
                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:200ms]" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:400ms]" />
                    </div>
                  </div>
                )}
                  </>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 space-y-2">
              {/* Attached Files Display */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((file, idx) => {
                    const isImage = file.type.startsWith('image/');
                    const imageUrl = isImage ? URL.createObjectURL(file) : null;
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-xs"
                      >
                        {isImage && imageUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="flex items-center gap-2">
                                <img 
                                  src={imageUrl} 
                                  alt={file.name}
                                  className="h-8 w-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <span className="truncate max-w-[100px]">{file.name}</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <img 
                                src={imageUrl} 
                                alt={file.name}
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <>
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                          </>
                        )}
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.csv"
              />
              <input
                ref={spreadsheetInputRef}
                type="file"
                className="hidden"
                onChange={handleSpreadsheetChange}
                accept=".csv,.xlsx,.xls"
              />
              <input
                ref={imageInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleImageChange}
                accept="image/*"
              />
              <input
                ref={documentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleDocumentChange}
                accept=".pdf,.doc,.docx,.txt,.md"
              />
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
                <Textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize textarea
                    const textarea = e.target;
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isAppBuildMode) {
                        if (input.trim() && !isBuilding) {
                          handleStartBuild(input.trim());
                          setInput('');
                        }
                      } else {
                        handleSendMessage();
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;

                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        if (blob) {
                          setAttachedFiles(prev => [...prev, blob]);
                          toast.success('Image pasted successfully');
                        }
                      }
                    }
                  }}
                  placeholder={isAppBuildMode ? 'Describe the app you want to build…' : `Ask about your ${pageContext}...`}
                  className="min-h-[40px] max-h-[200px] text-sm resize-none px-2 py-2 border-0 bg-transparent focus-visible:ring-0 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full"
                  disabled={isProcessing || (isAppBuildMode && isBuilding)}
                  style={{ height: 'auto' }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          title="Attach files"
                        >
                          <Paperclip className="h-4 w-4 mr-1" />
                          <span className="text-xs">Attach</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-background z-50 w-48">
                        <DropdownMenuItem onSelect={() => imageInputRef.current?.click()}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => documentInputRef.current?.click()}>
                          <FileText className="h-4 w-4 mr-2" />
                          Document
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setImportModalOpen(true)}>
                          <img src={webflowIcon} alt="Webflow" className="h-4 w-4 mr-2 rounded object-cover" />
                          Webflow
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setImportModalOpen(true)}>
                          <img src={figmaIcon} alt="Figma" className="h-4 w-4 mr-2 rounded object-cover" />
                          Figma
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setImportModalOpen(true)}>
                          <img src={framerIcon} alt="Framer" className="h-4 w-4 mr-2 rounded object-cover" />
                          Framer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setImportModalOpen(true)}>
                          <Download className="h-4 w-4 mr-2" />
                          ZIP File
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ImportOptionsModal open={importModalOpen} onOpenChange={setImportModalOpen} />
                    <Select value={selectedModel} onValueChange={(value: AIModelType) => setSelectedModel(value)}>
                      <SelectTrigger className="h-7 w-auto text-xs border-0 bg-transparent hover:bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="gemini-3-pro">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>Gemini 3 Pro</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini-3-flash">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>Gemini 3 Flash</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini-2.5-flash">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>Gemini 2.5 Flash</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini-2.5-pro">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>Gemini 2.5 Pro</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="claude-sonnet-4">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            <span>Claude Sonnet 4</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gpt-5-mini">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3" />
                            <span>GPT-5 Mini</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gpt-5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3" />
                            <span>GPT-5</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="minimax-m2.5">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            <span>MiniMax M2.5</span>
                          </div>
                        </SelectItem>
                        {/* Deep research models are only available in Database AI */}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Chat mode toggle button - only show in app context */}
                    {pageContext === 'app' && (
                      <Button
                        onClick={() => setAiMode(aiMode === 'build' ? 'chat' : 'build')}
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 transition-colors",
                          aiMode === 'chat' && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        title={aiMode === 'chat' ? 'Switch to Build mode' : 'Switch to Chat mode'}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {(isProcessing || (isAppBuildMode && isBuilding)) ? (
                      <Button
                        onClick={handleCancelMessage}
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        title={isAppBuildMode && isBuilding ? 'Cancel build' : 'Cancel message'}
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          if (isAppBuildMode) {
                            if (input.trim() && !isBuilding) {
                              handleStartBuild(input.trim());
                              setInput('');
                            }
                            return;
                          }
                          handleSendMessage();
                        }}
                        disabled={!input.trim()}
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AI Wall Tab Content */}
          {pageContext === 'app' && (
            <TabsContent value="wall" className="data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:overflow-hidden mt-0">
              <AIWallSidebarContent />
            </TabsContent>
          )}

        </Tabs>
      </div>
    </div>
  );
}
