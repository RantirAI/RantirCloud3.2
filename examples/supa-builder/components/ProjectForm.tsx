'use client'

/**
 * ProjectForm Component
 *
 * Client component for creating new Supabase projects.
 * Handles form validation, submission, and loading states.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, type CreateProjectInput } from '@/app/actions/projects'
import CreatingProjectModal from './CreatingProjectModal'

const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU West (Ireland)' },
  { value: 'eu-west-2', label: 'EU West (London)' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
]

interface ProjectFormProps {
  defaultOrganizationId?: string
  defaultRegion?: string
}

export default function ProjectForm({ defaultOrganizationId, defaultRegion }: ProjectFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [formData, setFormData] = useState<CreateProjectInput>({
    project_name: '',
    organization_id: defaultOrganizationId || '',
    region: defaultRegion || 'us-east-1',
    purpose: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrorDetails(null)
    setShowErrorDetails(false)
    setIsSubmitting(true)

    try {
      // Client-side validation
      if (formData.project_name.length < 3) {
        setError('Project name must be at least 3 characters')
        setIsSubmitting(false)
        return
      }

      if (!formData.organization_id) {
        setError('Organization ID is required')
        setIsSubmitting(false)
        return
      }

      console.log('[ProjectForm] Submitting project creation request:', {
        project_name: formData.project_name,
        organization_id: formData.organization_id,
        region: formData.region,
        timestamp: new Date().toISOString(),
      })

      // Call server action
      const result = await createProject(formData)

      console.log('[ProjectForm] Received response from server action:', {
        success: result.success,
        hasError: !!result.error,
        hasErrorDetails: !!result.errorDetails,
        timestamp: new Date().toISOString(),
      })

      if (!result.success) {
        const errorMessage = result.error || 'Failed to create project'
        setError(errorMessage)

        if (result.errorDetails && Object.keys(result.errorDetails).length > 0) {
          setErrorDetails(result.errorDetails)
          console.error('[ProjectForm] Error details:', result.errorDetails)
        } else {
          console.error('[ProjectForm] Error:', errorMessage)
        }

        setIsSubmitting(false)
        return
      }

      // Success - redirect to projects page
      console.log('[ProjectForm] Project created successfully, redirecting to projects page...')
      console.log('[ProjectForm] Project data:', result.data)

      // Keep spinner showing briefly then redirect
      setTimeout(() => {
        router.push('/projects')
        router.refresh()
      }, 2000)
    } catch (err) {
      console.error('[ProjectForm] Unexpected error during submission:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setErrorDetails({ unexpectedError: true, message: String(err) })
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <>
      {/* Creating Project Modal */}
      {isSubmitting && <CreatingProjectModal />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>

          {/* Technical Details */}
          {errorDetails && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-xs font-medium text-red-700 hover:text-red-900 underline"
              >
                {showErrorDetails ? 'Hide' : 'Show'} Technical Details
              </button>

              {showErrorDetails && (
                <div className="mt-2 p-3 bg-red-100 rounded border border-red-300 text-xs font-mono overflow-x-auto">
                  <div className="space-y-1">
                    {errorDetails.statusCode && (
                      <div>
                        <span className="font-bold">HTTP Status:</span> {errorDetails.statusCode}{' '}
                        {errorDetails.statusText}
                      </div>
                    )}
                    {errorDetails.requestUrl && (
                      <div>
                        <span className="font-bold">Request URL:</span> {errorDetails.requestUrl}
                      </div>
                    )}
                    {errorDetails.responseBody && (
                      <div>
                        <span className="font-bold">Response:</span>
                        <pre className="mt-1 whitespace-pre-wrap break-words">
                          {typeof errorDetails.responseBody === 'string'
                            ? errorDetails.responseBody
                            : JSON.stringify(errorDetails.responseBody, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-400 text-red-700">
                    <p className="font-bold">Debugging Tips:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Check browser console (F12) for detailed logs</li>
                      <li>Check Supabase Edge Function logs in dashboard</li>
                      <li>Verify your authentication token is valid</li>
                      {errorDetails.statusCode === 429 && (
                        <li className="text-red-900 font-bold">
                          Rate limit exceeded. Wait before creating more projects.
                        </li>
                      )}
                      {errorDetails.statusCode === 401 && (
                        <li className="text-red-900 font-bold">
                          Authentication failed. Try logging out and back in.
                        </li>
                      )}
                      {errorDetails.statusCode >= 500 && (
                        <li className="text-red-900 font-bold">
                          Server error. Check Edge Function logs for details.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Project Name */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6">
        <label htmlFor="project_name" className="block text-sm font-medium text-white mb-2">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="project_name"
          name="project_name"
          value={formData.project_name}
          onChange={handleInputChange}
          required
          minLength={3}
          maxLength={63}
          placeholder="my-awesome-project"
          className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-[#2C2C2C] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] focus:border-transparent placeholder:text-[#808080] disabled:opacity-50"
          disabled={isSubmitting}
        />
        <p className="text-xs text-[#808080] mt-2">
          3-63 characters, lowercase letters, numbers, and hyphens
        </p>
      </div>

      {/* Hidden fields - automatically set */}
      <input type="hidden" name="organization_id" value={formData.organization_id} />
      <input type="hidden" name="region" value={formData.region} />

      {/* Purpose */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6">
        <label htmlFor="purpose" className="block text-sm font-medium text-white mb-2">
          Purpose <span className="text-[#808080] text-xs">(Optional)</span>
        </label>
        <input
          type="text"
          id="purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleInputChange}
          placeholder="Development, Staging, Production"
          className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-[#2C2C2C] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] focus:border-transparent placeholder:text-[#808080] disabled:opacity-50"
          disabled={isSubmitting}
        />
        <p className="text-xs text-[#808080] mt-2">
          What will this project be used for?
        </p>
      </div>

      {/* Description */}
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-6">
        <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
          Description <span className="text-[#808080] text-xs">(Optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          placeholder="Additional details about your project"
          className="w-full px-4 py-2.5 bg-[#0E0E0E] border border-[#2C2C2C] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] focus:border-transparent placeholder:text-[#808080] disabled:opacity-50 resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#3ECF8E] text-[#0E0E0E] rounded-md hover:bg-[#3ECF8E]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isSubmitting ? 'Creating Project...' : 'Create Project'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-transparent border border-[#2C2C2C] text-[#D0D0D0] rounded-md hover:bg-[#2C2C2C] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Cancel
        </button>
      </div>

    </form>
    </>
  )
}
