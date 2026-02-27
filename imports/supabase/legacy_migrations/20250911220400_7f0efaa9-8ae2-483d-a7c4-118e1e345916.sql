-- Create user activities table for comprehensive activity tracking
CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activities"
ON public.user_activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
ON public.user_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_activities_user_id_created_at ON public.user_activities (user_id, created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities (activity_type);
CREATE INDEX idx_user_activities_resource ON public.user_activities (resource_type, resource_id);