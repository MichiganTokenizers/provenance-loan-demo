import express from 'express'
import { z } from 'zod'

export const blockvaultRouter = express.Router()

// POST /tools/blockvault/store
// body: { documentBase64: string, tags?: Record<string,string> }
blockvaultRouter.post('/store', async (req, res) => {
  const schema = z.object({
    documentBase64: z.string().min(1),
    tags: z.record(z.string()).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }

  // Placeholder: simulate storage and return reference id
  const referenceId = `simulated_doc_${Date.now()}`
  return res.status(201).json({ ok: true, referenceId })
})

// POST /tools/blockvault/attest
// body: { referenceId: string, loanId?: string, note?: string }
blockvaultRouter.post('/attest', async (req, res) => {
  const schema = z.object({
    referenceId: z.string().min(1),
    loanId: z.string().optional(),
    note: z.string().optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }

  // Placeholder: simulate attestation
  const attestationId = `simulated_attest_${Date.now()}`
  return res.status(201).json({ ok: true, attestationId })
})


