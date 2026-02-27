import { DragOverlay } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GripVertical, Package, Layout, Type, Square, Image, Table, Calendar } from 'lucide-react';

interface DragPreviewOverlayProps {
  activeDragItem: any;
}

const componentIcons = {
  container: Layout,
  row: Layout,
  column: Layout,
  grid: Layout,
  text: Type,
  heading: Type,
  button: Square,
  input: Type,
  textarea: Type,
  card: Package,
  image: Image,
  table: Table,
  calendar: Calendar,
  default: Package
};

export function DragPreviewOverlay({ activeDragItem }: DragPreviewOverlayProps) {
  // Disabled to prevent obstruction of drop indicators
  return null;
}