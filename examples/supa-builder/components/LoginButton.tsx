'use client'

/**
 * LoginButton Component
 *
 * Client component that handles OAuth login flow for various providers.
 */

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

type Provider = 'google' | 'azure' | 'github' | 'gitlab'

interface LoginButtonProps {
  provider: Provider
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: '🔒',
    color: 'bg-transparent hover:bg-[#2a2a2a] text-white border border-[#3a3a3a]',
  },
  azure: {
    name: 'Azure AD',
    icon: '🔷',
    color: 'bg-transparent hover:bg-[#2a2a2a] text-white border border-[#3a3a3a]',
  },
  github: {
    name: 'GitHub',
    icon: '⚫',
    color: 'bg-transparent hover:bg-[#2a2a2a] text-white border border-[#3a3a3a]',
  },
  gitlab: {
    name: 'GitLab',
    icon: '🦊',
    color: 'bg-transparent hover:bg-[#2a2a2a] text-white border border-[#3a3a3a]',
  },
}

export default function LoginButton({ provider }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = providerConfig[provider]

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      // OAuth flow initiated, user will be redirected
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`w-full px-6 py-3 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${config.color}`}
      >
        {config.icon && <span className="text-lg">{config.icon}</span>}
        {isLoading ? `Signing in...` : `Continue with ${config.name}`}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
