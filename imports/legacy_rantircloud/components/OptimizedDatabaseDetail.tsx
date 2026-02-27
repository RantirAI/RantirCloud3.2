import React, { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Table2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TableProject {
  id: string;
  name: string;
  description?: string;
  updated_at?: string;
}

interface OptimizedTableListProps {
  tables: TableProject[];
  viewType: "list" | "grid";
  databaseColor: string;
  isLoading: boolean;
  onDeleteTable: (id: string) => void;
}

export const OptimizedTableList = memo<OptimizedTableListProps>(({ 
  tables, 
  viewType, 
  databaseColor, 
  isLoading, 
  onDeleteTable 
}) => {
  const navigate = useNavigate();

  if (viewType === "list") {
    return (
      <div className="ui-compact dashboard-table">
        <Table>
          <TableHeader className="bg-muted/30 border-border">
            <TableRow className="border-b">
              <TableHead className="text-base text-foreground">Name</TableHead>
              <TableHead className="text-base text-foreground">Description</TableHead>
              <TableHead className="text-base text-foreground">Last Updated</TableHead>
              <TableHead className="w-32 text-base text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-background">
            {tables.length > 0 ? tables.map(item => (
              <TableRow key={item.id} className="border-b dark:border-border hover:bg-muted/50 dark:hover:bg-muted/20">
                <TableCell className="font-medium text-base">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center" 
                      style={{ backgroundColor: `${databaseColor}20` }}
                    >
                      <Table2 className="h-3 w-3" style={{ color: databaseColor }} />
                    </div>
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="text-base">{item.description || "-"}</TableCell>
                <TableCell className="text-base">
                  {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tables/${item.id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteTable(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-base">
                  {isLoading ? "Loading..." : "No tables found in this database. Create your first table to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables.length > 0 ? tables.map(item => (
        <div 
          key={item.id} 
          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-background dark:bg-card" 
          onClick={() => navigate(`/tables/${item.id}`)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded flex items-center justify-center" 
                style={{ backgroundColor: `${databaseColor}20` }}
              >
                <Table2 className="h-3 w-3" style={{ color: databaseColor }} />
              </div>
              <h3 className="font-medium text-base">{item.name}</h3>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTable(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {item.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground">
            Updated {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "-"}
          </p>
        </div>
      )) : (
        <div className="col-span-full text-center py-8">
          <p className="text-muted-foreground">
            No tables found in this database. Create your first table to get started.
          </p>
        </div>
      )}
    </div>
  );
});

OptimizedTableList.displayName = 'OptimizedTableList';