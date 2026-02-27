import { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from 'lib/api/apiWrapper'
import { DEFAULT_PROJECT, PROJECT_REST_URL } from 'lib/constants/api'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { ref } = req.query

  // For custom projects, return their metadata from the request header
  // (client passes it since localStorage isn't available server-side)
  const projectMeta = req.headers['x-local-project-meta']
  if (ref !== 'default' && projectMeta) {
    try {
      const meta = JSON.parse(projectMeta as string)
      return res.status(200).json({
        ...meta,
        connectionString: '',
        restUrl: PROJECT_REST_URL,
      })
    } catch {}
  }

  const response = {
    ...DEFAULT_PROJECT,
    connectionString: '',
    restUrl: PROJECT_REST_URL,
  }

  return res.status(200).json(response)
}
