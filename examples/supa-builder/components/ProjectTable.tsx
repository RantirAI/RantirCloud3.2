'use client'

/**
 * ProjectTable Component
 *
 * Displays a table of projects with admin actions (pause, resume, delete).
 * Includes loading states and error handling.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import {
  pauseProject,
  resumeProject,
  deleteProject,
  type Project,
} from '@/app/actions/projects'

interface ProjectTableProps {
  projects: Project[]
  isAdmin: boolean
}

export default function ProjectTable({ projects, isAdmin }: ProjectTableProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePause = async (projectId: string) => {
    if (!confirm('Are you sure you want to pause this project?')) {
      return
    }

    setLoadingAction(projectId)
    setError(null)

    const result = await pauseProject(projectId)

    if (!result.success) {
      setError(result.error || 'Failed to pause project')
    } else {
      router.refresh()
    }

    setLoadingAction(null)
  }

  const handleResume = async (projectId: string) => {
    setLoadingAction(projectId)
    setError(null)

    const result = await resumeProject(projectId)

    if (!result.success) {
      setError(result.error || 'Failed to resume project')
    } else {
      router.refresh()
    }

    setLoadingAction(null)
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setLoadingAction(projectId)
    setError(null)

    const result = await deleteProject(projectId)

    if (!result.success) {
      setError(result.error || 'Failed to delete project')
    } else {
      router.refresh()
    }

    setLoadingAction(null)
  }

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      provisioning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      active: 'bg-[#3ECF8E]/10 text-[#3ECF8E] border-[#3ECF8E]/20',
      paused: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      deleted: 'bg-red-500/10 text-red-500 border-red-500/20',
    }

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          styles[status] || styles.active
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-[#1C1C1C] rounded-lg border border-[#2C2C2C]">
        <p className="text-[#A0A0A0] mb-6 text-base">No projects found</p>
        <Link
          href="/projects/new"
          className="inline-block px-5 py-2.5 bg-[#3ECF8E] text-[#0E0E0E] rounded-md hover:bg-[#3ECF8E]/90 font-medium transition-colors"
        >
          Create Your First Project
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[#2C2C2C] rounded-lg bg-[#1C1C1C]">
        <table className="min-w-full divide-y divide-[#2C2C2C]">
          <thead>
            <tr className="border-b border-[#2C2C2C]">
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Project Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Creator
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-[#808080] uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-medium text-[#808080] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C2C2C]">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-[#2C2C2C]/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-[#3ECF8E] hover:text-[#3ECF8E]/80 font-medium transition-colors"
                  >
                    {project.project_name}
                  </Link>
                  {project.purpose && (
                    <p className="text-xs text-[#808080] mt-1">{project.purpose}</p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-xs bg-[#2C2C2C] text-[#A0A0A0] px-2.5 py-1 rounded font-mono">
                    {project.project_ref}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#D0D0D0]">
                  {project.region}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(project.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#D0D0D0]">
                  {project.creator_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A0A0A0]">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-[#3ECF8E] hover:text-[#3ECF8E]/80 transition-colors"
                    >
                      View
                    </Link>

                    {isAdmin && project.status !== 'deleted' && (
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={loadingAction === project.id}
                        className="text-red-500 hover:text-red-400 disabled:text-[#505050] transition-colors p-1 rounded hover:bg-red-500/10"
                        title="Delete project"
                      >
                        {loadingAction === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
