/**
 * POST /api/logic/flows/:slug
 * Public deploy endpoint — runs a flow by slug.
 * Loads the active flow version from localStorage-backed project storage
 * (prototype — in production this would be from DB).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { executeFlow } from 'lib/logic/FlowExecutor'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing env config' })
  }

  const { slug } = req.query

  // For prototype: flow data comes in request body
  // In production: load from DB by slug
  const body = req.method === 'POST' ? req.body : {}
  const { nodes, edges, variables, secrets, projectId } = body

  if (!nodes || !edges) {
    return res.status(400).json({
      error: 'Flow not found or missing nodes/edges',
      hint: `POST flow data to /api/logic/flows/${slug}`,
      slug,
    })
  }

  try {
    const result = await executeFlow(
      { nodes, edges, variables, secrets, projectId },
      supabaseUrl,
      supabaseKey
    )
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
