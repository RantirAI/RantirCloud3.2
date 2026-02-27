import { useEffect, useRef, useState, useCallback } from 'react';
import { documentService } from '@/services/documentService';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface AutosaveOptions {
  documentId: string;
  delay?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
}

export function useDocumentAutosave({
  documentId,
  delay = 2000,
  onSave,
  onError,
}: AutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveQueueRef = useRef<any>(null);

  const saveDocument = useCallback(async (updates: any) => {
    try {
      setIsSaving(true);
      await documentService.updateDocument(documentId, updates);
      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.();
    } catch (error: any) {
      toast.error('Failed to save document: ' + error.message);
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, onSave, onError]);

  const debouncedSave = useRef(
    debounce((updates: any) => saveDocument(updates), delay)
  ).current;

  const queueSave = useCallback((updates: any) => {
    setIsDirty(true);
    saveQueueRef.current = updates;
    debouncedSave(updates);
  }, [debouncedSave]);

  const forceSave = useCallback(async () => {
    if (saveQueueRef.current) {
      debouncedSave.cancel();
      await saveDocument(saveQueueRef.current);
      saveQueueRef.current = null;
    }
  }, [saveDocument, debouncedSave]);

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    queueSave,
    forceSave,
    isSaving,
    lastSaved,
    isDirty,
  };
}
