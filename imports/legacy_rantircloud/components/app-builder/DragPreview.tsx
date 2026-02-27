
import { ComponentType } from '@/types/appBuilder';
import { Card } from '@/components/ui/card';
import { 
  Square, 
  Columns, 
  Grid3X3, 
  Type, 
  MousePointer, 
  Edit,
  FileText,
  CheckSquare,
  Circle,
  Image,
  CreditCard,
  Table,
  List,
  Navigation
} from 'lucide-react';

interface DragPreviewProps {
  type: ComponentType;
  name: string;
}

const componentIcons = {
  container: Square,
  row: Columns,
  column: Columns,
  grid: Grid3X3,
  text: Type,
  heading: Type,
  button: MousePointer,
  input: Edit,
  textarea: FileText,
  select: List,
  checkbox: CheckSquare,
  radio: Circle,
  image: Image,
  card: CreditCard,
  table: Table,
  datatable: Table,
  list: List,
  navigation: Navigation,
  form: FileText,
  modal: Square,
  tabs: List,
  accordion: List,
  badge: Square,
  alert: Square,
  progress: Square,
  avatar: Circle,
  calendar: Square,
  datepicker: Square,
  fileupload: Square,
  header: Square,
  footer: Square,
  sidebar: Square,
  chart: Square,
  skeleton: Square,
  separator: Square,
  spacer: Square,
};

export function DragPreview({ type, name }: DragPreviewProps) {
  const Icon = componentIcons[type] || Square;

  return (
    <Card className="p-3 bg-primary text-primary-foreground shadow-lg border-primary min-w-[200px]">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{name}</span>
      </div>
    </Card>
  );
}
