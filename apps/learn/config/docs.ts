import { SidebarNavGroup } from 'types/nav'

export const courses: SidebarNavGroup = {
  title: 'Courses',
  items: [
    {
      title: 'Foundations',
      href: '/foundations',
      items: [
        {
          title: 'Introduction',
          href: '/foundations/introduction',
        },
        {
          title: 'Architecture and Platform Fundamentals',
          items: [
            {
              title: 'Supabase Architecture',
              href: '/foundations/01-01-supabase-architecture',
            },
            {
              title: 'When to Choose Supabase',
              href: '/foundations/01-02-when-to-choose-supabase',
            },
            {
              title: 'Project Setup and Configuration',
              href: '/foundations/01-03-project-setup-and-configuration',
            },
            {
              title: 'Local Development Workflow',
              href: '/foundations/01-04-local-development-workflow',
            },
          ],
        },
        {
          title: 'Database Design and Postgres Essentials',
          items: [
            {
              title: 'Schema Design for Supabase',
              href: '/foundations/02-01-schema-design-for-supabase',
            },
            {
              title: 'Essential Postgres Data Types',
              href: '/foundations/02-02-essential-postgres-data-types',
            },
            {
              title: 'Database Functions and Triggers',
              href: '/foundations/02-03-database-functions-and-triggers',
            },
            {
              title: 'Key Postgres Extensions',
              href: '/foundations/02-04-key-postgres-extensions',
            },
            {
              title: 'Migrations and Version Control',
              href: '/foundations/02-05-migrations-and-version-control',
            },
            {
              title: 'Replication',
              href: '/foundations/02-06-replication',
            },
          ],
        },
        {
          title: 'Authentication and User Management',
          items: [
            {
              title: 'Authentication Fundamentals',
              href: '/foundations/03-01-authentication-fundamentals',
            },
            {
              title: 'Authentication Methods',
              href: '/foundations/03-02-authentication-methods',
            },
            {
              title: 'Advanced Authentication',
              href: '/foundations/03-03-advanced-authentication',
            },
            {
              title: 'User Management',
              href: '/foundations/03-04-user-management',
            },
            {
              title: 'Security Considerations',
              href: '/foundations/03-05-security-considerations',
            },
          ],
        },
        {
          title: 'Row Level Security',
          items: [
            {
              title: 'RLS Fundamentals',
              href: '/foundations/04-01-rls-fundamentals',
            },
            {
              title: 'Policy Patterns',
              href: '/foundations/04-02-policy-patterns',
            },
            {
              title: 'Auth Helper Functions',
              href: '/foundations/04-03-auth-helper-functions',
            },
            {
              title: 'Multi-Tenancy Patterns',
              href: '/foundations/04-04-multi-tenancy-patterns',
            },
            {
              title: 'Performance Optimization',
              href: '/foundations/04-05-performance-optimization',
            },
            {
              title: 'Common Pitfalls and Debugging',
              href: '/foundations/04-06-common-pitfalls-and-debugging',
            },
          ],
        },
        {
          title: 'Storage',
          items: [
            {
              title: 'Storage Architecture',
              href: '/foundations/05-01-storage-architecture',
            },
            {
              title: 'Access Control',
              href: '/foundations/05-02-access-control',
            },
            {
              title: 'File Operations',
              href: '/foundations/05-03-file-operations',
            },
            {
              title: 'Image Transformations',
              href: '/foundations/05-04-image-transformations',
            },
            {
              title: 'Integration Patterns',
              href: '/foundations/05-05-integration-patterns',
            },
          ],
        },
        {
          title: 'Realtime',
          items: [
            {
              title: 'Realtime Architecture',
              href: '/foundations/06-01-realtime-architecture',
            },
            {
              title: 'Database Changes',
              href: '/foundations/06-02-database-changes',
            },
            {
              title: 'Broadcast',
              href: '/foundations/06-03-broadcast',
            },
            {
              title: 'Presence',
              href: '/foundations/06-04-presence',
            },
            {
              title: 'Real-World Patterns',
              href: '/foundations/06-05-real-world-patterns',
            },
          ],
        },
        {
          title: 'Edge Functions',
          items: [
            {
              title: 'Edge Functions Architecture',
              href: '/foundations/07-01-edge-functions-architecture',
            },
            {
              title: 'Development Workflow',
              href: '/foundations/07-02-development-workflow',
            },
            {
              title: 'Common Patterns',
              href: '/foundations/07-03-common-patterns',
            },
            {
              title: 'Database Integration',
              href: '/foundations/07-04-database-integration',
            },
            {
              title: 'AI and LLM Integration',
              href: '/foundations/07-05-ai-and-llm-integration',
            },
            {
              title: 'Advanced Topics',
              href: '/foundations/07-06-advanced-topics',
            },
          ],
        },
        {
          title: 'AI and Vectors',
          items: [
            {
              title: 'Vector Fundamentals',
              href: '/foundations/08-01-vector-fundamentals',
            },
            {
              title: 'Indexing Strategies',
              href: '/foundations/08-02-indexing-strategies',
            },
            {
              title: 'Search Patterns',
              href: '/foundations/08-03-search-patterns',
            },
            {
              title: 'RAG Implementation',
              href: '/foundations/08-04-rag-implementation',
            },
            {
              title: 'Production Considerations',
              href: '/foundations/08-05-production-considerations',
            },
          ],
        },
        {
          title: 'Production Readiness',
          items: [
            {
              title: 'Performance Optimization',
              href: '/foundations/09-01-performance-optimization',
            },
            {
              title: 'Monitoring and Observability',
              href: '/foundations/09-02-monitoring-and-observability',
            },
            {
              title: 'Security Hardening',
              href: '/foundations/09-03-security-hardening',
            },
            {
              title: 'Backup and Recovery',
              href: '/foundations/09-04-backup-and-recovery',
            },
            {
              title: 'Deployment Patterns',
              href: '/foundations/09-05-deployment-patterns',
            },
            {
              title: 'Client Considerations',
              href: '/foundations/09-06-client-considerations',
            },
          ],
        },
      ],
      commandItemLabel: 'Foundations',
    },
  ],
}

// Recursively extract all items with hrefs for command palette
function extractCommandItems(items: any[], parentLabel?: string): { label: string; href: string }[] {
  const result: { label: string; href: string }[] = []

  items.forEach((item) => {
    if (item.href) {
      const label = parentLabel ? `${parentLabel}: ${item.title}` : item.title
      result.push({ label, href: item.href })
    }

    if (item.items && item.items.length > 0) {
      const childLabel = item.commandItemLabel || item.title
      result.push(...extractCommandItems(item.items, childLabel))
    }
  })

  return result
}

export const COMMAND_ITEMS = extractCommandItems(courses.items)
