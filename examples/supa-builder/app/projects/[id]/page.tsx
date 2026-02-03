/**
 * Project Detail Page
 *
 * Server component that displays project information and Platform Kit UI.
 */

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/app/actions/projects'
import ProjectInfo from '@/components/ProjectInfo'
import PlatformKitEmbed from '@/components/PlatformKitEmbed'
import Header from '@/components/Header'
import DeleteProjectButton from '@/components/DeleteProjectButton'
import { ArrowLeft } from 'lucide-react'

interface ProjectDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch project
  const result = await getProject(id)

  if (!result.success) {
    notFound()
  }

  const project = result.data!

  // Check if user is admin
  const { data: role } = await supabase.rpc('get_user_role', {
    p_user_id: user.id,
    p_organization_id: project.organization_id,
  })
  const isAdmin = role === 'admin'

  const getStatusBadge = (status: typeof project.status) => {
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

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <Header userEmail={user.email} userRole={isAdmin ? 'admin' : 'builder'} />
      <div className="container mx-auto px-6 py-8 max-w-[1600px]">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[#808080] hover:text-[#D0D0D0] text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-white mb-1">{project.project_name}</h1>
              <p className="text-[#808080] text-sm font-mono">{project.project_ref}</p>
            </div>
            {getStatusBadge(project.status)}
          </div>
        </div>

        {/* Project Info - Collapsible */}
        <div className="mb-6">
          <ProjectInfo project={project} />
        </div>

        {/* Admin Actions */}
        {isAdmin && project.status !== 'deleted' && (
          <div className="mb-6">
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.project_name}
            />
          </div>
        )}

        {/* Platform Kit UI */}
        {project.status === 'active' ? (
          <PlatformKitEmbed projectRef={project.project_ref} />
        ) : (
          <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-medium text-white mb-2">
                {project.status === 'provisioning' && 'Project Provisioning'}
                {project.status === 'paused' && 'Project Paused'}
                {project.status === 'failed' && 'Provisioning Failed'}
              </h2>
              <p className="text-[#A0A0A0] mb-6">
                {project.status === 'provisioning' && 'Your project is being provisioned. This usually takes 1-2 minutes.'}
                {project.status === 'paused' && 'This project has been paused. Contact an admin to resume it.'}
                {project.status === 'failed' && 'Project provisioning failed. Please contact support.'}
              </p>
              {project.status === 'provisioning' && (
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
