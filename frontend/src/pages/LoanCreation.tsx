import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { 
  UserIcon, 
  BanknotesIcon, 
  HomeIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const loanSchema = z.object({
  // Borrower Information
  borrowerName: z.string().min(2, 'Borrower name must be at least 2 characters'),
  borrowerEmail: z.string().email('Invalid email address'),
  borrowerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  borrowerSSN: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX'),
  
  // Loan Details
  loanAmount: z.number().min(1000, 'Minimum loan amount is $1,000').max(10000000, 'Maximum loan amount is $10,000,000'),
  interestRate: z.number().min(0.1, 'Interest rate must be at least 0.1%').max(30, 'Interest rate cannot exceed 30%'),
  loanTerm: z.number().min(1, 'Loan term must be at least 1 month').max(480, 'Maximum loan term is 480 months'),
  loanPurpose: z.string().min(10, 'Please provide a detailed loan purpose'),
  
  // Collateral Information
  collateralType: z.enum(['real_estate', 'vehicle', 'equipment', 'securities', 'other']),
  collateralValue: z.number().min(1000, 'Collateral value must be at least $1,000'),
  collateralDescription: z.string().min(10, 'Please provide a detailed collateral description'),
  
  // Additional Information
  employmentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired']),
  annualIncome: z.number().min(0, 'Annual income cannot be negative'),
  creditScore: z.number().min(300, 'Credit score must be at least 300').max(850, 'Credit score cannot exceed 850'),
})

type LoanFormData = z.infer<typeof loanSchema>

const collateralTypes = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'securities', label: 'Securities' },
  { value: 'other', label: 'Other' },
]

const employmentStatuses = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
]

