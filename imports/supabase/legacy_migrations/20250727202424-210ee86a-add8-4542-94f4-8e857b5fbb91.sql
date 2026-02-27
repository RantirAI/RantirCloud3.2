-- Create table for tracking user searches and documents
CREATE TABLE IF NOT EXISTS public.user_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general', -- general, document, prompt
  results_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing default prompts and documents
CREATE TABLE IF NOT EXISTS public.search_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- prompt, document, template
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  user_id UUID, -- null for system documents
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_searches
CREATE POLICY "Users can manage their own searches" 
ON public.user_searches 
FOR ALL 
USING (auth.uid() = user_id);

-- Create policies for search_documents
CREATE POLICY "Users can view public documents and their own" 
ON public.search_documents 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own documents" 
ON public.search_documents 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_searches_timestamp
BEFORE UPDATE ON public.user_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_search_timestamp();

CREATE TRIGGER update_search_documents_timestamp
BEFORE UPDATE ON public.search_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_search_timestamp();

-- Insert some default prompts
INSERT INTO public.search_documents (title, content, category, tags, is_public, user_id) VALUES
('Video Dashboard Generator', 'Generate a comprehensive video dashboard with analytics, playlist management, and user engagement metrics', 'prompt', ARRAY['video', 'dashboard', 'analytics'], true, null),
('Task Manager for Construction', 'Create a task management system specifically designed for construction projects with timeline tracking, resource allocation, and progress monitoring', 'prompt', ARRAY['construction', 'task-management', 'project'], true, null),
('Habit Tracker for Food', 'Build a food habit tracking application with meal logging, nutrition analysis, and goal setting features', 'prompt', ARRAY['food', 'health', 'tracking'], true, null),
('Integration Loop System', 'Design an automated integration system that connects multiple services and creates workflow loops', 'prompt', ARRAY['integration', 'automation', 'workflow'], true, null),
('E-commerce Platform', 'Create a full-featured e-commerce platform with product management, payment processing, and inventory tracking', 'prompt', ARRAY['ecommerce', 'shopping', 'business'], true, null),
('Customer Support Dashboard', 'Build a customer support system with ticket management, live chat, and analytics', 'prompt', ARRAY['support', 'customer-service', 'dashboard'], true, null);