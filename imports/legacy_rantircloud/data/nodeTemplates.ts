
import React from 'react';
import { MessageSquare, Image, Video, Database, Globe, Clock } from "lucide-react";

export const nodeCategories = [
  { id: "all", label: "All" },
  { id: "generate", label: "Generate with AI", icon: "✨" },
  { id: "data", label: "Data", icon: "🗄️" },
  { id: "integration", label: "Integration", icon: "🔗" },
  { id: "flow", label: "Flow Control", icon: "🔄" },
];

export interface NodeAction {
  id: string;
  name: string;
  description: string;
}

export interface NodeTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  actions: NodeAction[];
  disabled?: boolean;
  comingSoon?: boolean;
}

// Converting from JSX to a function that returns JSX
export const getNodeIcon = (nodeId: string, size = 4) => {
  const className = `w-${size} h-${size}`;
  switch (nodeId.toLowerCase()) {
    case 'message': return React.createElement(MessageSquare, { className });
    case 'image': return React.createElement(Image, { className });
    case 'video': return React.createElement(Video, { className });
    case 'http': return React.createElement(Globe, { className });
    case 'wait': return React.createElement(Clock, { className });
    case 'generate-data':
    case 'get-record':
    case 'insert-record':
    case 'update-record':
    case 'delete-record':
    case 'find-records':
      return React.createElement(Database, { className });
    default: return null;
  }
};

export const botpressNodes: NodeTemplate[] = [
  { 
    id: "message", 
    name: "Generate a Message", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "generate",
    description: "Add text content to your chatbot",
    actions: [
      {
        id: "send-text",
        name: "Send Text",
        description: "Send a text message to the user",
      },
      {
        id: "ask-question",
        name: "Ask a Question",
        description: "Ask the user a question and wait for response",
      }
    ],
  },
  { 
    id: "image", 
    name: "Generate an Image", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "generate",
    description: "Display an image in the conversation",
    actions: [
      {
        id: "send-image",
        name: "Send Image",
        description: "Send an image to the user",
      },
      {
        id: "show-gallery",
        name: "Show Gallery",
        description: "Display a gallery of images",
      }
    ],
  },
  { 
    id: "video", 
    name: "Generate a Video", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "generate",
    description: "Rich media card with image, title, and buttons",
    disabled: true,
    comingSoon: true,
    actions: [
      {
        id: "send-video",
        name: "Send Video",
        description: "Send a video to the user",
      }
    ],
  },
  { 
    id: "generate-data", 
    name: "Generate Data with AI", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Use AI to generate data for your tables",
    actions: [
      {
        id: "generate-data",
        name: "Generate Data",
        description: "Generate data for your tables with AI",
      }
    ],
  },
  { 
    id: "get-record", 
    name: "Get Record", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Retrieve a single record from your tables",
    actions: [
      {
        id: "get-record",
        name: "Get Record",
        description: "Retrieve a single record by ID",
      }
    ],
  },
  { 
    id: "insert-record", 
    name: "Insert Record", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Insert a new record into your tables",
    actions: [
      {
        id: "insert-record",
        name: "Insert Record",
        description: "Insert a new record into the table",
      }
    ],
  },
  { 
    id: "update-record", 
    name: "Update Record", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Update an existing record in your tables",
    actions: [
      {
        id: "update-record",
        name: "Update Record",
        description: "Update an existing record by ID",
      }
    ],
  },
  { 
    id: "delete-record", 
    name: "Delete Record", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Delete a record from your tables",
    actions: [
      {
        id: "delete-record",
        name: "Delete Record",
        description: "Delete a record by ID",
      }
    ],
  },
  { 
    id: "find-records", 
    name: "Find Records", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "data",
    description: "Search for multiple records in your tables",
    actions: [
      {
        id: "find-records",
        name: "Find Records",
        description: "Search for records with filters",
      }
    ],
  },
  { 
    id: "http", 
    name: "HTTP Request", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "integration",
    description: "Call external API endpoints",
    actions: [
      {
        id: "get-request",
        name: "GET Request",
        description: "Make a GET HTTP request",
      },
      {
        id: "post-request",
        name: "POST Request",
        description: "Make a POST HTTP request",
      },
      {
        id: "put-request",
        name: "PUT Request",
        description: "Make a PUT HTTP request",
      }
    ],
  },
  { 
    id: "wait", 
    name: "Wait", 
    icon: "https://cdn.botpress.cloud/botpress-icon.png", 
    category: "flow",
    description: "Wait for a duration or until a specific time",
    actions: [
      {
        id: "wait-time",
        name: "Wait for Time",
        description: "Wait for a specific duration",
      },
      {
        id: "wait-until",
        name: "Wait Until",
        description: "Wait until a specific date/time",
      }
    ],
  }
];
