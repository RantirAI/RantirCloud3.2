import { create } from 'zustand';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  nodes?: Array<any>; // Flow nodes with label, type, category, description, etc.
  model?: string;
  snapshotId?: string; // Link to snapshot taken before this message's changes for restore functionality
  snapshotData?: { // Persisted snapshot data for restoration
    nodes?: any[];
    edges?: any[];
    records?: any[];
    schema?: any;
    content?: any;
    title?: string;
  };
  isInitialPrompt?: boolean; // Mark dashboard-generated prompts with purple styling
}

export interface Conversation {
  id: string;
  pageContext: string; // Can be single type or comma-separated (e.g., "database,flow,app")
  contextId: string;
  timestamp: Date;
  messages: Message[];
  preview: string;
  activeIntegrations?: string[]; // Integrations that were active when conversation started
}

export type AIModelType = 'gemini-3-pro' | 'gemini-3-flash' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'claude-sonnet-4' | 'gpt-5' | 'gpt-5-mini' | 'gemini-deep-research' | 'openai-deep-research' | 'minimax-m2.5';

interface AISidebarState {
  isOpen: boolean;
  activeTab: 'chat' | 'wall' | 'timeline';
  currentConversationId: string | null;
  conversations: Conversation[];
  selectedModel: AIModelType;
  
  // Actions
  toggleSidebar: () => void;
  setActiveTab: (tab: 'chat' | 'wall' | 'timeline') => void;
  setCurrentConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, messages: Message[]) => void;
  setConversations: (conversations: Conversation[]) => void;
  loadConversations: (pageContext: string, contextId: string) => void;
  saveConversations: () => void;
  setSelectedModel: (model: AIModelType) => void;
  addInitialPromptToConversation: (pageContext: string, contextId: string, prompt: string, userId: string, activeIntegrations?: string[], flowNodes?: any[]) => Promise<void>;
  loadAllConversations: (userId: string) => Promise<void>;
}

