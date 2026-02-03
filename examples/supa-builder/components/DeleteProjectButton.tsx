'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/app/actions/projects'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteProject(projectId)

    if (!result.success) {
      alert(`Failed to delete project: ${result.error}`)
      setIsDeleting(false)
      setShowConfirm(false)
      return
    }

    // Success - redirect to projects list
    router.push('/projects')
    router.refresh()
  }

  if (showConfirm) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-2">Delete Project</h3>
            <p className="text-sm text-[#A0A0A0] mb-4">
              Are you sure you want to delete <span className="text-white font-medium">{projectName}</span>?
              This will permanently delete the project from Supabase and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-transparent border border-[#2C2C2C] text-[#D0D0D0] rounded-md hover:bg-[#2C2C2C] disabled:opacity-50 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md hover:bg-red-500/20 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Delete Project
    </button>
  )
}
