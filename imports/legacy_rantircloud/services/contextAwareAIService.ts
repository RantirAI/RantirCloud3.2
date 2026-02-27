import { AppComponent } from '@/types/appBuilder';

export interface AIRequest {
  prompt: string;
  context: {
    component: AppComponent;
    intent: 'modify_style' | 'modify_content' | 'modify_behavior' | 'general';
  };
}

export interface AIResponse {
  success: boolean;
  updates?: Partial<AppComponent>;
  message: string;
}

class ContextAwareAIService {
  async processRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      console.log('Calling ai-assistant function...');
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          prompt: request.prompt,
          context: request.context,
        },
      });

      console.log('Function response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Function call failed');
      }

      return data;
    } catch (error) {
      console.error('AI service error:', error);
      return {
        success: false,
        message: `AI service error: ${error.message}`
      };
    }
  }

  // General AI chat with component generation capabilities
  async processGeneralChat(prompt: string, context?: any): Promise<{ success: boolean; message?: string; action?: string; components?: any[]; component?: any }> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          prompt,
          context: context || null,
        },
      });

      if (error) {
        throw new Error(error.message || 'Function call failed');
      }

      return data;
    } catch (error) {
      console.error('AI chat error:', error);
      return {
        success: false,
        message: `AI chat error: ${error.message}`
      };
    }
  }

  // Progressive component building for canvas
  async buildComponentProgressively(
    componentData: any,
    onProgress?: (message: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const { progressiveBuilder } = await import('./progressiveComponentBuilder');
      
      // Parse the component data - handle both single components and component arrays
      let componentToBuild;
      if (componentData.components && Array.isArray(componentData.components)) {
        componentToBuild = componentData.components[0]; // Take the first component
      } else if (componentData.component) {
        componentToBuild = componentData.component;
      } else {
        componentToBuild = componentData;
      }

      await progressiveBuilder.buildComponentProgressively(
        componentToBuild,
        undefined, // No specific parent, add to current page
        onProgress,
        onComplete
      );
    } catch (error) {
      console.error('Progressive component building error:', error);
      throw error;
    }
  }
}

export const contextAwareAIService = new ContextAwareAIService();