export const useAISidebarStore = create<AISidebarState>((set, get) => ({
  isOpen: false,
  activeTab: 'chat',
  currentConversationId: null,
  conversations: [],
  selectedModel: (typeof window !== 'undefined' && localStorage.getItem('ai-selected-model') as AIModelType) || 'gemini-3-pro',

  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCurrentConversation: (id) => set({ currentConversationId: id }),

  setSelectedModel: (model) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-selected-model', model);
    }
    set({ selectedModel: model });
  },

  addConversation: (conversation) => 
    set((state) => {
      // Check if conversation already exists
      const exists = state.conversations.some(conv => conv.id === conversation.id);
      if (exists) {
        // Update existing conversation instead of adding duplicate
        return {
          conversations: state.conversations.map(conv =>
            conv.id === conversation.id
              ? { ...conv, messages: conversation.messages, timestamp: conversation.timestamp }
              : conv
          ),
          currentConversationId: conversation.id
        };
      }
      // Add new conversation
      return {
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id
      };
    }),

  updateConversation: (id, messages) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id
          ? { ...conv, messages, timestamp: new Date() }
          : conv
      )
    })),

  setConversations: (conversations) =>
    set({ conversations }),

  loadConversations: (pageContext, contextId) => {
    const key = `ai-conversations-${pageContext}-${contextId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const conversations = parsed.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        set({ conversations });
      } catch (error) {
        console.error('Failed to load conversations:', error);
        set({ conversations: [] });
      }
    }
  },

  saveConversations: () => {
    const { conversations } = get();
    if (conversations.length === 0) return;

    // Group by context and save
    const grouped = conversations.reduce((acc, conv) => {
      const key = `${conv.pageContext}-${conv.contextId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(conv);
      return acc;
    }, {} as Record<string, Conversation[]>);

    Object.entries(grouped).forEach(([key, convs]) => {
      const storageKey = `ai-conversations-${key}`;
      // Limit to last 50 conversations per context
      const limited = convs.slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(limited));
    });
  },

  addInitialPromptToConversation: async (pageContext, contextId, prompt, userId, activeIntegrations = [], flowNodes = []) => {
    try {
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Create a new conversation with the initial prompt
      const conversationId = crypto.randomUUID();
      const previewText = prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '');
      
      // Only capture integrations for flow context - extract from actual flow nodes used
      let integrationsToSave: string[] = [];
      
      if (pageContext.includes('flow')) {
        if (activeIntegrations.length > 0) {
          // Use provided integrations if available
          integrationsToSave = activeIntegrations.slice(0, 10);
        } else if (flowNodes.length > 0) {
          // Extract unique node types from flow nodes
          const nodeTypes = flowNodes
            .map((node: any) => node.data?.type || node.data?.label || node.type)
            .filter(Boolean)
            .filter((type: string, index: number, arr: string[]) => arr.indexOf(type) === index);
          integrationsToSave = nodeTypes.slice(0, 10);
        }
        // Don't fall back to fetching all installed integrations
      }
      // For database/app/cloud contexts, integrationsToSave stays empty
      
      // Insert conversation into database with active integrations
      const { error: convError } = await supabase
        .from('ai_conversations')
        .insert({
          id: conversationId,
          user_id: userId,
          page_context: pageContext === 'cloud' ? 'app' : pageContext,
          context_id: contextId,
          preview_text: previewText,
          active_integrations: integrationsToSave
        });

      if (convError) {
        console.error('Error creating conversation:', convError);
        return;
      }

      // Insert the initial prompt message (user)
      const { error: msgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: prompt,
          is_initial_prompt: true
        });

      if (msgError) {
        console.error('Error creating initial prompt message:', msgError);
        return;
      }

      // Generate AI response based on project type(s) - supports comma-separated types
      const projectTypes = pageContext.split(',');
      const projectTypeLabels = projectTypes.map(type => 
        type === 'database' ? 'document/table' : 
        type === 'flow' ? 'flow' : 
        type === 'app' ? 'application' : 'project'
      );
      const labelText = projectTypeLabels.length > 1 
        ? projectTypeLabels.slice(0, -1).join(', ') + ' and ' + projectTypeLabels[projectTypeLabels.length - 1]
        : projectTypeLabels[0];
      const aiResponseContent = `I've successfully created your ${labelText} based on your request. You can now view and edit it in the workspace. Let me know if you'd like to make any changes or need additional assistance!`;

      // Insert AI response message
      const { error: aiMsgError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponseContent,
          is_initial_prompt: false,
          model: 'Assistant'
        });

      if (aiMsgError) {
        console.error('Error creating AI response message:', aiMsgError);
      }

      // Add to local state with both messages
      const now = new Date();
      const newConversation: Conversation = {
        id: conversationId,
        pageContext,
        contextId,
        timestamp: now,
        messages: [
          {
            role: 'user',
            content: prompt,
            timestamp: now,
            isInitialPrompt: true
          },
          {
            role: 'assistant',
            content: aiResponseContent,
            timestamp: new Date(now.getTime() + 1000), // 1 second after
            model: 'Assistant'
          }
        ],
        preview: previewText,
        activeIntegrations: integrationsToSave
      };

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversationId: conversationId,
        isOpen: true // Auto-open the sidebar to show the conversation
      }));

    } catch (error) {
      console.error('Error adding initial prompt to conversation:', error);
    }
  },

  loadAllConversations: async (userId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Fetch all conversations for this user
      const { data: convData, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!convData || convData.length === 0) return;

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
              snapshotData: msg.snapshot_data as Message['snapshotData'],
              isInitialPrompt: msg.is_initial_prompt || false,
              model: (msg as any).model || undefined
            })),
            preview: conv.preview_text,
            activeIntegrations: (conv as any).active_integrations || []
          };
        })
      );

      set({ conversations: conversationsWithMessages });
    } catch (error) {
      console.error('Error loading all conversations:', error);
    }
  }
}));
