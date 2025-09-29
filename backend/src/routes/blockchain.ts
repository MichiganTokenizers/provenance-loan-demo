import express from 'express'
import Joi from 'joi'
import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const registerAssetSchema = Joi.object({
  loanId: Joi.string().required(),
  assetType: Joi.string().valid('loan', 'collateral', 'payment').required(),
  metadata: Joi.object().required()
})

const deployContractSchema = Joi.object({
  loanId: Joi.string().required(),
  contractType: Joi.string().valid('loan_agreement', 'payment_processor', 'asset_registry').required(),
  parameters: Joi.object().required()
})

// Resolve MCP base URL
const MCP_BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:6060'

// Keplr integration schemas
const prepareKeplrSchema = Joi.object({
  loanId: Joi.string().required(),
  borrowerAddress: Joi.string().required(),
  metadata: Joi.object().default({})
})

const confirmTxSchema = Joi.object({
  loanId: Joi.string().required(),
  txHash: Joi.string().required()
})

// Prepare Provenance tx messages for Keplr signing (asset creation)
router.post('/keplr/prepare-asset', authenticateToken, async (req, res) => {
  try {
    const { error, value } = prepareKeplrSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      })
    }

    const { loanId, borrowerAddress, metadata } = value

    const loan = await prisma.loan.findUnique({ where: { id: loanId } })
    if (!loan) {
      return res.status(404).json({
        success: false,
        error: { code: 'LOAN_NOT_FOUND', message: 'Loan not found' }
      })
    }

    // Compose metadata fallback from loan if not provided
    const chainMetadata = Object.keys(metadata).length
      ? metadata
      : {
          borrowerName: loan.borrowerName,
          loanAmount: Number(loan.loanAmount),
          interestRate: Number(loan.interestRate),
          loanTerm: loan.loanTerm,
          collateralType: 'N/A',
          collateralValue: 0,
          createdAt: loan.createdAt.toISOString()
        }

    const mcpResp = await axios.post(`${MCP_BASE_URL}/tools/provenance/asset/prepare`, {
      loanId,
      borrowerAddress,
      metadata: chainMetadata
    })

    return res.json({ success: true, data: mcpResp.data })
  } catch (error: any) {
    const status = error?.response?.status
    const mcpMessage = error?.response?.data?.error?.message || error?.response?.data?.message
    const isConnRefused = error?.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(String(error?.message))
    const message = isConnRefused
      ? 'Provenance MCP service is not reachable. Start MCP on http://localhost:6060.'
      : (mcpMessage || 'Failed to prepare Keplr messages')
    console.error('Keplr prepare asset error:', {
      status,
      code: error?.code,
      message: error?.message,
      mcpMessage
    })
    return res.status(isConnRefused ? 502 : (status || 500)).json({
      success: false,
      error: { code: 'BLOCKCHAIN_ERROR', message }
    })
  }
})

// Confirm broadcasted tx and persist identifiers on the loan
router.post('/keplr/confirm', authenticateToken, async (req, res) => {
  try {
    const { error, value } = confirmTxSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      })
    }
    const { loanId, txHash } = value

    const loan = await prisma.loan.findUnique({ where: { id: loanId } })
    if (!loan) {
      return res.status(404).json({
        success: false,
        error: { code: 'LOAN_NOT_FOUND', message: 'Loan not found' }
      })
    }

    // Query tx details from MCP (stub that returns rich metadata)
    const txResp = await axios.get(`${MCP_BASE_URL}/tools/provenance/transaction/${txHash}`)
    const data = txResp.data || {}

    // Persist identifiers we can derive from the prepared response
    // Note: mcp prepare returned assetId and ledger ids; we may not have them here.
    // For now, store tx hash; front-end can POST assetId if needed in future.
    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        blockchainTransactionHash: txHash
      },
      include: { collateral: true }
    })

    return res.json({ success: true, data: { loan: updated, transaction: data } })
  } catch (error: any) {
    const status = error?.response?.status
    const mcpMessage = error?.response?.data?.error?.message || error?.response?.data?.message
    const isConnRefused = error?.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(String(error?.message))
    const message = isConnRefused
      ? 'Provenance MCP service is not reachable. Start MCP on http://localhost:6060.'
      : (mcpMessage || 'Failed to confirm transaction')
    console.error('Keplr confirm error:', {
      status,
      code: error?.code,
      message: error?.message,
      mcpMessage
    })
    return res.status(isConnRefused ? 502 : (status || 500)).json({
      success: false,
      error: { code: 'BLOCKCHAIN_ERROR', message }
    })
  }
})

