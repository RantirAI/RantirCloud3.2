import { supabase } from "@/integrations/supabase/client";
import { activityService } from "./activityService";

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_public: boolean;
  user_id?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface UserSearch {
  id: string;
  user_id: string;
  search_query: string;
  search_type: string;
  results_count: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const searchService = {
  // Search for documents and prompts
  async searchDocuments(query: string, category?: string): Promise<SearchDocument[]> {
    let queryBuilder = supabase
      .from('search_documents')
      .select('*')
      .ilike('title', `%${query}%`);

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Search by tags
  async searchByTags(tags: string[]): Promise<SearchDocument[]> {
    const { data, error } = await supabase
      .from('search_documents')
      .select('*')
      .overlaps('tags', tags)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Get all categories
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('search_documents')
      .select('category')
      .eq('is_public', true);

    if (error) {
      throw new Error(error.message);
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories;
  },

  // Track user search
  async trackSearch(userId: string, query: string, resultsCount: number, searchType: string = 'general', metadata: any = {}, workspaceId?: string): Promise<void> {
    const { error } = await supabase
      .from('user_searches')
      .insert({
        user_id: userId,
        search_query: query,
        search_type: searchType,
        results_count: resultsCount,
        metadata: metadata,
        workspace_id: workspaceId
      });

    if (error) {
      console.error('Failed to track search:', error);
    }
    
    // Log activity
    await activityService.logActivity({
      type: 'search_performed',
      description: `Searched: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
      metadata: { query, resultsCount, searchType }
    });
  },

  // Update or insert chat conversation
  async saveConversation(userId: string, conversationId: string, title: string, messages: any[]): Promise<void> {
    console.log('searchService.saveConversation called with:', { userId, conversationId, title, messageCount: messages.length });
    
    const conversationData = {
      user_id: userId,
      search_query: title,
      search_type: 'chat',
      results_count: messages.length,
      metadata: {
        conversation_id: conversationId,
        title: title,
        messages: messages,
        updated_at: new Date().toISOString()
      }
    };

    console.log('Attempting to insert/update conversation data:', conversationData);

    const { data, error } = await supabase
      .from('user_searches')
      .insert(conversationData)
      .select();

    if (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }

    console.log('Conversation saved successfully:', data);
  },

  // Get user's recent searches (excludes saved prompts/conversations)
  async getUserSearchHistory(userId: string, limit: number = 10, workspaceId?: string | null): Promise<UserSearch[]> {
    let query = supabase
      .from('user_searches')
      .select('*')
      .eq('user_id', userId)
      .neq('search_type', 'conversation') // Exclude saved prompts/conversations
      .neq('search_type', 'saved_prompt') // Exclude saved prompts
      .neq('search_type', 'chat'); // Exclude chat conversations - they show in conversations section

    // Filter by workspace if provided
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  // Get popular searches
  async getPopularSearches(limit: number = 5): Promise<{ query: string; count: number }[]> {
    const { data, error } = await supabase
      .from('user_searches')
      .select('search_query')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    // Count occurrences
    const searchCounts: { [key: string]: number } = {};
    data?.forEach(item => {
      searchCounts[item.search_query] = (searchCounts[item.search_query] || 0) + 1;
    });

    // Sort by count and return top results
    return Object.entries(searchCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  },

  // Add new document (for users to add their own prompts)
  async addDocument(document: Omit<SearchDocument, 'id' | 'created_at' | 'updated_at'>): Promise<SearchDocument> {
    const { data, error } = await supabase
      .from('search_documents')
      .insert(document)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
};