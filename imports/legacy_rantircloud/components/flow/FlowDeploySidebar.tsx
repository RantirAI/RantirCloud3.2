import { FlowDeploymentManager } from './deployment/FlowDeploymentManager';
import { cn } from '@/lib/utils';

interface FlowDeploySidebarProps {
  flowProjectId: string;
  flowName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FlowDeploySidebar({
  flowProjectId,
  flowName,
  isOpen,
  onClose,
}: FlowDeploySidebarProps) {
  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "w-[640px] border-l bg-background flex flex-col h-full overflow-hidden",
        "animate-in slide-in-from-right duration-200"
      )}
    >

      {/* Content */}
      <FlowDeploymentManager
        flowProjectId={flowProjectId}
        flowName={flowName}
        onClose={onClose}
      />
    </div>
  );
}
