import 'dotenv/config'
import express from 'express'
import pino from 'pino'
import { z } from 'zod'
import { provenanceRouter } from './tools/provenance'
import { blockvaultRouter } from './tools/blockvault'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const app = express()
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/health', (_req, res) => {
  return res.json({ ok: true, service: 'provenance-mcp', env: process.env.NODE_ENV || 'development' })
})

// Tool mounts
app.use('/tools/provenance', provenanceRouter)
app.use('/tools/blockvault', blockvaultRouter)

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' })
})

const port = Number(process.env.MCP_PORT || 6060)
app.listen(port, () => {
  logger.info({ port }, 'MCP server listening')
})


