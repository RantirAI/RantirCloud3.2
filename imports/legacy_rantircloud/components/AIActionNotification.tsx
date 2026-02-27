import { Button } from '@/components/ui/button';
import { Loader2, FileText, Table, ExternalLink, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIActionNotificationProps {
  status: string;
  isProcessing: boolean;
  createdResource?: {
    type: 'document' | 'table';
    id: string;
    name: string;
  } | null;
  onNavigate?: () => void;
}

export function AIActionNotification({ 
  status, 
  isProcessing, 
  createdResource, 
  onNavigate 
}: AIActionNotificationProps) {
  if (!isProcessing && !createdResource) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      isProcessing 
        ? "bg-primary/5 border-primary/20" 
        : "bg-green-500/10 border-green-500/20"
    )}>
      {isProcessing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary">{status}</span>
        </>
      ) : createdResource && (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div className="flex-1 flex items-center gap-2">
            {createdResource.type === 'document' ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Table className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {createdResource.type === 'document' ? 'Document' : 'Table'} "{createdResource.name}" created
            </span>
          </div>
          {onNavigate && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNavigate}
              className="gap-1"
            >
              Open
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
