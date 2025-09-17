import express from 'express'
import Joi from 'joi'
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

// Register asset on Provenance blockchain
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

    // Simulate blockchain asset registration
    // In a real implementation, this would interact with Provenance blockchain
    const assetId = `provenance_asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`

    // Update loan with blockchain information
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        blockchainAssetId: assetId,
        blockchainTransactionHash: transactionHash
      }
    })

    res.json({
      success: true,
      data: {
        assetId,
        transactionHash,
        loan: updatedLoan
      }
    })
  } catch (error) {
    console.error('Register asset error:', error)
    res.status(500).json({
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

// Process payment on blockchain
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

    // Simulate blockchain payment processing
    // In a real implementation, this would process payment on Provenance blockchain
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`
    const blockNumber = Math.floor(Math.random() * 1000000) + 1000000

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

    res.json({
      success: true,
      data: {
        transactionHash,
        blockNumber,
        payment: updatedPayment
      }
    })
  } catch (error) {
    console.error('Process payment on blockchain error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to process payment on blockchain'
      }
    })
  }
})

// Get blockchain network status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Simulate blockchain status check
    // In a real implementation, this would check Provenance blockchain status
    const status = {
      network: process.env.PROVENANCE_NETWORK || 'testnet',
      rpcUrl: process.env.PROVENANCE_RPC_URL || 'https://rpc.test.provenance.io',
      chainId: process.env.PROVENANCE_CHAIN_ID || 'pio-testnet-1',
      status: 'connected',
      lastBlock: Math.floor(Math.random() * 1000000) + 1000000,
      gasPrice: '0.000000001',
      uptime: '99.9%'
    }

    res.json({
      success: true,
      data: { status }
    })
  } catch (error) {
    console.error('Get blockchain status error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'BLOCKCHAIN_ERROR',
        message: 'Failed to fetch blockchain status'
      }
    })
  }
})

export default router
