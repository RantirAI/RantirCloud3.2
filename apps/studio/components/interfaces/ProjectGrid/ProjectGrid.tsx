import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  Database,
  Workflow,
  Layout,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from 'ui'

import {
  type LocalProject,
  type ProjectType,
  getLocalProjects,
  createLocalProject,
  deleteLocalProject,
  PROJECT_TYPE_META,
} from 'lib/local-projects'

const TYPE_ICONS: Record<ProjectType, typeof Database> = {
  data: Database,
  logic: Workflow,
  visual: Layout,
}

export function ProjectGrid() {
  const router = useRouter()
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ProjectType>('data')

  useEffect(() => {
    setProjects(getLocalProjects())
  }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    const project = createLocalProject(newName.trim(), newType)
    setProjects(getLocalProjects())
    setShowCreate(false)
    setNewName('')
    router.push(`/project/${project.ref}`)
  }

  const handleDelete = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    deleteLocalProject(ref)
    setProjects(getLocalProjects())
  }

  const handleClick = (ref: string) => {
    router.push(`/project/${ref}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-foreground-light mt-1">
            Create and manage your workspace projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Create project dialog */}
      {showCreate && (
        <div className="mb-8 rounded-lg border border-default bg-surface-100 p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Create a new project</h2>
          <div className="mb-4">
            <label className="block text-sm text-foreground-light mb-1">Project name</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="My project"
              className="w-full rounded-md border border-default bg-surface-200 px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-foreground-light mb-2">Project type</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PROJECT_TYPE_META) as ProjectType[]).map((type) => {
                const meta = PROJECT_TYPE_META[type]
                const Icon = TYPE_ICONS[type]
                const selected = newType === type
                return (
                  <button
                    key={type}
                    onClick={() => setNewType(type)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-center',
                      selected
                        ? 'border-brand-500 bg-surface-200'
                        : 'border-default bg-surface-100 hover:border-foreground-muted'
                    )}
                  >
                    <Icon size={24} style={{ color: meta.color }} />
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                    <span className="text-xs text-foreground-light">{meta.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowCreate(false)
                setNewName('')
              }}
              className="rounded-md border border-default px-4 py-2 text-sm text-foreground-light hover:bg-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              Create project
            </button>
          </div>
        </div>
      )}

      {/* Project grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Default data project tile */}
        <button
          onClick={() => handleClick('default')}
          className="group relative flex flex-col rounded-lg border border-default bg-surface-100 p-5 text-left hover:border-foreground-muted transition-all"
        >
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-md"
            style={{ backgroundColor: `${PROJECT_TYPE_META.data.color}20` }}
          >
            <Database size={20} style={{ color: PROJECT_TYPE_META.data.color }} />
          </div>
          <h3 className="text-sm font-medium text-foreground">
            {process.env.NEXT_PUBLIC_DEFAULT_PROJECT_NAME || 'Default Project'}
          </h3>
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${PROJECT_TYPE_META.data.color}20`,
              color: PROJECT_TYPE_META.data.color,
            }}
          >
            Data
          </span>
        </button>

        {/* User-created projects */}
        {projects.map((project) => {
          const meta = PROJECT_TYPE_META[project.project_type] ?? PROJECT_TYPE_META.data
          const Icon = TYPE_ICONS[project.project_type] ?? Database
          return (
            <button
              key={project.ref}
              onClick={() => handleClick(project.ref)}
              className="group relative flex flex-col rounded-lg border border-default bg-surface-100 p-5 text-left hover:border-foreground-muted transition-all"
            >
              <div
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(project.ref, e)}
              >
                <Trash2
                  size={14}
                  className="text-foreground-lighter hover:text-destructive-600 transition-colors"
                />
              </div>
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-md"
                style={{ backgroundColor: `${meta.color}20` }}
              >
                <Icon size={20} style={{ color: meta.color }} />
              </div>
              <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
              >
                {meta.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
