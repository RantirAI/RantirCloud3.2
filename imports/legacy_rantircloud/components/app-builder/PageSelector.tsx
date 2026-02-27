import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface PageSelectorProps {
  value?: string;
  onValueChange: (pageId: string) => void;
  placeholder?: string;
}

export function PageSelector({ value, onValueChange, placeholder = "Select a page" }: PageSelectorProps) {
  const { currentProject } = useAppBuilderStore();

  if (!currentProject) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No project loaded" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currentProject.pages.map((page) => (
          <SelectItem key={page.id} value={page.id}>
            <div className="flex items-center justify-between w-full">
              <span>{page.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{page.route}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}