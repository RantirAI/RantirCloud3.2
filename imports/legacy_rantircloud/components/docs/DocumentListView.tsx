import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Folder, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Document, DocumentFolder } from '@/services/documentService';
import { formatDistanceToNow } from 'date-fns';
import { CreateFolderDialog } from './CreateFolderDialog';
import { FolderContextMenu } from './FolderContextMenu';
import { DocumentContextMenu } from './DocumentContextMenu';
import { Badge } from '@/components/ui/badge';

interface DocumentListViewProps {
  documents: Document[];
  folders: DocumentFolder[];
  onCreateDocument: () => void;
  onDeleteDocument: (docId: string) => void;
  onCreateFolder: (name: string, icon?: string, parentId?: string) => void;
  onUpdateFolder: (id: string, updates: Partial<DocumentFolder>) => void;
  onDeleteFolder: (id: string, deleteContents: boolean) => void;
  onDuplicateFolder: (id: string, includeDocs: boolean) => void;
  onDuplicateDoc: (docId: string) => void;
  onMoveDocToFolder: (docId: string, folderId: string | null) => void;
  onSelectDoc: (docId: string) => void;
}

export function DocumentListView({ 
  documents, 
  folders,
  onCreateDocument,
  onDeleteDocument,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onDuplicateFolder,
  onDuplicateDoc,
  onMoveDocToFolder,
  onSelectDoc,
}: DocumentListViewProps) {
  const navigate = useNavigate();
  const { id: databaseId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createSubfolderParent, setCreateSubfolderParent] = useState<string | undefined>();
  const [renamingFolder, setRenamingFolder] = useState<DocumentFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleOpenDocument = (docId: string) => {
    navigate(`/databases/${databaseId}/docs/${docId}`);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleRenameFolder = (folder: DocumentFolder) => {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingFolder && renameValue.trim()) {
      onUpdateFolder(renamingFolder.id, { name: renameValue.trim() });
      setRenamingFolder(null);
      setRenameValue('');
    }
  };

  const handleCreateSubfolder = (folder: DocumentFolder) => {
    setCreateSubfolderParent(folder.id);
    setCreateFolderOpen(true);
  };

  const handleCreateFolderComplete = (name: string, icon?: string, parentId?: string) => {
    onCreateFolder(name, icon, parentId);
    setCreateSubfolderParent(undefined);
  };

  // Build folder tree structure
  const buildFolderTree = (parentId: string | null = null): DocumentFolder[] => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFolderDocuments = (folderId: string): Document[] => {
    return documents.filter(doc => doc.folder_id === folderId);
  };

  const getRootDocuments = (): Document[] => {
    return documents.filter(doc => !doc.folder_id);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFolder = (folder: DocumentFolder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderDocs = getFolderDocuments(folder.id);
    const subfolders = buildFolderTree(folder.id);
    const isRenaming = renamingFolder?.id === folder.id;

    return (
      <div key={folder.id} className="space-y-1">
        <div 
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer group"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <button className="p-0 hover:bg-transparent" onClick={(e) => {
            e.stopPropagation();
            toggleFolder(folder.id);
          }}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          {folder.icon && <span className="text-lg">{folder.icon}</span>}
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  setRenamingFolder(null);
                  setRenameValue('');
                }}
                autoFocus
                className="h-7"
              />
            </form>
          ) : (
            <span className="flex-1 font-medium">{folder.name}</span>
          )}
          <Badge variant="secondary" className="text-xs">{folderDocs.length}</Badge>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FolderContextMenu
            folder={folder}
            onRename={handleRenameFolder}
            onCreateSubfolder={handleCreateSubfolder}
            onDuplicate={(f, withDocs) => onDuplicateFolder(f.id, withDocs)}
            onDelete={(f, withDocs) => onDeleteFolder(f.id, withDocs)}
          />
          </div>
        </div>
        
        {isExpanded && (
          <div className="space-y-1">
            {subfolders.map(subfolder => renderFolder(subfolder, level + 1))}
            {folderDocs.map(doc => renderDocument(doc, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderDocument = (doc: Document, level: number = 0) => {
    return (
      <div
        key={doc.id}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer group"
        style={{ paddingLeft: `${level * 16 + 32}px` }}
        onClick={() => handleOpenDocument(doc.id)}
      >
        {doc.icon ? (
          <span className="text-lg">{doc.icon}</span>
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1 truncate">{doc.title || 'Untitled'}</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DocumentContextMenu
            document={doc}
            folders={folders}
            onOpen={(d) => handleOpenDocument(d.id)}
            onDuplicate={(d) => onDuplicateDoc(d.id)}
            onMoveToFolder={(d, folderId) => onMoveDocToFolder(d.id, folderId)}
            onDelete={(d) => onDeleteDocument(d.id)}
          />
        </div>
      </div>
    );
  };

  if (documents.length === 0 && folders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No documents yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first document or folder to get started
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setCreateFolderOpen(true)} variant="outline">
              <Folder className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
            <Button onClick={onCreateDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        </div>
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          onCreateFolder={handleCreateFolderComplete}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateFolderOpen(true)} variant="outline">
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={onCreateDocument}>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {searchQuery ? (
          <>
            {filteredFolders.map(folder => renderFolder(folder))}
            {filteredDocuments.map(doc => renderDocument(doc))}
          </>
        ) : (
          <>
            {buildFolderTree().map(folder => renderFolder(folder))}
            {getRootDocuments().map(doc => renderDocument(doc))}
          </>
        )}
      </div>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) setCreateSubfolderParent(undefined);
        }}
        onCreateFolder={handleCreateFolderComplete}
        parentId={createSubfolderParent}
      />
    </div>
  );
}
