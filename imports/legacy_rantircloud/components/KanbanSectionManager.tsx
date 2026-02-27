import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface KanbanSection {
  id: string;
  title: string;
  order: number;
}

interface KanbanSectionManagerProps {
  sections: KanbanSection[];
  onSectionsChange: (sections: KanbanSection[]) => void;
}

export function KanbanSectionManager({ sections, onSectionsChange }: KanbanSectionManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<KanbanSection | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSection: KanbanSection = {
      id: `section-${Date.now()}`,
      title: newSectionTitle.trim(),
      order: sections.length
    };
    
    onSectionsChange([...sections, newSection]);
    setNewSectionTitle("");
    setIsDialogOpen(false);
  };

  const handleEditSection = (section: KanbanSection) => {
    setEditingSection(section);
    setNewSectionTitle(section.title);
    setIsDialogOpen(true);
  };

  const handleUpdateSection = () => {
    if (!editingSection || !newSectionTitle.trim()) return;
    
    const updatedSections = sections.map(section =>
      section.id === editingSection.id
        ? { ...section, title: newSectionTitle.trim() }
        : section
    );
    
    onSectionsChange(updatedSections);
    setEditingSection(null);
    setNewSectionTitle("");
    setIsDialogOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm("Are you sure you want to delete this section? All cards in this section will be moved to 'Not Categorized'.")) {
      const updatedSections = sections.filter(section => section.id !== sectionId);
      onSectionsChange(updatedSections);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Kanban Sections</h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setEditingSection(null);
                setNewSectionTitle("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSection ? "Edit Section" : "Add New Section"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="section-title">Section Title</Label>
                <Input
                  id="section-title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Enter section title"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editingSection ? handleUpdateSection() : handleAddSection();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={editingSection ? handleUpdateSection : handleAddSection}
                  disabled={!newSectionTitle.trim()}
                  className="flex-1"
                >
                  {editingSection ? "Update" : "Add"} Section
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <Card key={section.id} className="p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{section.title}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSection(section)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSection(section.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No custom sections. Cards will use field values or "Not Categorized".
          </p>
        )}
      </div>
    </div>
  );
}