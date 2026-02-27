-- ============================================
-- DOCS AS DATABASE FEATURE - MIGRATION
-- Documents belong to databases, inheriting permissions
-- ============================================

-- 1. Create document folders (like table folders, but for docs)
CREATE TABLE document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid REFERENCES databases(id) ON DELETE CASCADE NOT NULL,
  parent_folder_id uuid REFERENCES document_folders(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) > 0 AND length(name) <= 255),
  icon text,
  position integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid REFERENCES databases(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES document_folders(id) ON DELETE SET NULL,
  
  -- Content
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text,
  cover_image text,
  
  -- Metadata
  created_by uuid NOT NULL,
  last_edited_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Status
  archived boolean DEFAULT false,
  archived_at timestamptz,
  position integer DEFAULT 0
);

-- 3. Create document revisions (version history)
CREATE TABLE document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content jsonb NOT NULL,
  title text NOT NULL,
  version_number integer NOT NULL,
  change_summary text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- 4. Create document attachments
CREATE TABLE document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  database_id uuid REFERENCES databases(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_documents_database ON documents(database_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_archived ON documents(archived, database_id);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('english', title));

CREATE INDEX idx_folders_database ON document_folders(database_id);
CREATE INDEX idx_folders_parent ON document_folders(parent_folder_id);

CREATE INDEX idx_revisions_document ON document_revisions(document_id, version_number DESC);

CREATE INDEX idx_attachments_document ON document_attachments(document_id);
CREATE INDEX idx_attachments_database ON document_attachments(database_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

-- Documents: Database owners can access all docs
CREATE POLICY "Users can view docs in their databases"
ON documents FOR SELECT
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create docs in their databases"
ON documents FOR INSERT
WITH CHECK (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update docs in their databases"
ON documents FOR UPDATE
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete docs in their databases"
ON documents FOR DELETE
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

-- Folders: Same as documents
CREATE POLICY "Users can manage folders in their databases"
ON document_folders FOR ALL
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

-- Revisions: Can view revisions of accessible documents
CREATE POLICY "Users can view revisions of their docs"
ON document_revisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_revisions.document_id
    AND documents.database_id IN (
      SELECT id FROM databases WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can create revisions"
ON document_revisions FOR INSERT
WITH CHECK (true);

-- Attachments: Same pattern
CREATE POLICY "Users can view attachments in their databases"
ON document_attachments FOR SELECT
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload attachments in their databases"
ON document_attachments FOR INSERT
WITH CHECK (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete attachments in their databases"
ON document_attachments FOR DELETE
USING (
  database_id IN (
    SELECT id FROM databases WHERE user_id = auth.uid()
  )
);

-- ============================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: View attachments if you own the database
CREATE POLICY "Users can view document attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-attachments' AND
  EXISTS (
    SELECT 1 FROM document_attachments da
    JOIN documents d ON d.id = da.document_id
    JOIN databases db ON db.id = d.database_id
    WHERE da.file_path = storage.objects.name
    AND db.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload document attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete document attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'document-attachments' AND
  EXISTS (
    SELECT 1 FROM document_attachments da
    JOIN documents d ON d.id = da.document_id
    JOIN databases db ON db.id = d.database_id
    WHERE da.file_path = storage.objects.name
    AND db.user_id = auth.uid()
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE TRIGGER documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER folders_updated_at
BEFORE UPDATE ON document_folders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-create revision on content changes
CREATE OR REPLACE FUNCTION create_document_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM document_revisions
    WHERE document_id = NEW.id;
    
    INSERT INTO document_revisions (
      document_id,
      content,
      title,
      created_by,
      version_number
    ) VALUES (
      NEW.id,
      NEW.content,
      NEW.title,
      COALESCE(NEW.last_edited_by, NEW.created_by),
      next_version
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_revision
AFTER UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION create_document_revision();