// Register asset on Provenance blockchain (via MCP)
router.post('/register-asset', authenticateToken, async (req, res) => {
  try {
    const { error, value } = registerAssetSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const { loanId, assetType, metadata } = value

    // Verify loan exists
    const loan = await prisma.loan.findUnique({
      where: { id: loanId }
    })

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        }
      })
    }

    // Call MCP stub
    const mcpResp = await axios.post(`${MCP_BASE_URL}/tools/provenance/register-asset`, {
      loanId,
      metadata
    })
    const assetId = mcpResp.data?.assetId || mcpResp.data?.data?.assetId || null
    const transactionHash = mcpResp.data?.txHash || mcpResp.data?.data?.txHash || null

    // Update loan with blockchain information
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        blockchainAssetId: assetId,
        blockchainTransactionHash: transactionHash
      }
    })

    return res.json({
      success: true,
      data: {
        assetId,
        transactionHash,
        loan: updatedLoan
      }
    })
  } catch (error) {
    console.error('Register asset error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to register asset on blockchain'
      }
    })
  }
})

// Deploy smart contract
router.post('/deploy-contract', authenticateToken, async (req, res) => {
  try {
    const { error, value } = deployContractSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const { loanId, contractType, parameters } = value

    // Verify loan exists
    const loan = await prisma.loan.findUnique({
      where: { id: loanId }
    })

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found'
        }
      })
    }

    // Simulate smart contract deployment
    // In a real implementation, this would deploy to Provenance blockchain
    const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`

    // Update loan with contract information
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        blockchainContractAddress: contractAddress,
        blockchainTransactionHash: transactionHash
      }
    })

    res.json({
      success: true,
      data: {
        contractAddress,
        transactionHash,
        contractType,
        loan: updatedLoan
      }
    })
  } catch (error) {
    console.error('Deploy contract error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to deploy smart contract'
      }
    })
  }
})

// Get asset information from blockchain
router.get('/asset/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params

    // Find loan with this asset ID
    const loan = await prisma.loan.findFirst({
      where: { blockchainAssetId: assetId },
      include: {
        collateral: true,
        payments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    })

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found'
        }
      })
    }

    // Simulate blockchain asset query
    // In a real implementation, this would query Provenance blockchain
    const assetInfo = {
      assetId: loan.blockchainAssetId,
      contractAddress: loan.blockchainContractAddress,
      transactionHash: loan.blockchainTransactionHash,
      metadata: {
        borrowerName: loan.borrowerName,
        loanAmount: loan.loanAmount,
        interestRate: loan.interestRate,
        term: loan.loanTerm,
        status: loan.status,
        createdAt: loan.createdAt
      },
      provenance: {
        created: loan.createdAt,
        lastUpdated: loan.updatedAt,
        version: '1.0.0'
      }
    }

    res.json({
      success: true,
      data: { asset: assetInfo }
    })
  } catch (error) {
    console.error('Get asset error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to fetch asset information'
      }
    })
  }
})

// Process payment on blockchain (via MCP)
router.post('/process-payment', authenticateToken, async (req, res) => {
  try {
    const { loanId, paymentId, amount } = req.body

    if (!loanId || !paymentId || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'loanId, paymentId, and amount are required'
        }
      })
    }

    // Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { loan: true }
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        }
      })
    }

    if (payment.loanId !== loanId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT',
          message: 'Payment does not belong to this loan'
        }
      })
    }

    // Call MCP stub
    const mcpResp = await axios.post(`${MCP_BASE_URL}/tools/provenance/process-payment`, {
      loanId,
      paymentId,
      amount: Number(amount)
    })
    const transactionHash = mcpResp.data?.txHash || mcpResp.data?.data?.txHash || null
    const blockNumber = Date.now() // simulated placeholder since MCP stub doesn't return block

    // Update payment with blockchain information
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        blockchainTransactionHash: transactionHash,
        blockchainBlockNumber: blockNumber,
        status: 'paid',
        paidDate: new Date()
      }
    })

    return res.json({
      success: true,
      data: {
        transactionHash,
        blockNumber,
        payment: updatedPayment
      }
    })
  } catch (error) {
    console.error('Process payment on blockchain error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to process payment on blockchain'
      }
    })
  }
})

// Get blockchain network status (via MCP)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const mcpResp = await axios.get(`${MCP_BASE_URL}/tools/provenance/status`)
    const status = mcpResp.data
    return res.json({
      success: true,
      data: { status }
    })
  } catch (error) {
    console.error('Get blockchain status error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to fetch blockchain status'
      }
    })
  }
})

export default router
