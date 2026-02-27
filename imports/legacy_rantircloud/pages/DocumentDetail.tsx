import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, ArrowLeft, Save, Trash2, Clock } from "lucide-react";
import { ExploreSidebar } from "@/components/ExploreSidebar";
import { documentService, Document } from "@/services/documentService";
import { databaseService, DatabaseProject } from "@/services/databaseService";
import { toast } from "@/components/ui/sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { FileText } from "lucide-react";
import { DocumentEditor } from "@/components/docs/DocumentEditor";

export default function DocumentDetail() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const [database, setDatabase] = useState<DatabaseProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id || !docId || !user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch document and database in parallel
      const [docData, databaseData] = await Promise.all([
        documentService.getDocument(docId),
        databaseService.getDatabase(id)
      ]);
      
      setDocument(docData);
      setDatabase(databaseData);
    } catch (error: any) {
      console.error('DocumentDetail fetchData - error:', error);
      toast.error(error.message || "Failed to load document");
      navigate(`/databases/${id}`);
    } finally {
      setIsLoading(false);
    }
  }, [id, docId, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleDelete = async () => {
    if (!docId || !id) return;
    
    try {
      await documentService.deleteDocument(docId);
      toast.success("Document deleted");
      navigate(`/databases/${id}?tab=docs`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <WhirlpoolLoader size="lg" icon={<FileText className="h-7 w-7" />} message="Loading document..." />
      </div>
    );
  }

  if (!document || !database) {
    return <div className="p-8">Document not found</div>;
  }

  const databaseColor = database?.color || '#3B82F6';

  return (
    <div className="flex h-full bg-background">
      
      {/* Explore Sidebar */}
      <ExploreSidebar 
        collapsed={sidebarCollapsed}
        className="flex-shrink-0"
        currentDatabaseId={database?.id}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Header */}
        <div className="border-b" style={{
          backgroundColor: `${databaseColor}1A`
        }}>
          <div className="px-6 py-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="h-8 w-8 p-0 focus:outline-none focus:ring-0">
                  <Menu className="h-4 w-4" />
                </Button>
                
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate("/databases")} className="cursor-pointer hover:text-foreground">
                        Databases
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate(`/databases/${database.id}`)} className="cursor-pointer hover:text-foreground">
                        {database.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate(`/databases/${database.id}?tab=docs`)} className="cursor-pointer hover:text-foreground">
                        Documents
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <span className="font-bold text-foreground">{document.title}</span>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </div>
        </div>

        {/* Document Editor - Full Width */}
        <div className="flex-1 overflow-hidden">
          <DocumentEditor
            documentId={docId!}
            databaseId={id!}
            onDelete={handleDelete}
            onUpdate={fetchData}
          />
        </div>
      </div>
    </div>
  );
}
