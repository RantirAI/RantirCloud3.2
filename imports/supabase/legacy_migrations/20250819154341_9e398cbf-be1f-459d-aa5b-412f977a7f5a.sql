-- Add view_settings column to table_projects table
ALTER TABLE public.table_projects 
ADD COLUMN view_settings jsonb NOT NULL DEFAULT '{
  "table": {
    "type": "table",
    "visibleFields": [],
    "sortField": null,
    "sortDirection": "asc",
    "showRelationships": false
  },
  "gallery": {
    "type": "gallery", 
    "visibleFields": [],
    "sortField": null,
    "sortDirection": "asc",
    "cardsPerRow": 3,
    "showLabels": true,
    "showImages": true,
    "kanbanImageDisplay": "square",
    "showRelationships": false
  },
  "kanban": {
    "type": "kanban",
    "visibleFields": [],
    "sortField": null,
    "sortDirection": "asc",
    "groupByField": null,
    "showTypeIcons": true,
    "showImages": true,
    "kanbanImageDisplay": "square",
    "showRelationships": false
  },
  "form": {
    "type": "form",
    "visibleFields": [],
    "showRelationships": false
  },
  "spreadsheet": {
    "type": "spreadsheet",
    "visibleFields": [],
    "sortField": null,
    "sortDirection": "asc",
    "showRelationships": false
  }
}'::jsonb;