/**
 * POST /api/logic/run
 * Server-side flow execution endpoint.
 * Keeps service role key on the server — never sent to client.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { executeFlow } from 'lib/logic/FlowExecutor'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' })
  }

  try {
    const { nodes, edges, variables, secrets, projectId } = req.body
    const result = await executeFlow(
      { nodes, edges, variables, secrets, projectId },
      supabaseUrl,
      supabaseKey
    )
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Execution failed' })
  }
}
