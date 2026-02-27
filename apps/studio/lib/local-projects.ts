/**
 * Local project management for self-hosted Studio.
 *
 * In self-hosted mode there is no platform API to store projects.
 * We persist a lightweight project list in localStorage so users
 * can create multiple typed projects (data, logic, visual).
 */

export type ProjectType = 'data' | 'logic' | 'visual'

export interface LocalProject {
  id: number
  ref: string
  name: string
  project_type: ProjectType
  organization_id: number
  cloud_provider: string
  status: string
  region: string
  inserted_at: string
}

const STORAGE_KEY = 'rantir-local-projects'

function generateRef(): string {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function getLocalProjects(): LocalProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getLocalProject(ref: string): LocalProject | undefined {
  return getLocalProjects().find((p) => p.ref === ref)
}

export function createLocalProject(name: string, projectType: ProjectType): LocalProject {
  const projects = getLocalProjects()
  const project: LocalProject = {
    id: Date.now(),
    ref: generateRef(),
    name,
    project_type: projectType,
    organization_id: 1,
    cloud_provider: 'localhost',
    status: 'ACTIVE_HEALTHY',
    region: 'local',
    inserted_at: new Date().toISOString(),
  }
  projects.push(project)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  return project
}

export function deleteLocalProject(ref: string): void {
  const projects = getLocalProjects().filter((p) => p.ref !== ref)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function getProjectType(ref: string): ProjectType {
  if (ref === 'default') return 'data'
  return getLocalProject(ref)?.project_type ?? 'data'
}

export const PROJECT_TYPE_META: Record<
  ProjectType,
  { label: string; color: string; description: string }
> = {
  data: {
    label: 'Data',
    color: '#EAB308',
    description: 'Tables, SQL editor, and database management',
  },
  logic: {
    label: 'Logic',
    color: '#8B5CF6',
    description: 'Flow builder with visual node editor',
  },
  visual: {
    label: 'Visual Builder',
    color: '#3B82F6',
    description: 'Visual app and website builder',
  },
}
