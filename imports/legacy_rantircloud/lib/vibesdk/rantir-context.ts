import { supabase } from '@/integrations/supabase/client';

export class RantirContextProvider {
  private projectId: string;
  private projectName: string;
  private currentFilePath: string;

  constructor(projectId: string, projectName: string, currentFilePath: string = '') {
    this.projectId = projectId;
    this.projectName = projectName;
    this.currentFilePath = currentFilePath;
  }

  async getProjectContext(): Promise<string> {
    const databases = await this.getDatabases();
    
    return `
Current Project Context:
- Project ID: ${this.projectId}
- Project Name: ${this.projectName}
- Current File: ${this.currentFilePath || 'None'}
- Available Databases: ${databases.length > 0 ? databases.map(d => d.name).join(', ') : 'None'}

You are working within the Rantir platform. All code should:
1. Use Supabase client from '@/integrations/supabase/client'
2. Follow React + TypeScript + Tailwind CSS patterns
3. Use shadcn/ui components when needed
4. Follow the existing project structure
    `.trim();
  }

  async getDatabaseContext(): Promise<string> {
    const databases = await this.getDatabases();
    
    if (databases.length === 0) {
      return 'No databases available in this project yet.';
    }

    const dbContexts = await Promise.all(
      databases.map(async (db) => {
        const tables = await this.getTablesForDatabase(db.id);
        return `
Database: ${db.name}
Description: ${db.description || 'No description'}
Tables: ${tables.length > 0 ? tables.map(t => t.name).join(', ') : 'No tables'}
        `.trim();
      })
    );

    return `
Available Databases:
${dbContexts.join('\n\n')}

Supabase Connection:
- URL: https://appdmmjexevclmpyvtss.supabase.co
- Use the supabase client instance from '@/integrations/supabase/client'
    `.trim();
  }

  async getFullContext(): Promise<string> {
    const [projectContext, databaseContext] = await Promise.all([
      this.getProjectContext(),
      this.getDatabaseContext()
    ]);

    return `${projectContext}

${databaseContext}

CRITICAL: ALWAYS GENERATE A COMPLETE REACT APP WITH ALL REQUIRED FILES!

REQUIRED FILES (MUST INCLUDE ALL):
1. package.json - React + Vite + TypeScript dependencies
2. index.html - HTML entry with <div id="root">
3. vite.config.ts - Vite config with React plugin
4. tsconfig.json - TypeScript configuration
5. tsconfig.node.json - Node TypeScript config
6. src/main.tsx - ReactDOM.render entry point
7. src/App.tsx - Main app component
8. src/index.css - Global styles (Tailwind or custom CSS)
9. src/App.css - App-specific styles

FOLDER STRUCTURE:
- src/components/ - React components
- src/hooks/ - Custom React hooks
- src/utils/ - Utility functions
- src/lib/ - Library code
- src/types/ - TypeScript types
- src/pages/ - Page components
- public/ - Static assets

TEMPLATE FOR REQUIRED FILES:

package.json:
{
  "name": "vite-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}

index.html:
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

vite.config.ts:
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})

src/main.tsx:
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

Format all files using:
FILE: path/to/file.tsx
[file content here]
ENDFILE
`;
  }

  private async getDatabases() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('databases')
        .select('id, name, description')
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error fetching databases:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDatabases:', error);
      return [];
    }
  }

  private async getTablesForDatabase(databaseId: string) {
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('id, name, schema')
        .eq('database_id', databaseId);

      if (error) {
        console.error('Error fetching tables:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTablesForDatabase:', error);
      return [];
    }
  }
}
