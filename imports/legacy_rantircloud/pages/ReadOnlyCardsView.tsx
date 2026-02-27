import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Mail, Phone, Image, Hash, Check } from "lucide-react";
import { RantirLoader, PoweredByRantir } from "@/components/RantirLoader";
import { useTheme } from "@/hooks/useTheme";

export default function ReadOnlyCardsView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<TableProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId') === 'true';

  useEffect(() => {
    // Apply theme from URL parameter or default to light
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme') || 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeParam);
    
    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('light', 'dark');
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        // Public read access - no auth required
        const data = await tableService.getTableProjectPublic(id);
        
        const defaultSchema = {
          id: data.id,
          name: data.name,
          fields: []
        };
        
        const schema = safeParseJson(data.schema, defaultSchema);
        const records = safeParseJson(data.records, []);
        
        const parsedProject = {
          ...data,
          schema,
          records
        };
        
        setProject(parsedProject);
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <FileText className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'number': return <Hash className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      case 'boolean': return <Check className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (!value && value !== false) return "-";
    
    switch (field.type) {
      case 'boolean':
        return value ? "Yes" : "No";
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'image':
        return value ? <img src={value} alt="" className="w-8 h-8 object-cover rounded" /> : "-";
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RantirLoader size="lg" message="Loading cards..." />
      </div>
    );
  }

  if (!project || !project.records) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2 text-foreground">No Data Available</h2>
              <p className="text-muted-foreground">This table doesn't have any records to display.</p>
            </CardContent>
          </Card>
        </div>
        <PoweredByRantir />
      </div>
    );
  }

  const gallerySettings = project.view_settings?.gallery || {
    cardsPerRow: 3,
    showImages: true,
    showLabels: true,
    showTypeIcons: true
  };

  const titleField = project.schema.fields.find(f => f.type === 'text' || f.type === 'email');
  const imageField = project.schema.fields.find(f => f.type === 'image');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">{project.records.length} records</p>
          </div>

          <div 
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gallerySettings.cardsPerRow || 3}, minmax(0, 1fr))`
            }}
          >
            {project.records.map((record: any, index: number) => (
              <Card key={record.id || index} className="overflow-hidden bg-card border">
                {gallerySettings.showImages && imageField && record[imageField.name] && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={record[imageField.name]} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  {titleField && record[titleField.name] && (
                    <CardTitle className="text-base font-medium truncate text-foreground">
                      {record[titleField.name]}
                    </CardTitle>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-2">
                  {project.schema.fields
                    .filter(field => field.id !== titleField?.id && field.id !== imageField?.id)
                    .slice(0, 4)
                    .map(field => {
                      const value = record[field.name] || record[field.id];
                      if (!value && value !== false) return null;
                      
                      return (
                        <div key={field.id} className="flex items-center gap-2 text-sm">
                          {gallerySettings.showTypeIcons && (
                            <span className="text-muted-foreground flex-shrink-0">
                              {getFieldIcon(field.type)}
                            </span>
                          )}
                          {gallerySettings.showLabels && (
                            <span className="text-muted-foreground font-medium min-w-0 flex-shrink-0">
                              {field.name}:
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {renderFieldValue(field, value)}
                          </span>
                        </div>
                      );
                    })}
                    
                  <div className="text-xs text-muted-foreground pt-2 mt-2 border-t flex justify-between">
                    {showId && <span>ID: {record.id}</span>}
                    <span className={showId ? "" : "ml-auto"}>{new Date(record.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {project.records.length === 0 && (
            <Card className="w-full">
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2 text-foreground">No Records Found</h3>
                <p className="text-muted-foreground">This table doesn't have any data to display yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <PoweredByRantir />
    </div>
  );
}