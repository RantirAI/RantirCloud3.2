import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/compact/Button';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ColorPicker';
import { cn } from '@/lib/utils';
import { Puzzle } from 'lucide-react';
import websitesIcon from '@/assets/icons/websites-avatars-4.svg';
import integrationsIcon from '@/assets/icons/integrations-4.svg';
import dataIcon from '@/assets/icons/data-4.svg';

export type NewProjectType = 'website' | 'flow' | 'database';

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (type: NewProjectType, name: string, color: string, description: string) => void;
  onOpenPlugins?: () => void;
}

const projectTypes = [
  {
    id: 'website' as const,
    title: 'Website or Presentation',
    description: 'Create landing pages, apps, and visual presentations',
    icon: websitesIcon,
  },
  {
    id: 'flow' as const,
    title: 'Logic Flow',
    description: 'Automate tasks with visual flow builders',
    icon: integrationsIcon,
  },
  {
    id: 'database' as const,
    title: 'Document or Database',
    description: 'Organize data, create docs, and manage content',
    icon: dataIcon,
  },
];

export function NewProjectModal({ open, onOpenChange, onCreateProject, onOpenPlugins }: NewProjectModalProps) {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<NewProjectType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const handleSelectType = (type: NewProjectType) => {
    setSelectedType(type);
    setStep('details');
  };

  const handleCreate = () => {
    if (!selectedType || !name.trim()) return;
    onCreateProject(selectedType, name.trim(), color, description.trim());
    handleReset();
  };

  const handleReset = () => {
    setStep('type');
    setSelectedType(null);
    setName('');
    setDescription('');
    setColor('#3B82F6');
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
    setName('');
    setDescription('');
  };

  const selectedTypeInfo = projectTypes.find(t => t.id === selectedType);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {step === 'type' ? 'Create New Project' : `New ${selectedTypeInfo?.title}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 'type'
              ? 'Choose what kind of project you want to build'
              : 'Give your project a name and customize it'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="grid gap-3 px-6 py-4">
            {projectTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 border-border transition-all duration-200",
                  "hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm",
                  "text-left"
                )}
              >
                <img
                  src={type.icon}
                  alt=""
                  className="w-12 h-10 object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{type.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-xs">Project Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`My ${selectedTypeInfo?.title || 'Project'}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) handleCreate();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description" className="text-xs">Description (optional)</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this project about?"
                className="min-h-[60px] text-xs resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'details' && (
            <Button variant="ghost" onClick={handleBack} className="mr-auto">
              Back
            </Button>
          )}
          {onOpenPlugins && (
            <Button variant="ghost" onClick={() => { handleReset(); onOpenPlugins(); }} className="gap-1.5">
              <Puzzle className="h-3.5 w-3.5" />
              Add Plugins
            </Button>
          )}
          <Button variant="outline" onClick={handleReset}>
            Cancel
          </Button>
          {step === 'details' && (
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Create Project
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
