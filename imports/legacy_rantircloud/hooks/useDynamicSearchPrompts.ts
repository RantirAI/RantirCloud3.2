import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  id: string;
  name: string;
  type: 'database' | 'flow' | 'app';
}

interface DynamicPrompt {
  label: string;
  fullPrompt: string;
}

const fallbackPrompts: DynamicPrompt[] = [
  { label: 'Build a report for your database', fullPrompt: 'Build a comprehensive report for your database' },
  { label: 'Create a logic workflow', fullPrompt: 'Create a logic workflow to automate your tasks' },
  { label: 'Design a website landing page', fullPrompt: 'Design a modern website landing page' },
  { label: 'Query your data tables', fullPrompt: 'Query your data tables for insights' },
  { label: 'Search your integrations', fullPrompt: 'Search your workflows based on your integrations' },
];

const promptTemplates = {
  database: [
    { template: (name: string) => `Build a report for ${name}`, label: (name: string) => `Report for ${name}` },
    { template: (name: string) => `Query ${name} database`, label: (name: string) => `Query ${name}` },
    { template: (name: string) => `Analyze data in ${name}`, label: (name: string) => `Analyze ${name}` },
  ],
  flow: [
    { template: (name: string) => `Search workflows in ${name}`, label: (name: string) => `Search ${name}` },
    { template: (name: string) => `Optimize ${name} flow`, label: (name: string) => `Optimize ${name}` },
    { template: (name: string) => `Extend ${name} integrations`, label: (name: string) => `Extend ${name}` },
  ],
  app: [
    { template: (name: string) => `Update ${name} design`, label: (name: string) => `Update ${name}` },
    { template: (name: string) => `Add features to ${name}`, label: (name: string) => `Enhance ${name}` },
    { template: (name: string) => `Analyze ${name} app`, label: (name: string) => `Analyze ${name}` },
  ],
};

export function useDynamicSearchPrompts() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadProjects = async () => {
      try {
        const [dbRes, flowRes, appRes] = await Promise.all([
          supabase.from('databases').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
          supabase.from('flow_projects').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
          supabase.from('app_projects').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        ]);

        const allProjects: Project[] = [
          ...(dbRes.data || []).map(p => ({ ...p, type: 'database' as const })),
          ...(flowRes.data || []).map(p => ({ ...p, type: 'flow' as const })),
          ...(appRes.data || []).map(p => ({ ...p, type: 'app' as const })),
        ];

        setProjects(allProjects);
      } catch (error) {
        console.error('Failed to load projects for prompts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  const dynamicPrompts = useMemo((): DynamicPrompt[] => {
    if (projects.length === 0) {
      return fallbackPrompts;
    }

    const generatedPrompts: DynamicPrompt[] = [];
    const usedProjectIds = new Set<string>();

    // Generate prompts from actual projects
    for (const project of projects) {
      if (generatedPrompts.length >= 5) break;
      if (usedProjectIds.has(project.id)) continue;

      const templates = promptTemplates[project.type];
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      generatedPrompts.push({
        label: template.label(project.name),
        fullPrompt: template.template(project.name),
      });
      usedProjectIds.add(project.id);
    }

    // If we don't have enough prompts, add some generic ones
    if (generatedPrompts.length < 5) {
      const genericPrompts: DynamicPrompt[] = [
        { label: 'Search your integrations', fullPrompt: 'Search your workflows based on your integrations' },
        { label: 'Query your databases', fullPrompt: 'Query your databases for insights' },
        { label: 'Analyze your workflows', fullPrompt: 'Analyze your workflows for optimization opportunities' },
      ];
      
      for (const gp of genericPrompts) {
        if (generatedPrompts.length >= 5) break;
        if (!generatedPrompts.some(p => p.label === gp.label)) {
          generatedPrompts.push(gp);
        }
      }
    }

    return generatedPrompts.slice(0, 5);
  }, [projects]);

  return { dynamicPrompts, isLoading, hasProjects: projects.length > 0 };
}
