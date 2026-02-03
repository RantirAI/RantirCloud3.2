'use client'

import { Loader2 } from 'lucide-react'

export default function CreatingProjectModal() {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg p-12 max-w-2xl w-full text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <Loader2 className="w-16 h-16 text-[#3ECF8E] animate-spin" />
        </div>

        {/* Main Message */}
        <h2 className="text-3xl font-medium text-white mb-6">
          Your new database is being created
        </h2>

        {/* Info Messages */}
        <div className="space-y-4 text-[#A0A0A0] text-base max-w-xl mx-auto">
          <p>
            When launched, you will be able to use a fully functional Postgres database, storage buckets for media, and authentication for sign in / sign up.
          </p>
          <p>
            You will be given a project reference URL and anonymous key. You can provide these to any AI Builder to start building with Supabase.
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-8 pt-6 border-t border-[#2C2C2C]">
          <p className="text-sm text-[#808080]">
            This usually takes 1-2 minutes...
          </p>
        </div>
      </div>
    </div>
  )
}
