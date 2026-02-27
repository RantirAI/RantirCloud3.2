import { supabase } from '@/integrations/supabase/client';
import { activityService } from './activityService';

export interface DriveFile {
  id: string;
  database_id: string;
  folder_id: string | null;
  name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  thumbnail_url: string | null;
  uploaded_by: string;
  shared_with: string[];
  is_public: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DriveFolder {
  id: string;
  database_id: string;
  parent_folder_id: string | null;
  name: string;
  icon: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const driveService = {
  async getDatabaseFiles(databaseId: string, folderId?: string | null): Promise<DriveFile[]> {
    let query = supabase
      .from('drive_files')
      .select('*')
      .eq('database_id', databaseId)
      .order('created_at', { ascending: false });

    if (folderId !== undefined) {
      if (folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getFolders(databaseId: string): Promise<DriveFolder[]> {
    const { data, error } = await supabase
      .from('drive_folders')
      .select('*')
      .eq('database_id', databaseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createFolder(databaseId: string, name: string, icon = 'folder', color = '#3B82F6'): Promise<DriveFolder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('drive_folders')
      .insert({
        database_id: databaseId,
        name,
        icon,
        color,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await activityService.logActivity({
      type: 'folder_created',
      description: `Created folder: ${name}`,
      resourceType: 'drive_folder',
      resourceId: data.id,
      resourceName: name,
      metadata: { databaseId }
    });

    return data;
  },

  async uploadFile(
    databaseId: string,
    file: File,
    folderId?: string | null
  ): Promise<DriveFile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${databaseId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('database-drive-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('database-drive-files')
      .getPublicUrl(filePath);

    // Save metadata
    const { data, error } = await supabase
      .from('drive_files')
      .insert({
        database_id: databaseId,
        folder_id: folderId || null,
        name: file.name,
        file_type: fileExt || 'unknown',
        file_path: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await activityService.logActivity({
      type: 'file_uploaded',
      description: `Uploaded file: ${file.name}`,
      resourceType: 'drive_file',
      resourceId: data.id,
      resourceName: file.name,
      metadata: { databaseId, fileSize: file.size, fileType: file.type }
    });

    return data;
  },

  async deleteFile(fileId: string): Promise<void> {
    // Get file info first
    const { data: file, error: fetchError } = await supabase
      .from('drive_files')
      .select('file_path')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;

    // Extract path from URL
    const url = new URL(file.file_path);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // database_id/filename

    // Delete from storage
    await supabase.storage
      .from('database-drive-files')
      .remove([filePath]);

    // Delete metadata
    const { error } = await supabase
      .from('drive_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;

    // Log activity
    await activityService.logActivity({
      type: 'file_deleted',
      description: `Deleted file`,
      resourceType: 'drive_file',
      resourceId: fileId,
      metadata: { filePath: file.file_path }
    });
  },

  async deleteFolder(folderId: string): Promise<void> {
    const { error } = await supabase
      .from('drive_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;
  },

  async shareFile(fileId: string, userIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('drive_files')
      .update({ shared_with: userIds })
      .eq('id', fileId);

    if (error) throw error;

    // Log activity
    await activityService.logActivity({
      type: 'file_shared',
      description: `Shared file with ${userIds.length} user(s)`,
      resourceType: 'drive_file',
      resourceId: fileId,
      metadata: { sharedWith: userIds }
    });
  },

  async moveFile(fileId: string, targetFolderId: string | null): Promise<void> {
    const { error } = await supabase
      .from('drive_files')
      .update({ folder_id: targetFolderId })
      .eq('id', fileId);

    if (error) throw error;
  },

  async searchFiles(databaseId: string, query: string): Promise<DriveFile[]> {
    const { data, error } = await supabase
      .from('drive_files')
      .select('*')
      .eq('database_id', databaseId)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getFileCount(databaseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('drive_files')
      .select('*', { count: 'exact', head: true })
      .eq('database_id', databaseId);

    if (error) throw error;
    return count || 0;
  },

  async getAllUserFiles(userId: string, limit = 50): Promise<DriveFile[]> {
    const { data, error } = await supabase
      .from('drive_files')
      .select('*')
      .eq('uploaded_by', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async searchAllFiles(userId: string, query: string): Promise<DriveFile[]> {
    const { data, error } = await supabase
      .from('drive_files')
      .select('*')
      .eq('uploaded_by', userId)
      .ilike('name', `%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  async updateFileMetadata(fileId: string, metadata: { altText?: string; description?: string }): Promise<void> {
    // First get existing metadata
    const { data: file, error: fetchError } = await supabase
      .from('drive_files')
      .select('metadata')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;

    const existingMetadata = (file?.metadata as any) || {};
    const newMetadata = {
      ...existingMetadata,
      ...metadata,
    };

    const { error } = await supabase
      .from('drive_files')
      .update({ metadata: newMetadata })
      .eq('id', fileId);

    if (error) throw error;
  },

  async getFileById(fileId: string): Promise<DriveFile | null> {
    const { data, error } = await supabase
      .from('drive_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
};
