import { NextResponse } from 'next/server'

// Temporary diagnostic endpoint - DELETE AFTER DEBUGGING
export async function GET() {
  const hasToken = !!process.env.MANAGEMENT_API_TOKEN
  const tokenLength = process.env.MANAGEMENT_API_TOKEN?.length || 0
  const tokenPrefix = process.env.MANAGEMENT_API_TOKEN?.substring(0, 4) || 'none'

  return NextResponse.json({
    hasToken,
    tokenLength,
    tokenPrefix: tokenPrefix === 'none' ? 'none' : `${tokenPrefix}...`,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
  })
}
