/**
 * Login Page
 *
 * Handles SSO authentication via Supabase Auth.
 * Supports Google OAuth and other configured providers.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginButton from '@/components/LoginButton'

export default async function LoginPage() {
  const supabase = await createClient()

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If already logged in, redirect to projects
  if (user) {
    redirect('/projects')
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-6">
            SupaBuilder
          </h1>
          <p className="text-[#a0a0a0] text-base leading-relaxed">
            Enable your team to create and manage Supabase projects with proper governance, audit trails, and role-based access control.
          </p>
        </div>

        {/* Sign In Button */}
        <LoginButton provider="google" />
      </div>
    </div>
  )
}
