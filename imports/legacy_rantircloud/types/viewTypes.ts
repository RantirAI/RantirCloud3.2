
// Define shared view types used across components
export type ViewType = "table" | "gallery" | "kanban" | "form" | "spreadsheet";

export interface ViewSettings {
  type: ViewType;
  visibleFields: string[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
  groupByField?: string;
  cardsPerRow?: number;
  showLabels?: boolean;
  showTypeIcons?: boolean; // For Kanban
  showImages?: boolean; // For Kanban
  kanbanImageDisplay?: "cover" | "square"; // For Kanban, image display style
  showRelationships?: boolean; // NEW: For displaying relationships
}
