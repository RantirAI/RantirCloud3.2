import {
  Image,
  Video,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Archive,
  Music,
  Film,
  Code,
  FileJson,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

export interface FileTypeInfo {
  icon: LucideIcon;
  color: string;
  category: string;
}

const fileTypeMap: Record<string, FileTypeInfo> = {
  // Images
  png: { icon: Image, color: '#10B981', category: 'Images' },
  jpg: { icon: Image, color: '#10B981', category: 'Images' },
  jpeg: { icon: Image, color: '#10B981', category: 'Images' },
  gif: { icon: Image, color: '#10B981', category: 'Images' },
  svg: { icon: Image, color: '#10B981', category: 'Images' },
  webp: { icon: Image, color: '#10B981', category: 'Images' },
  bmp: { icon: Image, color: '#10B981', category: 'Images' },
  ico: { icon: Image, color: '#10B981', category: 'Images' },
  tiff: { icon: Image, color: '#10B981', category: 'Images' },

  // Videos
  mp4: { icon: Video, color: '#8B5CF6', category: 'Videos' },
  mov: { icon: Film, color: '#8B5CF6', category: 'Videos' },
  avi: { icon: Video, color: '#8B5CF6', category: 'Videos' },
  wmv: { icon: Video, color: '#8B5CF6', category: 'Videos' },
  flv: { icon: Video, color: '#8B5CF6', category: 'Videos' },
  webm: { icon: Video, color: '#8B5CF6', category: 'Videos' },
  mkv: { icon: Video, color: '#8B5CF6', category: 'Videos' },

  // Documents
  pdf: { icon: FileText, color: '#EF4444', category: 'Documents' },
  doc: { icon: FileText, color: '#3B82F6', category: 'Documents' },
  docx: { icon: FileText, color: '#3B82F6', category: 'Documents' },
  txt: { icon: FileText, color: '#6B7280', category: 'Documents' },
  rtf: { icon: FileText, color: '#6B7280', category: 'Documents' },

  // Spreadsheets
  xls: { icon: FileSpreadsheet, color: '#10B981', category: 'Spreadsheets' },
  xlsx: { icon: FileSpreadsheet, color: '#10B981', category: 'Spreadsheets' },
  csv: { icon: FileSpreadsheet, color: '#10B981', category: 'Spreadsheets' },
  
  // Presentations
  ppt: { icon: Presentation, color: '#F97316', category: 'Presentations' },
  pptx: { icon: Presentation, color: '#F97316', category: 'Presentations' },

  // Data/Code
  json: { icon: FileJson, color: '#FBBF24', category: 'Data' },
  xml: { icon: Code, color: '#EC4899', category: 'Data' },
  yaml: { icon: Code, color: '#8B5CF6', category: 'Data' },
  yml: { icon: Code, color: '#8B5CF6', category: 'Data' },
  
  // Code files
  js: { icon: FileCode, color: '#FBBF24', category: 'Code' },
  ts: { icon: FileCode, color: '#3B82F6', category: 'Code' },
  jsx: { icon: FileCode, color: '#06B6D4', category: 'Code' },
  tsx: { icon: FileCode, color: '#06B6D4', category: 'Code' },
  html: { icon: FileCode, color: '#F97316', category: 'Code' },
  css: { icon: FileCode, color: '#3B82F6', category: 'Code' },
  py: { icon: FileCode, color: '#3B82F6', category: 'Code' },
  java: { icon: FileCode, color: '#EF4444', category: 'Code' },
  cpp: { icon: FileCode, color: '#6B7280', category: 'Code' },
  c: { icon: FileCode, color: '#6B7280', category: 'Code' },
  php: { icon: FileCode, color: '#8B5CF6', category: 'Code' },
  rb: { icon: FileCode, color: '#EF4444', category: 'Code' },
  go: { icon: FileCode, color: '#06B6D4', category: 'Code' },
  rs: { icon: FileCode, color: '#F97316', category: 'Code' },

  // Archives
  zip: { icon: Archive, color: '#6B7280', category: 'Archives' },
  rar: { icon: Archive, color: '#6B7280', category: 'Archives' },
  '7z': { icon: Archive, color: '#6B7280', category: 'Archives' },
  tar: { icon: Archive, color: '#6B7280', category: 'Archives' },
  gz: { icon: Archive, color: '#6B7280', category: 'Archives' },

  // Audio
  mp3: { icon: Music, color: '#EC4899', category: 'Audio' },
  wav: { icon: Music, color: '#EC4899', category: 'Audio' },
  ogg: { icon: Music, color: '#EC4899', category: 'Audio' },
  m4a: { icon: Music, color: '#EC4899', category: 'Audio' },
  flac: { icon: Music, color: '#EC4899', category: 'Audio' },

  // Lottie/Animation
  lottie: { icon: Film, color: '#F97316', category: 'Animation' },
};

export function getFileTypeInfo(fileName: string): FileTypeInfo {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return fileTypeMap[extension] || {
    icon: File,
    color: '#6B7280',
    category: 'Other',
  };
}

export function getFileCategories(): string[] {
  const categories = new Set(Object.values(fileTypeMap).map(info => info.category));
  return Array.from(categories).sort();
}
