import express from 'express'
import Joi from 'joi'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createLoanSchema = Joi.object({
  borrowerName: Joi.string().min(2).required(),
  borrowerEmail: Joi.string().email().required(),
  borrowerPhone: Joi.string().min(10).required(),
  borrowerSSN: Joi.string().pattern(/^\d{3}-\d{2}-\d{4}$/).required(),
  loanAmount: Joi.number().min(1000).max(10000000).required(),
  interestRate: Joi.number().min(0.1).max(30).required(),
  loanTerm: Joi.number().min(1).max(480).required(),
  loanPurpose: Joi.string().min(10).required(),
  collateralType: Joi.string().valid('real_estate', 'vehicle', 'equipment', 'securities', 'other').required(),
  collateralValue: Joi.number().min(1000).required(),
  collateralDescription: Joi.string().min(10).required(),
  employmentStatus: Joi.string().valid('employed', 'self_employed', 'unemployed', 'retired').required(),
  annualIncome: Joi.number().min(0).required(),
  creditScore: Joi.number().min(300).max(850).required()
})

const updateLoanSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'active', 'completed', 'defaulted', 'cancelled').optional(),
  notes: Joi.string().optional()
})

// Get all loans with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const status = req.query.status as string
    const borrower = req.query.borrower as string
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (borrower) where.borrowerName = { contains: borrower, mode: 'insensitive' }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          borrowerName: true,
          borrowerEmail: true,
          loanAmount: true,
          interestRate: true,
          loanTerm: true,
          status: true,
          createdAt: true,
          monthlyPayment: true
        }
      }),
      prisma.loan.count({ where })
    ])

    res.json({
      success: true,
      data: {
        loans,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get loans error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch loans'
      }
    })
  }
})

// Get loan by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { dueDate: 'asc' }
        },
        collateral: true
      }
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

    res.json({
      success: true,
      data: { loan }
    })
  } catch (error) {
    console.error('Get loan error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch loan'
      }
    })
  }
})

// Create new loan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = createLoanSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const {
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      borrowerSSN,
      loanAmount,
      interestRate,
      loanTerm,
      loanPurpose,
      collateralType,
      collateralValue,
      collateralDescription,
      employmentStatus,
      annualIncome,
      creditScore
    } = value

    // Calculate monthly payment
    const monthlyRate = interestRate / 100 / 12
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / 
                          (Math.pow(1 + monthlyRate, loanTerm) - 1)

    // Calculate total interest and amount
    const totalInterest = (monthlyPayment * loanTerm) - loanAmount
    const totalAmount = loanAmount + totalInterest

    // Create loan with collateral
    const loan = await prisma.loan.create({
      data: {
        borrowerName,
        borrowerEmail,
        borrowerPhone,
        borrowerSSN,
        loanAmount,
        interestRate,
        loanTerm,
        loanPurpose,
        monthlyPayment,
        totalInterest,
        totalAmount,
        status: 'pending',
        employmentStatus,
        annualIncome,
        creditScore,
        collateral: {
          create: {
            type: collateralType,
            value: collateralValue,
            description: collateralDescription
          }
        }
      },
      include: {
        collateral: true
      }
    })

    // Generate payment schedule
    const payments = []
    for (let i = 0; i < loanTerm; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + i + 1)
      
      // Calculate principal and interest for this payment
      const remainingBalance = loanAmount - (monthlyPayment * i)
      const interestPayment = remainingBalance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment

      payments.push({
        loanId: loan.id,
        amount: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        fees: 0,
        dueDate,
        status: 'scheduled'
      })
    }

    await prisma.payment.createMany({
      data: payments
    })

    res.status(201).json({
      success: true,
      data: { loan }
    })
  } catch (error) {
    console.error('Create loan error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create loan'
      }
    })
  }
})

// Update loan status
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { error, value } = updateLoanSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      })
    }

    const loan = await prisma.loan.findUnique({
      where: { id }
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

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: value,
      include: {
        collateral: true,
        payments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    })

    res.json({
      success: true,
      data: { loan: updatedLoan }
    })
  } catch (error) {
    console.error('Update loan error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update loan'
      }
    })
  }
})

// Delete loan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const loan = await prisma.loan.findUnique({
      where: { id }
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

    // Only allow deletion of pending loans
    if (loan.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Only pending loans can be deleted'
        }
      })
    }

    await prisma.loan.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Loan deleted successfully'
    })
  } catch (error) {
    console.error('Delete loan error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete loan'
      }
    })
  }
})

export default router
