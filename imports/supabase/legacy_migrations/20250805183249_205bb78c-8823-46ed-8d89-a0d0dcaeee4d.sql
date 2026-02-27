-- Create design_tokens table
CREATE TABLE IF NOT EXISTS public.design_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('color', 'font', 'spacing', 'border', 'shadow')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create button_presets table
CREATE TABLE IF NOT EXISTS public.button_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  variant TEXT NOT NULL,
  styles JSONB NOT NULL DEFAULT '{}',
  states JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.button_presets ENABLE ROW LEVEL SECURITY;

-- Create policies for design_tokens
CREATE POLICY "Users can view their own design tokens" 
ON public.design_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own design tokens" 
ON public.design_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own design tokens" 
ON public.design_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own design tokens" 
ON public.design_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for button_presets
CREATE POLICY "Users can view their own button presets" 
ON public.button_presets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own button presets" 
ON public.button_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own button presets" 
ON public.button_presets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own button presets" 
ON public.button_presets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_design_tokens_updated_at
BEFORE UPDATE ON public.design_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_timestamp();

CREATE TRIGGER update_button_presets_updated_at
BEFORE UPDATE ON public.button_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_timestamp();