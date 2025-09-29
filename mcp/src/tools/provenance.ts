import express from 'express'
import { z } from 'zod'

export const provenanceRouter = express.Router()

// GET /tools/provenance/status
provenanceRouter.get('/status', async (_req, res) => {
  // Placeholder: in real impl, ping RPC/GRPC and return node status
  return res.json({ ok: true, network: process.env.PROVENANCE_NETWORK || 'testnet' })
})

// POST /tools/provenance/register-asset
// body: { loanId: string, metadata: Record<string, any> }
provenanceRouter.post('/register-asset', async (req, res) => {
  const schema = z.object({
    loanId: z.string().min(1),
    metadata: z.record(z.any()).default({})
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }

  // Placeholder: simulate chain asset registration
  const txHash = `simulated_tx_${Date.now()}`
  const assetId = `simulated_asset_${parsed.data.loanId}`
  return res.status(201).json({ ok: true, assetId, txHash })
})

// POST /tools/provenance/process-payment
// body: { loanId: string, paymentId: string, amount: number }
provenanceRouter.post('/process-payment', async (req, res) => {
  const schema = z.object({
    loanId: z.string().min(1),
    paymentId: z.string().min(1),
    amount: z.number().positive()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }

  // Placeholder: simulate transfer and return txHash
  const txHash = `simulated_payment_tx_${Date.now()}`
  return res.status(201).json({ ok: true, txHash })
})

// ---- Phase 1 additional lifecycle endpoints (stubs) ----

// POST /tools/provenance/asset-class
// body: { name: string, schemaVersion?: string }
provenanceRouter.post('/asset-class', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    schemaVersion: z.string().default('1.0')
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }
  const assetClassId = `simulated_asset_class_${parsed.data.name.toLowerCase()}`
  const txHash = `simulated_tx_${Date.now()}`
  return res.status(201).json({ ok: true, assetClassId, txHash })
})

