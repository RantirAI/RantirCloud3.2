import React from 'react';
import { cn } from '@/lib/utils';
import { ProjectCategory } from './ProjectCategoryCards';
import { LayoutTemplate, FileText, Presentation, Store, Workflow, GitBranch, RefreshCw, Zap, Database, BookOpen, Table, FolderOpen } from 'lucide-react';

interface CategoryPromptSuggestionsProps {
  category: ProjectCategory;
  onSelectPrompt: (prompt: string) => void;
}

const promptsByCategory: Record<string, { icon: React.ElementType; title: string; prompt: string }[]> = {
  website: [
    {
      icon: LayoutTemplate,
      title: 'Modern Landing Page',
      prompt: 'Build a modern SaaS landing page with hero section, feature grid, pricing table, testimonials carousel, and a contact form. Use a clean minimal design with gradient accents and smooth scroll animations.',
    },
    {
      icon: Presentation,
      title: 'Pitch Deck Presentation',
      prompt: 'Create a professional investor pitch deck presentation with 12 slides including problem/solution, market size, business model, traction metrics, team profiles, and funding ask. Use bold typography and data visualizations.',
    },
    {
      icon: Store,
      title: 'E-commerce Product Page',
      prompt: 'Design a product detail page for an e-commerce store with image gallery, variant selector, add to cart button, product description tabs, related products, and customer reviews section.',
    },
    {
      icon: FileText,
      title: 'Portfolio Website',
      prompt: 'Build a creative portfolio website for a designer with project showcase grid, about section, skills display, client testimonials, and a contact form. Include smooth page transitions and hover effects.',
    },
  ],
  workflow: [
    {
      icon: Workflow,
      title: 'Lead Qualification Flow',
      prompt: 'Create an automated lead qualification workflow that captures form submissions, enriches contact data via API, scores leads based on criteria, and routes high-value leads to the sales team via Slack notification.',
    },
    {
      icon: GitBranch,
      title: 'Content Approval Pipeline',
      prompt: 'Build a content approval workflow where new blog posts trigger a review process, send to editors for approval, auto-publish on approval, or notify writers of required changes.',
    },
    {
      icon: RefreshCw,
      title: 'Data Sync Automation',
      prompt: 'Create a scheduled data synchronization flow that pulls records from an external API every hour, transforms the data, updates the database, and logs any errors to a monitoring dashboard.',
    },
    {
      icon: Zap,
      title: 'Customer Onboarding Sequence',
      prompt: 'Design an automated customer onboarding workflow that triggers on new signup, sends a welcome email, schedules follow-up reminders, tracks engagement metrics, and alerts success team for at-risk accounts.',
    },
  ],
  database: [
    {
      icon: Database,
      title: 'CRM Database',
      prompt: 'Create a CRM database with tables for contacts, companies, deals, and activities. Include relationship linking, deal stage tracking, and activity logging. Add views for pipeline management and contact lookup.',
    },
    {
      icon: BookOpen,
      title: 'Research Document Hub',
      prompt: 'Build a research documentation system with organized folders, rich text documents, tagging system, and version history. Include templates for research notes, meeting summaries, and project briefs.',
    },
    {
      icon: Table,
      title: 'Inventory Tracker',
      prompt: 'Design an inventory management database with products, categories, suppliers, and stock levels. Include low stock alerts, order tracking, and reports for stock valuation and turnover analysis.',
    },
    {
      icon: FolderOpen,
      title: 'Project Management Hub',
      prompt: 'Create a project management database with projects, tasks, milestones, and team members. Include Kanban views, timeline tracking, workload distribution, and progress reporting dashboards.',
    },
  ],
};

export function CategoryPromptSuggestions({ category, onSelectPrompt }: CategoryPromptSuggestionsProps) {
  if (!category) return null;
  
  const prompts = promptsByCategory[category] || [];
  
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Prompt Templates
      </h3>
      <div className="space-y-1.5">
        {prompts.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className={cn(
                "w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors",
                "hover:bg-muted/60 border border-transparent hover:border-border"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
                category === 'website' && "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
                category === 'workflow' && "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
                category === 'database' && "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
              )}>
                <IconComponent className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.prompt}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
