import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeFile {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface NodeFileUploaderProps {
  flowProjectId: string;
  nodeId: string;
  value: KnowledgeFile[];
  onChange: (files: KnowledgeFile[]) => void;
}

const ACCEPTED_TYPES = '.pdf,.txt,.csv,.json,.docx,.md,.html,.xml,.yaml,.yml';
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NodeFileUploader({ flowProjectId, nodeId, value, onChange }: NodeFileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFiles: KnowledgeFile[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} exceeds 20MB limit`);
          continue;
        }

        const fileId = uuidv4();
        const ext = file.name.split('.').pop() || '';
        const storagePath = `${flowProjectId}/${nodeId}/${fileId}.${ext}`;

        const { error } = await supabase.storage
          .from('flow-node-files')
          .upload(storagePath, file, { upsert: true });

        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('flow-node-files')
          .getPublicUrl(storagePath);

        newFiles.push({
          id: fileId,
          name: file.name,
          path: storagePath,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type || ext,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newFiles.length > 0) {
        onChange([...value, ...newFiles]);
        toast.success(`${newFiles.length} file(s) uploaded`);
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: KnowledgeFile) => {
    try {
      await supabase.storage.from('flow-node-files').remove([file.path]);
      onChange(value.filter(f => f.id !== file.id));
      toast.success(`Removed ${file.name}`);
    } catch (err: any) {
      toast.error('Failed to remove file');
    }
  };

  return (
    <div className="border rounded-md mb-4">
      <div className="p-2 bg-muted">
        <Label className="flex items-center text-xs font-medium">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Knowledge Files
        </Label>
      </div>
      <div className="p-3 space-y-3">
        <p className="text-[10px] text-muted-foreground">
          Upload reference documents (PDF, TXT, CSV, JSON, etc.) for the AI agent to use as context.
        </p>

        {/* File list */}
        {value.length > 0 && (
          <div className="space-y-1.5">
            {value.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background text-xs"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 font-medium">{file.name}</span>
                <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => handleDelete(file)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </div>
    </div>
  );
}
