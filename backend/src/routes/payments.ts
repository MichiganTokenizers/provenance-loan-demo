import express from 'express'
import Joi from 'joi'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const processPaymentSchema = Joi.object({
  loanId: Joi.string().required(),
  amount: Joi.number().min(0.01).required(),
  paymentMethod: Joi.string().valid('bank_transfer', 'ach', 'wire', 'check', 'cash').required(),
  reference: Joi.string().optional(),
  notes: Joi.string().optional()
})

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('paid', 'pending', 'overdue', 'cancelled').optional(),
  paidDate: Joi.date().optional(),
  paymentMethod: Joi.string().optional(),
  reference: Joi.string().optional(),
  notes: Joi.string().optional()
})

// Get all payments with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const loanId = req.query.loanId as string
    const status = req.query.status as string
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string
    const skip = (page - 1) * limit

    const where: any = {}
    if (loanId) where.loanId = loanId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.dueDate = {}
      if (dateFrom) where.dueDate.gte = new Date(dateFrom)
      if (dateTo) where.dueDate.lte = new Date(dateTo)
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' },
        include: {
          loan: {
            select: {
              id: true,
              borrowerName: true,
              borrowerEmail: true
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ])

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get payments error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payments'
      }
    })
  }
})

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            id: true,
            borrowerName: true,
            borrowerEmail: true,
            loanAmount: true,
            interestRate: true
          }
        }
      }
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

    res.json({
      success: true,
      data: { payment }
    })
  } catch (error) {
    console.error('Get payment error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payment'
      }
    })
  }
})

// Process a payment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = processPaymentSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const { loanId, amount, paymentMethod, reference, notes } = value

    // Verify loan exists and is active
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

    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LOAN_STATUS',
          message: 'Only active loans can receive payments'
        }
      })
    }

    // Find the next pending payment
    const nextPayment = await prisma.payment.findFirst({
      where: {
        loanId,
        status: 'pending'
      },
      orderBy: { dueDate: 'asc' }
    })

    if (!nextPayment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PENDING_PAYMENTS',
          message: 'No pending payments found for this loan'
        }
      })
    }

    // Check if payment amount matches expected amount
    if (Math.abs(amount - nextPayment.amount) > 0.01) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_AMOUNT',
          message: `Payment amount must be ${nextPayment.amount}`
        }
      })
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: nextPayment.id },
      data: {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod,
        reference,
        notes
      }
    })

    // Check if this was the last payment
    const remainingPayments = await prisma.payment.count({
      where: {
        loanId,
        status: 'pending'
      }
    })

    if (remainingPayments === 0) {
      // Mark loan as completed
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'completed' }
      })
    }

    res.json({
      success: true,
      data: { payment: updatedPayment }
    })
  } catch (error) {
    console.error('Process payment error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process payment'
      }
    })
  }
})

// Update payment
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { error, value } = updatePaymentSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const payment = await prisma.payment.findUnique({
      where: { id }
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

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: value,
      include: {
        loan: {
          select: {
            id: true,
            borrowerName: true,
            borrowerEmail: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: { payment: updatedPayment }
    })
  } catch (error) {
    console.error('Update payment error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update payment'
      }
    })
  }
})

// Get payment statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const where: any = {}
    if (dateFrom || dateTo) {
      where.dueDate = {}
      if (dateFrom) where.dueDate.gte = new Date(dateFrom)
      if (dateTo) where.dueDate.lte = new Date(dateTo)
    }

    const [
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      totalCount,
      paidCount,
      pendingCount,
      overdueCount
    ] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...where, status: 'pending' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...where, status: 'overdue' },
        _sum: { amount: true }
      }),
      prisma.payment.count({ where }),
      prisma.payment.count({ where: { ...where, status: 'paid' } }),
      prisma.payment.count({ where: { ...where, status: 'pending' } }),
      prisma.payment.count({ where: { ...where, status: 'overdue' } })
    ])

    res.json({
      success: true,
      data: {
        totalAmount: totalAmount._sum.amount || 0,
        paidAmount: paidAmount._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        overdueAmount: overdueAmount._sum.amount || 0,
        totalCount,
        paidCount,
        pendingCount,
        overdueCount
      }
    })
  } catch (error) {
    console.error('Get payment stats error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payment statistics'
      }
    })
  }
})

export default router