// POST /tools/provenance/asset
// body: { assetClassId: string, externalRef: string, metadata: Record<string, any> }
provenanceRouter.post('/asset', async (req, res) => {
  const schema = z.object({
    assetClassId: z.string().min(1),
    externalRef: z.string().min(1),
    metadata: z.record(z.any()).default({})
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }
  const assetId = `simulated_asset_${parsed.data.externalRef}`
  const txHash = `simulated_tx_${Date.now()}`
  return res.status(201).json({ ok: true, assetId, txHash })
})

// Prepare asset creation transaction (Keplr signing)
// body: { loanId: string, borrowerAddress: string, metadata: Record<string, any> }
provenanceRouter.post('/asset/prepare', async (req, res) => {
  const schema = z.object({
    loanId: z.string().min(1),
    borrowerAddress: z.string().min(1),
    metadata: z.record(z.any()).default({})
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }

  const { loanId, borrowerAddress, metadata } = parsed.data
  const assetClassId = `loan_asset_class_${loanId}`
  const assetId = `loan_asset_${loanId}`

  const scopeId = `scope_${loanId}`
  const sessionId = `session_${loanId}`
  const recordId = `record_${loanId}`

  const provenanceMetadata = {
    scope: {
      scopeId,
      specId: 'spec_loan_asset',
      ownerAddresses: [borrowerAddress],
      partiesInvolved: [borrowerAddress],
      dataAccess: [borrowerAddress],
      valueOwnerAddress: borrowerAddress
    },
    session: {
      sessionId,
      specId: 'spec_loan_asset',
      name: `Loan Session ${loanId}`,
      context: Buffer.from(
        JSON.stringify({
          loanId,
          borrowerName: metadata.borrowerName,
          loanAmount: metadata.loanAmount,
          interestRate: metadata.interestRate,
          loanTerm: metadata.loanTerm
        })
      ).toString('base64'),
      auditFields: [
        { name: 'loan_id', dataType: 'STRING', required: true },
        { name: 'borrower_name', dataType: 'STRING', required: true },
        { name: 'loan_amount', dataType: 'DECIMAL', required: true }
      ]
    },
    record: {
      recordId,
      sessionId,
      name: `Loan Record ${loanId}`,
      sessionName: `Loan Session ${loanId}`,
      contractSpecId: 'contract_spec_loan',
      parties: [borrowerAddress],
      inputs: [
        { name: 'loan_id', type: 'STRING', source: 'loan_id' },
        { name: 'borrower_name', type: 'STRING', source: 'borrower_name' },
        { name: 'loan_amount', type: 'DECIMAL', source: 'loan_amount' }
      ],
      outputs: [{ name: 'asset_id', type: 'STRING', source: 'asset_id' }],
      result: { status: 'PASS', output: { asset_id: assetId } }
    }
  }

  const messages = [
    {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: borrowerAddress,
        toAddress: borrowerAddress,
        amount: [{ denom: 'nhash', amount: '1' }]
      }
    }
  ]

  const fee = {
    amount: [{ denom: 'nhash', amount: '10000000' }],
    gas: '500000'
  }

  const metadataHash = Buffer.from(JSON.stringify(provenanceMetadata)).toString('hex').slice(0, 32)
  const memo = `PROV_LOAN:${loanId}|SCOPE:${scopeId}|SESSION:${sessionId}|RECORD:${recordId}|HASH:${metadataHash}`.slice(0, 256)

  return res.status(200).json({
    ok: true,
    messages,
    fee,
    memo,
    assetClassId,
    assetId,
    scopeId,
    sessionId,
    recordId,
    provenanceMetadata,
    chainId: process.env.PROVENANCE_CHAIN_ID || 'pio-testnet-1',
    rpc: process.env.PROVENANCE_RPC || 'https://rpc.test.provenance.io'
  })
})

// POST /tools/provenance/ledger/create
// body: { assetId: string, denomination?: string }
provenanceRouter.post('/ledger/create', async (req, res) => {
  const schema = z.object({
    assetId: z.string().min(1),
    denomination: z.string().default('USD')
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }
  const ledgerId = `simulated_ledger_${parsed.data.assetId}`
  const txHash = `simulated_tx_${Date.now()}`
  return res.status(201).json({ ok: true, ledgerId, txHash })
})

// POST /tools/provenance/ledger/post
// body: { ledgerId: string, type: 'DISBURSEMENT'|'PAYMENT'|'INTEREST', amount: number, memo?: string, refIds?: Record<string,string> }
provenanceRouter.post('/ledger/post', async (req, res) => {
  const schema = z.object({
    ledgerId: z.string().min(1),
    type: z.enum(['DISBURSEMENT', 'PAYMENT', 'INTEREST']),
    amount: z.number().nonnegative(),
    memo: z.string().optional(),
    refIds: z.record(z.string()).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }
  const entryId = `simulated_ledger_entry_${Date.now()}`
  const txHash = `simulated_tx_${Date.now()}`
  return res.status(201).json({ ok: true, entryId, txHash })
})

// POST /tools/provenance/registry/assign
// body: { assetId: string, roles: { lender?: string, servicer?: string, borrower?: string } }
provenanceRouter.post('/registry/assign', async (req, res) => {
  const schema = z.object({
    assetId: z.string().min(1),
    roles: z.object({
      lender: z.string().optional(),
      servicer: z.string().optional(),
      borrower: z.string().optional()
    })
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() })
  }
  const registryId = `simulated_registry_${parsed.data.assetId}`
  const txHash = `simulated_tx_${Date.now()}`
  return res.status(201).json({ ok: true, registryId, txHash })
})

// GET /tools/provenance/transaction/:txHash
provenanceRouter.get('/transaction/:txHash', async (req, res) => {
  const { txHash } = req.params
  // Simulate fetching transaction from Provenance blockchain
  const mockTransaction = {
    transactionHash: txHash,
    blockHeight: '32300995',
    timestamp: new Date().toISOString(),
    gasUsed: '84736',
    gasWanted: '200000',
    fee: '3810000000nhash',
    memo: `PROV_LOAN:demo|SCOPE:scope_demo|SESSION:session_demo|RECORD:record_demo|HASH:abc123def456`,
    scopeId: 'scope_demo',
    sessionId: 'session_demo',
    recordId: 'record_demo'
  }
  return res.status(200).json({ ok: true, ...mockTransaction })
})