export default function LoanCreation() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { token } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    mode: 'onChange'
  })

  const watchedValues = watch()

  const steps = [
    { id: 1, name: 'Borrower Information', icon: UserIcon },
    { id: 2, name: 'Loan Details', icon: BanknotesIcon },
    { id: 3, name: 'Collateral', icon: HomeIcon },
    { id: 4, name: 'Review & Submit', icon: DocumentTextIcon },
  ]

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1:
        return ['borrowerName', 'borrowerEmail', 'borrowerPhone', 'borrowerSSN']
      case 2:
        return ['loanAmount', 'interestRate', 'loanTerm', 'loanPurpose']
      case 3:
        return ['collateralType', 'collateralValue', 'collateralDescription']
      case 4:
        return ['employmentStatus', 'annualIncome', 'creditScore']
      default:
        return []
    }
  }

  const onSubmit = async (data: LoanFormData) => {
    setIsSubmitting(true)
    setSubmissionStatus('idle')

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiBase}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          borrowerName: data.borrowerName,
          borrowerEmail: data.borrowerEmail,
          borrowerPhone: data.borrowerPhone,
          borrowerSSN: data.borrowerSSN,
          loanAmount: data.loanAmount,
          interestRate: data.interestRate,
          loanTerm: data.loanTerm,
          loanPurpose: data.loanPurpose,
          collateralType: data.collateralType,
          collateralValue: data.collateralValue,
          collateralDescription: data.collateralDescription,
          employmentStatus: data.employmentStatus,
          annualIncome: data.annualIncome,
          creditScore: data.creditScore
        })
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const result = await response.json()
      if (result?.success) {
        setSubmissionStatus('success')
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Error submitting loan application:', error)
      setSubmissionStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateMonthlyPayment = (amount: number, rate: number, term: number) => {
    const monthlyRate = rate / 100 / 12
    const monthlyTerm = term
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, monthlyTerm)) / 
                   (Math.pow(1 + monthlyRate, monthlyTerm) - 1)
    return isNaN(payment) ? 0 : payment
  }

  const monthlyPayment = calculateMonthlyPayment(
    watchedValues.loanAmount || 0,
    watchedValues.interestRate || 0,
    watchedValues.loanTerm || 0
  )

  if (submissionStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Loan Application Submitted</h1>
          <p className="mt-2 text-gray-600">
            Your loan application has been successfully submitted and is being processed.
            You will receive an email confirmation shortly.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setSubmissionStatus('idle')
                setCurrentStep(1)
              }}
              className="btn btn-primary px-6 py-2"
            >
              Create Another Loan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Loan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete the loan application process with blockchain integration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    currentStep >= step.id
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-300 bg-white text-gray-500'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="ml-4 min-w-0">
                    <div className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                  </div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className={`absolute top-5 left-10 h-0.5 w-full ${
                    currentStep > step.id ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Step 1: Borrower Information */}
        {currentStep === 1 && (
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Borrower Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Full Name *</label>
                <input
                  {...register('borrowerName')}
                  className="input mt-1"
                  placeholder="Enter full name"
                />
                {errors.borrowerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.borrowerName.message}</p>
                )}
              </div>

              <div>
                <label className="label">Email Address *</label>
                <input
                  {...register('borrowerEmail')}
                  type="email"
                  className="input mt-1"
                  placeholder="Enter email address"
                />
                {errors.borrowerEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.borrowerEmail.message}</p>
                )}
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  {...register('borrowerPhone')}
                  type="tel"
                  className="input mt-1"
                  placeholder="(555) 123-4567"
                />
                {errors.borrowerPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.borrowerPhone.message}</p>
                )}
              </div>

              <div>
                <label className="label">Social Security Number *</label>
                <input
                  {...register('borrowerSSN')}
                  className="input mt-1"
                  placeholder="XXX-XX-XXXX"
                />
                {errors.borrowerSSN && (
                  <p className="mt-1 text-sm text-red-600">{errors.borrowerSSN.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Loan Details */}
        {currentStep === 2 && (
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Loan Details</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Loan Amount *</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('loanAmount', { valueAsNumber: true })}
                    type="number"
                    className="input pl-7"
                    placeholder="0"
                  />
                </div>
                {errors.loanAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.loanAmount.message}</p>
                )}
              </div>

              <div>
                <label className="label">Interest Rate (%) *</label>
                <div className="mt-1 relative">
                  <input
                    {...register('interestRate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="input pr-7"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
                {errors.interestRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.interestRate.message}</p>
                )}
              </div>

              <div>
                <label className="label">Loan Term (months) *</label>
                <input
                  {...register('loanTerm', { valueAsNumber: true })}
                  type="number"
                  className="input mt-1"
                  placeholder="360"
                />
                {errors.loanTerm && (
                  <p className="mt-1 text-sm text-red-600">{errors.loanTerm.message}</p>
                )}
              </div>

              <div>
                <label className="label">Monthly Payment</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(monthlyPayment)}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Loan Purpose *</label>
                <textarea
                  {...register('loanPurpose')}
                  rows={3}
                  className="input mt-1"
                  placeholder="Describe the purpose of this loan..."
                />
                {errors.loanPurpose && (
                  <p className="mt-1 text-sm text-red-600">{errors.loanPurpose.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Collateral */}
        {currentStep === 3 && (
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Collateral Information</h2>
            <div className="space-y-6">
              <div>
                <label className="label">Collateral Type *</label>
                <select {...register('collateralType')} className="input mt-1">
                  <option value="">Select collateral type</option>
                  {collateralTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.collateralType && (
                  <p className="mt-1 text-sm text-red-600">{errors.collateralType.message}</p>
                )}
              </div>

              <div>
                <label className="label">Collateral Value *</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('collateralValue', { valueAsNumber: true })}
                    type="number"
                    className="input pl-7"
                    placeholder="0"
                  />
                </div>
                {errors.collateralValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.collateralValue.message}</p>
                )}
              </div>

              <div>
                <label className="label">Collateral Description *</label>
                <textarea
                  {...register('collateralDescription')}
                  rows={4}
                  className="input mt-1"
                  placeholder="Provide detailed description of the collateral..."
                />
                {errors.collateralDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.collateralDescription.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Review & Submit</h2>
            
            {/* Additional Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-8">
              <div>
                <label className="label">Employment Status *</label>
                <select {...register('employmentStatus')} className="input mt-1">
                  <option value="">Select employment status</option>
                  {employmentStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {errors.employmentStatus && (
                  <p className="mt-1 text-sm text-red-600">{errors.employmentStatus.message}</p>
                )}
              </div>

              <div>
                <label className="label">Annual Income *</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('annualIncome', { valueAsNumber: true })}
                    type="number"
                    className="input pl-7"
                    placeholder="0"
                  />
                </div>
                {errors.annualIncome && (
                  <p className="mt-1 text-sm text-red-600">{errors.annualIncome.message}</p>
                )}
              </div>

              <div>
                <label className="label">Credit Score *</label>
                <input
                  {...register('creditScore', { valueAsNumber: true })}
                  type="number"
                  min="300"
                  max="850"
                  className="input mt-1"
                  placeholder="750"
                />
                {errors.creditScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.creditScore.message}</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Summary</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Borrower</dt>
                  <dd className="text-sm text-gray-900">{watchedValues.borrowerName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(watchedValues.loanAmount || 0)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Interest Rate</dt>
                  <dd className="text-sm text-gray-900">{watchedValues.interestRate}%</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Term</dt>
                  <dd className="text-sm text-gray-900">{watchedValues.loanTerm} months</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Monthly Payment</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(monthlyPayment)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Collateral Type</dt>
                  <dd className="text-sm text-gray-900">
                    {collateralTypes.find(t => t.value === watchedValues.collateralType)?.label}
                  </dd>
                </div>
              </dl>
            </div>

            {submissionStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                    <p className="mt-1 text-sm text-red-700">
                      There was an error submitting your loan application. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn btn-secondary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn btn-primary px-6 py-2"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
