import { supabase } from "@/integrations/supabase/client";
import { appBuilderService } from "./appBuilderService";
import { databaseService } from "./databaseService";
import { activityService } from "./activityService";
import { integrationsService } from "./integrationsService";
import { nodeRegistry } from "@/lib/node-registry";
import { detectMissingIntegrations, getNodeDisplayName } from "@/utils/detectRequiredIntegrations";
import { toast } from "@/components/ui/sonner";

export interface GeneratedProject {
  type: 'database' | 'flow' | 'app';
  name: string;
  description: string;
  config: any;
}

export interface ProjectRelationship {
  from: string;
  to: string;
  type?: 'data-source' | 'trigger' | 'api-call';
  description: string;
  config?: any;
}

export interface IntentAnalysis {
  detectedNeeds: string[];
  suggestedTypes: string[];
  reasoning: string;
}

export interface GenerationResult {
  intentAnalysis?: IntentAnalysis;
  projects: GeneratedProject[];
  relationships: ProjectRelationship[];
}

export interface CreatedProject {
  id: string;
  type: string;
  name: string;
  url: string;
}

export interface InstalledIntegration {
  id: string;
  name: string;
  nodeType: string;
  category: string;
  description?: string;
}

export interface AvailableNodeType {
  type: string;
  name: string;
  description: string;
  category: string;
  requiresInstallation?: boolean;
  isInstalled?: boolean;
}

