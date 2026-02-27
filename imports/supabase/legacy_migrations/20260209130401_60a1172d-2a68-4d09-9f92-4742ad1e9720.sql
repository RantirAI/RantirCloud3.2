
-- AI Wall Sessions (one per generation/prompt)
CREATE TABLE public.ai_wall_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  preset_id TEXT,
  model TEXT NOT NULL,
  selected_variant_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Wall Variants (designs within a session)
CREATE TABLE public.ai_wall_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_wall_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout_type TEXT NOT NULL DEFAULT 'standard',
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_wall_sessions_user_id ON public.ai_wall_sessions(user_id);
CREATE INDEX idx_ai_wall_sessions_created_at ON public.ai_wall_sessions(created_at DESC);
CREATE INDEX idx_ai_wall_variants_session_id ON public.ai_wall_variants(session_id);

-- RLS
ALTER TABLE public.ai_wall_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_wall_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.ai_wall_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.ai_wall_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.ai_wall_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.ai_wall_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view variants of their sessions"
  ON public.ai_wall_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_wall_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create variants in their sessions"
  ON public.ai_wall_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_wall_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can update variants in their sessions"
  ON public.ai_wall_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ai_wall_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete variants in their sessions"
  ON public.ai_wall_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_wall_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- Timestamp trigger
CREATE TRIGGER update_ai_wall_sessions_updated_at
  BEFORE UPDATE ON public.ai_wall_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
