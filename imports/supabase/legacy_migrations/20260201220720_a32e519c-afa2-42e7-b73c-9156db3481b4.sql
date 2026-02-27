-- Comments table for App Builder
CREATE TABLE public.app_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_project_id UUID NOT NULL REFERENCES public.app_projects(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL, -- Page within the app project
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  
  -- Position on canvas (for pinned comments)
  position_x NUMERIC,
  position_y NUMERIC,
  
  -- Element attachment (for element-attached comments)
  element_id TEXT, -- ID of the element this comment is attached to
  
  -- Threading
  parent_id UUID REFERENCES public.app_comments(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comment mentions for tagging users
CREATE TABLE public.app_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.app_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(comment_id, mentioned_user_id)
);

-- Enable RLS
ALTER TABLE public.app_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_comments
-- Users can view comments on projects they have access to (via workspace membership)
CREATE POLICY "Users can view comments on accessible projects"
ON public.app_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_projects ap
    WHERE ap.id = app_comments.app_project_id
    AND (
      ap.user_id = auth.uid() 
      OR public.is_workspace_member(ap.workspace_id)
    )
  )
);

-- Users can create comments on projects they have access to
CREATE POLICY "Users can create comments on accessible projects"
ON public.app_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM app_projects ap
    WHERE ap.id = app_project_id
    AND (
      ap.user_id = auth.uid() 
      OR public.is_workspace_member(ap.workspace_id)
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.app_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.app_comments
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for app_comment_mentions
CREATE POLICY "Users can view their mentions"
ON public.app_comment_mentions
FOR SELECT
USING (mentioned_user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM app_comments c
  WHERE c.id = comment_id AND c.user_id = auth.uid()
));

CREATE POLICY "Comment authors can create mentions"
ON public.app_comment_mentions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_comments c
    WHERE c.id = comment_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Mentioned users can update their read status"
ON public.app_comment_mentions
FOR UPDATE
USING (mentioned_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_app_comments_timestamp
BEFORE UPDATE ON public.app_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_app_comments_project ON public.app_comments(app_project_id);
CREATE INDEX idx_app_comments_page ON public.app_comments(app_project_id, page_id);
CREATE INDEX idx_app_comments_element ON public.app_comments(element_id) WHERE element_id IS NOT NULL;
CREATE INDEX idx_app_comments_parent ON public.app_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_app_comment_mentions_user ON public.app_comment_mentions(mentioned_user_id);
CREATE INDEX idx_app_comment_mentions_unread ON public.app_comment_mentions(mentioned_user_id, is_read) WHERE is_read = false;