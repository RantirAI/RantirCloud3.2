import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { flowService } from '@/services/flowService';

interface EditableFlowNameProps {
  initialName: string;
  flowId: string;
  onUpdate?: (newName: string) => void;
  className?: string;
}

export function EditableFlowName({ initialName, flowId, onUpdate, className = "" }: EditableFlowNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim() === initialName || !name.trim()) {
      setName(initialName);
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await flowService.updateFlowProject(flowId, { name: name.trim() });
      onUpdate?.(name.trim());
      setIsEditing(false);
      toast.success('Flow name updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update flow name');
      setName(initialName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setName(initialName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyPress}
        className={`${className} font-semibold`}
        disabled={isSaving}
        autoFocus
      />
    );
  }

  return (
    <span 
      className={`${className} cursor-pointer hover:text-primary font-semibold`}
      onClick={() => setIsEditing(true)}
    >
      {name}
    </span>
  );
}