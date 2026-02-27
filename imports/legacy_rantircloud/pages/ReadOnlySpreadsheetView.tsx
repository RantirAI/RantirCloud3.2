import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { tableService, TableProject, safeParseJson } from "@/services/tableService";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SchemaTypeIcon } from "@/components/SchemaTypeIcon";
import { RantirLoader, PoweredByRantir } from "@/components/RantirLoader";
import { useTheme } from "@/hooks/useTheme";

export default function ReadOnlySpreadsheetView() {
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
        console.error("Failed to load spreadsheet:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

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
        <RantirLoader size="lg" message="Loading spreadsheet..." />
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">{project.records.length} records</p>
          </div>

          <Card className="bg-card border">
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b">
                      {showId && <TableHead className="font-medium text-foreground text-xs">ID</TableHead>}
                      {project.schema.fields.map((field) => (
                        <TableHead key={field.id} className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <SchemaTypeIcon type={field.type} size={16} />
                            <span>{field.name}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.records.map((record: any, index: number) => (
                      <TableRow 
                        key={record.id || index} 
                        className="hover:bg-muted/50 border-b border-border/50"
                      >
                        {showId && (
                          <TableCell className="text-xs text-muted-foreground font-mono py-3">
                            {record.id}
                          </TableCell>
                        )}
                        {project.schema.fields.map((field) => (
                          <TableCell key={field.id} className="py-3 text-foreground">
                            {renderFieldValue(field, record[field.name] || record[field.id])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <PoweredByRantir />
    </div>
  );
}