export const projectGenerationService = {
  /**
   * Generate projects with AI - supports auto-detection of project types
   */
  async generateProjects(
    description: string,
    projectTypes: string[],
    userId: string,
    installedIntegrations?: InstalledIntegration[],
    autoDetectTypes: boolean = false,
    availableNodeTypes?: AvailableNodeType[]
  ): Promise<GenerationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-projects', {
        body: {
          description,
          projectTypes,
          userId,
          installedIntegrations,
          autoDetectTypes,
          availableNodeTypes
        }
      });

      if (error) {
        console.error('Error calling generate-projects function:', error);
        return this.generateProjectsLocally(description, projectTypes);
      }

      if (!data?.success) {
        console.error('Edge function returned error:', data?.error);
        return this.generateProjectsLocally(description, projectTypes);
      }

      // Log intent analysis if available
      if (data.data.intentAnalysis) {
        console.log('AI Intent Analysis:', data.data.intentAnalysis);
      }

      return data.data;
    } catch (error) {
      console.error('Error generating projects:', error);
      return this.generateProjectsLocally(description, projectTypes);
    }
  },

  /**
   * Analyze a prompt to determine optimal project types without generating
   */
  async analyzeIntent(description: string): Promise<IntentAnalysis> {
    const prompt = description.toLowerCase();
    const detectedNeeds: string[] = [];
    const suggestedTypes: string[] = [];

    // Database indicators
    const databaseKeywords = ['database', 'table', 'data', 'store', 'record', 'crm', 'inventory', 'contact', 'customer', 'product', 'order', 'user', 'content', 'collection', 'manage', 'report', 'document'];
    if (databaseKeywords.some(kw => prompt.includes(kw))) {
      detectedNeeds.push('data storage');
      suggestedTypes.push('database');
    }

    // Flow indicators
    const flowKeywords = ['automat', 'workflow', 'trigger', 'schedule', 'sync', 'webhook', 'notification', 'email', 'api', 'integration', 'process', 'logic', 'flow'];
    if (flowKeywords.some(kw => prompt.includes(kw))) {
      detectedNeeds.push('automation');
      suggestedTypes.push('flow');
    }

    // App indicators  
    const appKeywords = ['app', 'website', 'site', 'dashboard', 'portal', 'interface', 'ui', 'form', 'page', 'admin', 'panel', 'report', 'visual'];
    if (appKeywords.some(kw => prompt.includes(kw))) {
      detectedNeeds.push('user interface');
      suggestedTypes.push('app');
    }

    // Default to database if nothing detected
    if (suggestedTypes.length === 0) {
      detectedNeeds.push('data storage');
      suggestedTypes.push('database');
    }

    return {
      detectedNeeds,
      suggestedTypes,
      reasoning: `Detected needs based on keywords: ${detectedNeeds.join(', ')}`
    };
  },

  generateProjectsLocally(description: string, projectTypes: string[]): GenerationResult {
    console.log('Using local fallback generation');
    
    // Use smart naming utility
    const { extractSmartProjectName } = require('@/utils/projectNaming');
    
    const projects: GeneratedProject[] = projectTypes.map(type => {
      const projectName = extractSmartProjectName(description, type);
      
      return {
        type: type as 'database' | 'flow' | 'app',
        name: projectName,
        description: `A ${type} project for ${description}`,
        config: this.getDefaultConfig(type)
      };
    });

    return {
      projects,
      relationships: []
    };
  },

  getDefaultConfig(type: string): any {
    switch (type) {
      case 'database':
        return {
          tables: [
            {
              name: 'items',
              fields: [
                { name: 'id', type: 'text', required: true, system: true },
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: false },
                { name: 'created_at', type: 'date', required: true, system: true }
              ]
            }
          ]
        };
      case 'flow':
        return {
          nodes: [
            {
              id: 'trigger-1',
              type: 'custom',
              position: { x: 400, y: 100 },
              data: {
                type: 'http-request',
                label: 'HTTP Request',
                inputs: {
                  url: '',
                  method: 'GET',
                  headers: '{}',
                  body: ''
                },
                isFirstNode: true
              }
            }
          ],
          edges: []
        };
      case 'app':
        return {
          pages: [
            {
              id: 'home',
              path: '/',
              name: 'Home',
              components: [
                {
                  id: 'text-1',
                  type: 'Text',
                  props: { content: 'Welcome to your new app!' }
                }
              ]
            }
          ]
        };
      default:
        return {};
    }
  },

  async createProjects(
    generatedProjects: GeneratedProject[],
    userId: string,
    allowedTypes?: string[],
    workspaceId?: string | null
  ): Promise<CreatedProject[]> {
    const createdProjects: CreatedProject[] = [];

    // Filter projects to only include allowed types if specified
    const projectsToCreate = allowedTypes 
      ? generatedProjects.filter(p => allowedTypes.includes(p.type))
      : generatedProjects;

    for (const project of projectsToCreate) {
      try {
        let createdProject: CreatedProject;

        switch (project.type) {
          case 'database':
            createdProject = await this.createDatabaseProject(project, userId, workspaceId);
            break;
          case 'flow':
            createdProject = await this.createFlowProject(project, userId, workspaceId);
            break;
          case 'app':
            createdProject = await this.createAppProject(project, userId, workspaceId);
            break;
          default:
            console.warn(`Unknown project type: ${project.type}, skipping...`);
            continue;
        }

        createdProjects.push(createdProject);
      } catch (error) {
        console.error(`Error creating ${project.type} project:`, error);
        toast.error(`Failed to create ${project.name}: ${error.message}`);
      }
    }

    // SAFEGUARD: Ensure all requested types were created - add defaults for missing types
    if (allowedTypes && allowedTypes.length > 0) {
      for (const requestedType of allowedTypes) {
        const wasCreated = createdProjects.some(p => p.type === requestedType);
        if (!wasCreated) {
          console.warn(`Project type ${requestedType} was requested but not created, adding default`);
          try {
            const defaultProject: GeneratedProject = {
              type: requestedType as 'database' | 'flow' | 'app',
              name: `New ${requestedType.charAt(0).toUpperCase() + requestedType.slice(1)}`,
              description: `Default ${requestedType} project`,
              config: this.getDefaultConfig(requestedType)
            };
            
            let createdDefault: CreatedProject;
            switch (requestedType) {
              case 'database':
                createdDefault = await this.createDatabaseProject(defaultProject, userId, workspaceId);
                break;
              case 'flow':
                createdDefault = await this.createFlowProject(defaultProject, userId, workspaceId);
                break;
              case 'app':
                createdDefault = await this.createAppProject(defaultProject, userId, workspaceId);
                break;
              default:
                continue;
            }
            createdProjects.push(createdDefault);
          } catch (fallbackError) {
            console.error(`Failed to create fallback ${requestedType}:`, fallbackError);
          }
        }
      }
    }

    return createdProjects;
  },

  async createDatabaseProject(project: GeneratedProject, userId: string, workspaceId?: string | null): Promise<CreatedProject> {
    // Create the database - ensure user_id is properly set
    if (!userId) {
      throw new Error('User ID is required to create a database');
    }
    
    const database = await databaseService.createDatabase({
      name: project.name,
      description: project.description,
      user_id: userId,
      workspace_id: workspaceId || undefined,
      color: '#3B82F6'
    });

    // Create tables if specified in config
    if (project.config.tables && Array.isArray(project.config.tables)) {
      for (const tableConfig of project.config.tables) {
        const { data: tableProject, error } = await supabase
          .from('table_projects')
          .insert({
            name: tableConfig.name,
            description: `Table for ${project.name}`,
            user_id: userId,
            workspace_id: workspaceId,
            database_id: database.id,
            schema: {
              fields: tableConfig.fields || [
                { id: 'id', name: 'id', type: 'text', required: true, system: true },
                { id: 'name', name: 'name', type: 'text', required: true }
              ]
            },
            records: []
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating table:', error);
        }
      }
    }

    // Create documents if specified in config
    if (project.config.documents && Array.isArray(project.config.documents)) {
      for (const docConfig of project.config.documents) {
        try {
          const lexicalContent = this.convertMarkdownToLexical(docConfig.content || '');
          const { error } = await supabase
            .from('documents')
            .insert({
              database_id: database.id,
              title: docConfig.title || 'Untitled Document',
              content: lexicalContent,
              created_by: userId
            });

          if (error) {
            console.error('Error creating document:', error);
          }
        } catch (docError) {
          console.error('Error creating document:', docError);
        }
      }
    }

    return {
      id: database.id,
      type: 'database',
      name: project.name,
      url: `/databases/${database.id}`
    };
  },

  // Helper function to convert markdown to Lexical editor format
  convertMarkdownToLexical(markdown: string): any {
    const lines = markdown.split('\n');
    const children: any[] = [];
    
    let currentList: any[] | null = null;
    let listType: 'bullet' | 'number' | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '') {
        if (currentList && currentList.length > 0) {
          children.push({
            type: 'list',
            listType: listType,
            start: 1,
            tag: listType === 'bullet' ? 'ul' : 'ol',
            children: currentList,
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1
          });
          currentList = null;
          listType = null;
        }
        continue;
      }

      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);
      
      if (h1Match) {
        children.push({ type: 'heading', tag: 'h1', children: [{ type: 'text', text: h1Match[1], detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, version: 1 });
        continue;
      }
      if (h2Match) {
        children.push({ type: 'heading', tag: 'h2', children: [{ type: 'text', text: h2Match[1], detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, version: 1 });
        continue;
      }
      if (h3Match) {
        children.push({ type: 'heading', tag: 'h3', children: [{ type: 'text', text: h3Match[1], detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, version: 1 });
        continue;
      }

      const bulletMatch = line.match(/^[-*] (.+)$/);
      if (bulletMatch) {
        if (!currentList || listType !== 'bullet') {
          if (currentList && currentList.length > 0) {
            children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList, direction: 'ltr', format: '', indent: 0, version: 1 });
          }
          currentList = [];
          listType = 'bullet';
        }
        currentList.push({ type: 'listitem', children: [{ type: 'text', text: bulletMatch[1], detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, value: currentList.length + 1, version: 1 });
        continue;
      }

      const numberMatch = line.match(/^\d+\. (.+)$/);
      if (numberMatch) {
        if (!currentList || listType !== 'number') {
          if (currentList && currentList.length > 0) {
            children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList, direction: 'ltr', format: '', indent: 0, version: 1 });
          }
          currentList = [];
          listType = 'number';
        }
        currentList.push({ type: 'listitem', children: [{ type: 'text', text: numberMatch[1], detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, value: currentList.length + 1, version: 1 });
        continue;
      }

      if (currentList && currentList.length > 0) {
        children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList, direction: 'ltr', format: '', indent: 0, version: 1 });
        currentList = null;
        listType = null;
      }

      const textContent = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
      children.push({ type: 'paragraph', children: [{ type: 'text', text: textContent, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, textFormat: 0, version: 1 });
    }

    if (currentList && currentList.length > 0) {
      children.push({ type: 'list', listType: listType, start: 1, tag: listType === 'bullet' ? 'ul' : 'ol', children: currentList, direction: 'ltr', format: '', indent: 0, version: 1 });
    }

    return {
      root: {
        type: 'root',
        children: children.length > 0 ? children : [{ type: 'paragraph', children: [{ type: 'text', text: '', detail: 0, format: 0, mode: 'normal', style: '', version: 1 }], direction: 'ltr', format: '', indent: 0, textFormat: 0, version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
      }
    };
  },

  async createFlowProject(project: GeneratedProject, userId: string, workspaceId?: string | null): Promise<CreatedProject> {
    // Auto-install missing integrations before creating flow
    if (project.config.nodes && Array.isArray(project.config.nodes)) {
      const nodeTypes = project.config.nodes
        .map((node: any) => node.data?.type || node.type)
        .filter(Boolean);
      
      if (nodeTypes.length > 0) {
        try {
          // Get user's currently installed types
          const installedTypes = await integrationsService.getUserInstalledNodeTypes(userId);
          
          // Detect missing integrations
          const missingIntegrations = detectMissingIntegrations(nodeTypes, installedTypes);
          
          if (missingIntegrations.length > 0) {
            console.log('[ProjectGeneration] Auto-installing missing integrations:', missingIntegrations);
            const integrationNames = missingIntegrations.map(getNodeDisplayName).join(', ');
            toast.loading(`Installing integrations: ${integrationNames}...`, { id: 'flow-install-toast' });
            
            const { installed, failed } = await integrationsService.batchInstallIntegrations(
              userId,
              missingIntegrations
            );
            
            if (installed.length > 0) {
              // Refresh node registry
              const newInstalledTypes = await integrationsService.getUserInstalledNodeTypes(userId);
              nodeRegistry.registerConditionally(newInstalledTypes);
              
              // Dispatch event for any open FlowBuilder instances
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nodeInstallationsUpdated', {
                  detail: { installedNodeTypes: newInstalledTypes }
                }));
              }
              
              toast.success(`Installed: ${installed.map(getNodeDisplayName).join(', ')}`, { id: 'flow-install-toast' });
            }
            
            if (failed.length > 0) {
              console.warn('[ProjectGeneration] Some integrations failed to install:', failed);
            }
          }
        } catch (installError) {
          console.error('[ProjectGeneration] Error during auto-install:', installError);
        }
      }
      
      // Phase 2: Install-on-demand fallback for any missed nodes
      const CORE_NODE_TYPES = new Set([
        'http-request', 'condition', 'delay', 'webhook', 'code', 
        'set-variable', 'loop', 'data-filter', 'data-transformer',
        'api-request', 'scheduler', 'split', 'merge', 'wait', 'end'
      ]);
      
      const currentInstalledTypes = await integrationsService.getUserInstalledNodeTypes(userId);
      let anyInstalled = false;
      
      for (const node of project.config.nodes) {
        const nodeType = node.data?.type || node.type;
        if (!nodeType) continue;
        if (CORE_NODE_TYPES.has(nodeType)) continue;
        if (currentInstalledTypes.includes(nodeType)) continue;
        
        // Check if node type exists in database and try to install
        const exists = await integrationsService.nodeTypeExistsInDatabase(nodeType);
        if (exists) {
          console.log(`[ProjectGeneration] Install-on-demand: ${nodeType}`);
          try {
            await integrationsService.installIntegration(userId, nodeType, {});
            console.log(`[ProjectGeneration] Successfully installed ${nodeType} on-demand`);
            currentInstalledTypes.push(nodeType);
            anyInstalled = true;
          } catch (installError) {
            console.warn(`[ProjectGeneration] Failed to install ${nodeType} on-demand:`, installError);
          }
        }
      }
      
      // Refresh registry if any on-demand installations occurred
      if (anyInstalled) {
        const finalInstalledTypes = await integrationsService.getUserInstalledNodeTypes(userId);
        nodeRegistry.registerConditionally(finalInstalledTypes);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nodeInstallationsUpdated', {
            detail: { installedNodeTypes: finalInstalledTypes }
          }));
        }
      }
    }

    // Create flow project with workspace context
    const { data: flowProject, error: flowError } = await supabase
      .from('flow_projects')
      .insert({
        name: project.name,
        description: project.description,
        user_id: userId,
        workspace_id: workspaceId
      })
      .select()
      .single();

    if (flowError) {
      throw new Error(`Failed to create flow project: ${flowError.message}`);
    }

    // Create initial flow data if nodes/edges are provided
    if (project.config.nodes || project.config.edges) {
      const { error: flowDataError } = await supabase
        .from('flow_data')
        .insert({
          flow_project_id: flowProject.id,
          nodes: project.config.nodes || [],
          edges: project.config.edges || [],
          version: 1,
          version_name: 'Initial Version',
          is_published: false
        });

      if (flowDataError) {
        console.error('Error creating flow data:', flowDataError);
      }
    }

    // Log activity
    await activityService.logActivity({
      type: 'flow_created',
      description: `Created flow: ${project.name}`,
      resourceType: 'flow',
      resourceId: flowProject.id,
      resourceName: project.name
    });

    return {
      id: flowProject.id,
      type: 'flow',
      name: project.name,
      url: `/flows/${flowProject.id}`
    };
  },

  async createAppProject(project: GeneratedProject, userId: string, workspaceId?: string | null): Promise<CreatedProject> {
    const appProject = await appBuilderService.createAppProject({
      name: project.name,
      description: project.description,
      user_id: userId,
      workspace_id: workspaceId || undefined,
      pages: project.config.pages || [
        {
          id: 'home',
          path: '/',
          name: 'Home',
          components: [
            {
              id: 'welcome-text',
              type: 'Text',
              props: {
                content: `Welcome to ${project.name}!`
              },
              style: {
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginTop: '40px'
              }
            }
          ]
        }
      ],
      global_styles: {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6'
        }
      },
      settings: {
        theme: 'light',
        primaryColor: '#3B82F6',
        fontFamily: 'sans-serif'
      }
    });

    // Log activity
    await activityService.logActivity({
      type: 'app_created',
      description: `Created app: ${project.name}`,
      resourceType: 'app',
      resourceId: appProject.id,
      resourceName: project.name
    });

    return {
      id: appProject.id,
      type: 'app',
      name: project.name,
      url: `/apps/${appProject.id}`
    };
  },

  async handleFullGeneration(
    description: string,
    projectTypes: string[],
    userId: string,
    installedIntegrations?: InstalledIntegration[],
    availableNodeTypes?: AvailableNodeType[],
    workspaceId?: string | null
  ): Promise<CreatedProject[]> {
    const startTime = Date.now();
    const minLoadingTime = 1500;
    
    try {
      // Enable auto-detect if no specific types requested
      const autoDetectTypes = !projectTypes || projectTypes.length === 0;
      
      // Step 1: Generate project configurations with AI
      const generationResult = await this.generateProjects(
        description, 
        projectTypes, 
        userId, 
        installedIntegrations,
        autoDetectTypes,
        availableNodeTypes
      );
      
      // Log intent analysis if available
      if (generationResult.intentAnalysis) {
        console.log('AI Intent Analysis:', generationResult.intentAnalysis);
        toast.info(`AI detected: ${generationResult.intentAnalysis.suggestedTypes.join(', ')}`);
      }
      
      // Step 2: Create the actual projects with workspace context
      const typesToCreate = projectTypes?.length > 0 ? projectTypes : undefined;
      const createdProjects = await this.createProjects(generationResult.projects, userId, typesToCreate, workspaceId);
      
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      return createdProjects;
    } catch (error) {
      // Still ensure minimum loading time even on errors
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      throw error;
    }
  }
};