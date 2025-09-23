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
  status: Joi.string().valid('paid', 'scheduled', 'pending', 'overdue', 'cancelled').optional(),
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
        orderBy: { dueDate: 'asc' },
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

    if (!['active', 'approved'].includes(loan.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LOAN_STATUS',
          message: 'Only approved or active loans can receive payments'
        }
      })
    }

        // Find the next scheduled payment
        const nextPayment = await prisma.payment.findFirst({
          where: {
            loanId,
            status: 'scheduled'
          },
          orderBy: { dueDate: 'asc' }
        })

        if (!nextPayment) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_SCHEDULED_PAYMENTS',
              message: 'No scheduled payments found for this loan'
            }
          })
        }

    // Require at least the next scheduled amount
    const nextAmountDue = Number(nextPayment.amount)
    if (amount + 1e-6 < nextAmountDue) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PAYMENT',
          message: `Payment must be at least ${nextPayment.amount}`
        }
      })
    }

    // 1) Pay the upcoming scheduled payment in full
    const paidNextPayment = await prisma.payment.update({
      where: { id: nextPayment.id },
      data: {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod,
        reference,
        notes
      }
    })

    // Write audit log entry for payment processing
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_PROCESSED',
        resource: 'payment',
        resourceId: paidNextPayment.id,
        newValues: {
          amount,
          paymentMethod,
          reference,
          extraPrincipalApplied: Math.max(0, amount - nextAmountDue)
        }
      }
    })

    // 2) Apply any extra amount as principal prepayment and re-amortize
    const extraPrincipal = amount - nextAmountDue
    if (extraPrincipal > 0) {
      // Record the principal reduction as its own paid payment row
      await prisma.payment.create({
        data: {
          loanId,
          amount: extraPrincipal,
          principal: extraPrincipal,
          interest: 0,
          fees: 0,
          // Use same due date as the scheduled payment to keep grouping
          dueDate: paidNextPayment.dueDate,
          paidDate: new Date(),
          status: 'paid',
          paymentMethod,
          reference: reference || 'PRINCIPAL_PREPAYMENT',
          notes: notes ? `${notes} (Principal reduction)` : 'Principal reduction'
        }
      })

      // Load all payments for this loan
      const allPayments = await prisma.payment.findMany({
        where: { loanId },
        orderBy: { dueDate: 'asc' }
      })

      // Sum principal already paid (including the just-paid next payment's principal)
      const principalPaidSoFar = allPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.principal), 0)

      // Current balance after applying extra principal
      const originalPrincipal = Number(loan.loanAmount)
      let remainingBalance = originalPrincipal - principalPaidSoFar - extraPrincipal

        // Collect remaining scheduled payments after the one we just paid
        const scheduledRemaining = allPayments
          .filter(p => p.status === 'scheduled' && p.dueDate > paidNextPayment.dueDate)
          .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))

      const remainingTerm = scheduledRemaining.length
      const monthlyRate = Number(loan.interestRate) / 100 / 12

      if (remainingTerm === 0) {
        // No remaining scheduled payments; if balance cleared, complete loan, else create a final payment
        if (remainingBalance <= 0.01) {
          await prisma.loan.update({ where: { id: loanId }, data: { status: 'completed' } })
        } else {
          // Create a single final payment for the small remaining balance
          await prisma.payment.create({
            data: {
              loanId,
              amount: remainingBalance,
              principal: remainingBalance,
              interest: 0,
              fees: 0,
              dueDate: new Date(paidNextPayment.dueDate.getTime() + 30 * 24 * 60 * 60 * 1000),
              status: 'scheduled'
            }
          })
        }
      } else {
        // If balance is paid off, cancel remaining payments and complete loan
        if (remainingBalance <= 0.01) {
          await prisma.payment.updateMany({
            where: { id: { in: scheduledRemaining.map(p => p.id) } },
            data: { status: 'cancelled' }
          })
          await prisma.loan.update({ where: { id: loanId }, data: { status: 'completed', monthlyPayment: 0 } })
        } else {
          // Re-amortize remaining schedule across existing due dates
          // Compute a new monthly payment using remaining balance and remaining term
          const newMonthly = monthlyRate === 0
            ? remainingBalance / remainingTerm
            : (remainingBalance * monthlyRate * Math.pow(1 + monthlyRate, remainingTerm)) /
              (Math.pow(1 + monthlyRate, remainingTerm) - 1)

          // Iteratively update each pending payment
          let balanceCursor = remainingBalance
          for (let i = 0; i < scheduledRemaining.length; i++) {
            const payment = scheduledRemaining[i]
            const interestPortion = monthlyRate === 0 ? 0 : balanceCursor * monthlyRate
            let principalPortion = newMonthly - interestPortion

            // Ensure final payment clears any residual rounding
            if (i === scheduledRemaining.length - 1) {
              principalPortion = Math.max(0, balanceCursor)
            }

            const amountThis = i === scheduledRemaining.length - 1 ? principalPortion + interestPortion : newMonthly

            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                amount: amountThis,
                principal: principalPortion,
                interest: interestPortion
              }
            })

            balanceCursor = Math.max(0, balanceCursor - principalPortion)
          }

          // Update loan's monthlyPayment to reflect new schedule
          await prisma.loan.update({
            where: { id: loanId },
            data: { monthlyPayment: newMonthly }
          })
        }
      }
    }

    // Return the updated state of the just-paid payment
    return res.json({
      success: true,
      data: { payment: paidNextPayment }
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
          scheduledAmount,
          overdueAmount,
          totalCount,
          paidCount,
          scheduledCount,
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
          where: { ...where, status: 'scheduled' },
          _sum: { amount: true }
        }),
      prisma.payment.aggregate({
        where: { ...where, status: 'overdue' },
        _sum: { amount: true }
      }),
      prisma.payment.count({ where }),
      prisma.payment.count({ where: { ...where, status: 'paid' } }),
      prisma.payment.count({ where: { ...where, status: 'scheduled' } }),
      prisma.payment.count({ where: { ...where, status: 'overdue' } })
    ])

        res.json({
          success: true,
          data: {
            totalAmount: totalAmount._sum.amount || 0,
            paidAmount: paidAmount._sum.amount || 0,
            scheduledAmount: scheduledAmount._sum.amount || 0,
            overdueAmount: overdueAmount._sum.amount || 0,
            totalCount,
            paidCount,
            scheduledCount,
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
