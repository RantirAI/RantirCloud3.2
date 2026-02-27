import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService, Document, DocumentFolder } from '@/services/documentService';
import { DocumentEditor } from './DocumentEditor';
import { DocumentListView } from './DocumentListView';
import { toast } from 'sonner';
import { useDatabaseStore } from '@/stores/databaseStore';

interface DocsTabContentProps {
  databaseId: string;
  databaseColor: string;
}

export function DocsTabContent({ databaseId, databaseColor }: DocsTabContentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const selectedDocId = searchParams.get('docId');
  const { documentsRefreshTrigger } = useDatabaseStore();

  useEffect(() => {
    loadDocuments();
  }, [databaseId, documentsRefreshTrigger]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [docs, foldersData] = await Promise.all([
        documentService.getDatabaseDocuments(databaseId),
        documentService.getDatabaseFolders(databaseId)
      ]);
      setDocuments(docs);
      setFolders(foldersData);
    } catch (error: any) {
      toast.error('Failed to load documents: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const newDoc = await documentService.createDocument({
        database_id: databaseId,
        title: 'Untitled',
      });
      await loadDocuments();
      setSearchParams({ tab: 'docs', docId: newDoc.id });
      toast.success('Document created');
    } catch (error: any) {
      toast.error('Failed to create document: ' + error.message);
    }
  };

  const handleSelectDoc = (docId: string) => {
    setSearchParams({ tab: 'docs', docId });
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    
    try {
      await documentService.deleteDocument(docId);
      await loadDocuments();
      if (selectedDocId === docId) {
        setSearchParams({ tab: 'docs' });
      }
      toast.success('Document deleted');
    } catch (error: any) {
      toast.error('Failed to delete document: ' + error.message);
    }
  };

  const handleCreateFolder = async (name: string, icon?: string, parentId?: string) => {
    try {
      await documentService.createFolder({
        database_id: databaseId,
        name,
        icon,
        parent_folder_id: parentId,
      });
      await loadDocuments();
      toast.success('Folder created');
    } catch (error: any) {
      toast.error('Failed to create folder: ' + error.message);
    }
  };

  const handleUpdateFolder = async (id: string, updates: Partial<DocumentFolder>) => {
    try {
      await documentService.updateFolder(id, updates);
      await loadDocuments();
      toast.success('Folder updated');
    } catch (error: any) {
      toast.error('Failed to update folder: ' + error.message);
    }
  };

  const handleDeleteFolder = async (id: string, deleteContents: boolean) => {
    const confirmMsg = deleteContents 
      ? 'Delete this folder and all its documents?' 
      : 'Delete this folder? Documents will be moved to root.';
    if (!confirm(confirmMsg)) return;
    
    try {
      await documentService.deleteFolder(id, deleteContents);
      await loadDocuments();
      toast.success('Folder deleted');
    } catch (error: any) {
      toast.error('Failed to delete folder: ' + error.message);
    }
  };

  const handleDuplicateFolder = async (id: string, includeDocs: boolean) => {
    try {
      await documentService.duplicateFolder(id, includeDocs);
      await loadDocuments();
      toast.success('Folder duplicated');
    } catch (error: any) {
      toast.error('Failed to duplicate folder: ' + error.message);
    }
  };

  const handleDuplicateDoc = async (docId: string) => {
    try {
      const newDoc = await documentService.duplicateDocument(docId);
      await loadDocuments();
      toast.success('Document duplicated');
    } catch (error: any) {
      toast.error('Failed to duplicate document: ' + error.message);
    }
  };

  const handleMoveDocToFolder = async (docId: string, folderId: string | null) => {
    try {
      await documentService.moveDocumentToFolder(docId, folderId);
      await loadDocuments();
      toast.success('Document moved');
    } catch (error: any) {
      toast.error('Failed to move document: ' + error.message);
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Area - Full Width */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedDocId ? (
          <DocumentEditor
            documentId={selectedDocId}
            databaseId={databaseId}
            onDelete={() => handleDeleteDoc(selectedDocId)}
            onUpdate={loadDocuments}
          />
        ) : (
          <DocumentListView
            documents={documents}
            folders={folders}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDoc}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder}
            onDeleteFolder={handleDeleteFolder}
            onDuplicateFolder={handleDuplicateFolder}
            onDuplicateDoc={handleDuplicateDoc}
            onMoveDocToFolder={handleMoveDocToFolder}
            onSelectDoc={handleSelectDoc}
          />
        )}
      </div>
    </div>
  );
}
