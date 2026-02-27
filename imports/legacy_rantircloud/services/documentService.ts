import { supabase } from '@/integrations/supabase/client';
import { activityService } from './activityService';

export interface Document {
  id: string;
  database_id: string;
  folder_id?: string;
  title: string;
  content: any;
  icon?: string;
  logo?: string;
  cover_image?: string;
  width_mode?: string;
  page_size?: string;
  show_page_breaks?: boolean;
  header_content?: string;
  footer_content?: string;
  created_by: string;
  last_edited_by?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  archived_at?: string;
  position: number;
}

export interface DocumentFolder {
  id: string;
  database_id: string;
  parent_folder_id?: string;
  name: string;
  icon?: string;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const documentService = {
  async getDatabaseDocuments(databaseId: string, includeArchived = false): Promise<Document[]> {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('database_id', databaseId)
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getDocument(id: string): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createDocument(data: {
    database_id: string;
    folder_id?: string;
    title?: string;
    content?: any;
    icon?: string;
    width_mode?: string;
    page_size?: string;
  }): Promise<Document> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        ...data,
        title: data.title || 'Untitled',
        content: data.content || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await activityService.logActivity({
      type: 'document_created',
      description: `Created document: ${doc.title}`,
      resourceType: 'document',
      resourceId: doc.id,
      resourceName: doc.title,
      metadata: { databaseId: data.database_id }
    });

    return doc;
  },

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const user = (await supabase.auth.getUser()).data.user;
    
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        last_edited_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async duplicateDocument(id: string): Promise<Document> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    // Get the original document
    const original = await this.getDocument(id);

    // Create a copy
    const { data, error } = await supabase
      .from('documents')
      .insert({
        database_id: original.database_id,
        folder_id: original.folder_id,
        title: `${original.title} (Copy)`,
        content: original.content,
        icon: original.icon,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async searchDocuments(databaseId: string, query: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('database_id', databaseId)
      .eq('archived', false)
      .ilike('title', `%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  async getDatabaseFolders(databaseId: string): Promise<DocumentFolder[]> {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('database_id', databaseId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createFolder(data: {
    database_id: string;
    name: string;
    parent_folder_id?: string;
    icon?: string;
  }): Promise<DocumentFolder> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { data: folder, error } = await supabase
      .from('document_folders')
      .insert({
        ...data,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return folder;
  },

  async uploadAttachment(documentId: string, databaseId: string, file: File): Promise<string> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    
    const fileName = `${databaseId}/${documentId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('document-attachments')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('document_attachments')
      .insert({
        document_id: documentId,
        database_id: databaseId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      });

    if (dbError) throw dbError;

    const { data: urlData } = supabase.storage
      .from('document-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  },

  // Folder operations
  async updateFolder(id: string, updates: Partial<DocumentFolder>): Promise<DocumentFolder> {
    const { data, error } = await supabase
      .from('document_folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFolder(id: string, deleteContents = false): Promise<void> {
    if (deleteContents) {
      await supabase.from('documents').delete().eq('folder_id', id);
    } else {
      await supabase.from('documents').update({ folder_id: null }).eq('folder_id', id);
    }
    const { error } = await supabase.from('document_folders').delete().eq('id', id);
    if (error) throw error;
  },

  async duplicateFolder(id: string, includeDocs = false): Promise<DocumentFolder> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    
    const { data: original, error: fetchError } = await supabase
      .from('document_folders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data: newFolder, error: folderError } = await supabase
      .from('document_folders')
      .insert({
        database_id: original.database_id,
        parent_folder_id: original.parent_folder_id,
        name: `${original.name} (Copy)`,
        icon: original.icon,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (folderError) throw folderError;
    
    if (includeDocs) {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('folder_id', id);
      
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          await this.createDocument({
            database_id: doc.database_id,
            folder_id: newFolder.id,
            title: doc.title,
            content: doc.content,
            icon: doc.icon,
          });
        }
      }
    }
    
    return newFolder;
  },

  async moveDocumentToFolder(docId: string, folderId: string | null): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ folder_id: folderId })
      .eq('id', docId);
    if (error) throw error;
  },
};
