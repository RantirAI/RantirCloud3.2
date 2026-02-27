
-- Table for storing GitHub OAuth connections
CREATE TABLE public.user_github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  github_user_id BIGINT,
  github_username TEXT,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  scope TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own GitHub connections"
  ON public.user_github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GitHub connections"
  ON public.user_github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GitHub connections"
  ON public.user_github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GitHub connections"
  ON public.user_github_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Table for storing Supabase project connections
CREATE TABLE public.user_supabase_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_supabase_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Supabase connections"
  ON public.user_supabase_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Supabase connections"
  ON public.user_supabase_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Supabase connections"
  ON public.user_supabase_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Supabase connections"
  ON public.user_supabase_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_github_connections_updated_at
  BEFORE UPDATE ON public.user_github_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_supabase_connections_updated_at
  BEFORE UPDATE ON public.user_supabase_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
