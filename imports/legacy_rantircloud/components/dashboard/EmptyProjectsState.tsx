import React from 'react';
import yourProjectIcon from '@/assets/icons/your-project-icon.svg';

export function EmptyProjectsState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <img 
        src={yourProjectIcon} 
        alt="Your Project" 
        className="w-32 h-auto opacity-60 mb-3"
      />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium mb-2">
        Create a Project with AI
      </p>
      <p className="text-xs text-muted-foreground/50 text-center max-w-[180px]">
        Use the AI assistant to create your first project
      </p>
    </div>
  );
}
