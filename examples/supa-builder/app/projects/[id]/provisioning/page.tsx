'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProject, type Project } from '@/app/actions/projects'
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export default function ProvisioningPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dots, setDots] = useState('')

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Poll project status
  useEffect(() => {
    const poll = async () => {
      const result = await getProject(params.id)

      if (result.success && result.data) {
        setProject(result.data)

        // Redirect when project is active
        if (result.data.status === 'active') {
          router.push(`/projects/${params.id}`)
        }

        // Show error if provisioning failed
        if (result.data.status === 'failed') {
          setError('Project provisioning failed. Please contact support.')
        }
      } else {
        setError(result.error || 'Failed to fetch project status')
      }
    }

    poll()
    const interval = setInterval(poll, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [params.id, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Provisioning Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Creating Your Project{dots}
          </h1>
          {project && (
            <p className="text-lg text-gray-600">
              {project.project_name}
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          <ProvisioningStep
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            title="Project Registered"
            description="Your project has been registered in the system"
            completed={true}
          />

          <ProvisioningStep
            icon={<Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
            title="Infrastructure Provisioning"
            description="Setting up database, storage, and authentication services"
            completed={false}
            inProgress={true}
          />

          <ProvisioningStep
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Finalizing Setup"
            description="Configuring API keys and network settings"
            completed={false}
          />
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 text-center">
            This usually takes 1-2 minutes. You'll be automatically redirected when ready.
          </p>
        </div>

        {/* Manual navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/projects')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Return to projects list
          </button>
        </div>
      </div>
    </div>
  )
}

function ProvisioningStep({
  icon,
  title,
  description,
  completed,
  inProgress = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  completed: boolean
  inProgress?: boolean
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className={`font-semibold ${
          completed ? 'text-green-900' : inProgress ? 'text-blue-900' : 'text-gray-500'
        }`}>
          {title}
        </h3>
        <p className={`text-sm ${
          completed ? 'text-green-700' : inProgress ? 'text-blue-700' : 'text-gray-500'
        }`}>
          {description}
        </p>
      </div>
    </div>
  )
}
