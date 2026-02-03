/**
 * Create New Project Page
 *
 * Server component that displays the project creation form.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProjectForm from '@/components/ProjectForm'
import Header from '@/components/Header'
import { ArrowLeft } from 'lucide-react'

export default async function NewProjectPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user's organization from user_roles
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  // Check if user has organization assigned
  if (!userRole || !userRole.organization_id) {
    return (
      <div className="min-h-screen bg-[#0E0E0E]">
        <Header userEmail={user.email} userRole={userRole?.role} />
        <div className="container mx-auto px-6 py-12 max-w-2xl">
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-medium mb-2">No Organization Assigned</h2>
            <p className="text-sm text-red-400 mb-4">
              You need to be assigned to an organization before you can create projects.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-[#3ECF8E] hover:text-[#3ECF8E]/80"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get admin project region from env or default
  const adminProjectRegion = process.env.ADMIN_PROJECT_REGION || 'us-east-1'

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <Header userEmail={user.email} userRole={userRole.role} />
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-[#808080] hover:text-[#D0D0D0] text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-4xl font-medium text-white mb-2">Create New Project</h1>
          <p className="text-[#A0A0A0] text-base">
            Create a new Supabase Pico project for your organization
          </p>
        </div>

        {/* Form */}
        <ProjectForm
          defaultOrganizationId={userRole.organization_id}
          defaultRegion={adminProjectRegion}
        />
      </div>
    </div>
  )
}
