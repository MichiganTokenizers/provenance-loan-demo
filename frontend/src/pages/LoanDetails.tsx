import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Loan {
  id: string
  borrowerName: string
  borrowerEmail: string
  borrowerPhone: string
  amount: number
  interestRate: number
  term: number
  status: 'active' | 'pending' | 'completed' | 'defaulted'
  createdAt: string
  collateral: {
    type: string
    value: number
    description: string
  }
  loanPurpose: string
  monthlyPayment: number
  totalInterest: number
  totalAmount: number
  blockchain: {
    assetId: string
    contractAddress: string
    transactionHash: string
  }
}

interface Payment {
  id: string
  amount: number
  principal: number
  interest: number
  fees: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'pending' | 'overdue'
  paymentMethod?: string
  reference?: string
}

const mockLoan: Loan = {
  id: 'LOAN-001',
  borrowerName: 'John Smith',
  borrowerEmail: 'john.smith@email.com',
  borrowerPhone: '(555) 123-4567',
  amount: 250000,
  interestRate: 5.5,
  term: 360,
  status: 'active',
  createdAt: '2024-01-15T10:30:00Z',
  collateral: {
    type: 'real_estate',
    value: 350000,
    description: 'Residential property located at 123 Main St, Anytown, USA'
  },
  loanPurpose: 'Home purchase for primary residence',
  monthlyPayment: 1418.72,
  totalInterest: 260739.20,
  totalAmount: 510739.20,
  blockchain: {
    assetId: 'provenance_asset_12345',
    contractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }
}

const mockPayments: Payment[] = [
  {
    id: '1',
    amount: 1418.72,
    principal: 283.22,
    interest: 1145.83,
    fees: 0,
    dueDate: '2024-02-15T00:00:00Z',
    paidDate: '2024-02-14T10:30:00Z',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    reference: 'TXN123456'
  },
  {
    id: '2',
    amount: 1418.72,
    principal: 284.52,
    interest: 1144.53,
    fees: 0,
    dueDate: '2024-03-15T00:00:00Z',
    paidDate: '2024-03-14T09:15:00Z',
    status: 'paid',
    paymentMethod: 'ACH',
    reference: 'TXN789012'
  },
  {
    id: '3',
    amount: 1418.72,
    principal: 285.82,
    interest: 1143.23,
    fees: 0,
    dueDate: '2024-04-15T00:00:00Z',
    status: 'pending'
  },
  {
    id: '4',
    amount: 1418.72,
    principal: 287.13,
    interest: 1141.92,
    fees: 0,
    dueDate: '2024-05-15T00:00:00Z',
    status: 'pending'
  }
]

const mockPaymentHistory = [
  { month: 'Jan 2024', amount: 1418.72, principal: 281.92, interest: 1146.83 },
  { month: 'Feb 2024', amount: 1418.72, principal: 283.22, interest: 1145.83 },
  { month: 'Mar 2024', amount: 1418.72, principal: 284.52, interest: 1144.53 },
  { month: 'Apr 2024', amount: 1418.72, principal: 285.82, interest: 1143.23 },
]

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchLoanDetails = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLoan(mockLoan)
      setPayments(mockPayments)
      setLoading(false)
    }

    fetchLoanDetails()
  }, [id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'pending':
        return <ClockIcon className="h-4 w-4" />
      case 'overdue':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Loan not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The loan you're looking for doesn't exist or has been removed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-sm text-gray-500">Loan ID: {loan.id}</p>
          </div>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(loan.status)}`}>
          {loan.status}
        </span>
      </div>

      {/* Loan Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Borrower Information */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Borrower Information</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{loan.borrowerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{loan.borrowerEmail}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{loan.borrowerPhone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Loan Purpose</dt>
                <dd className="text-sm text-gray-900">{loan.loanPurpose}</dd>
              </div>
            </dl>
          </div>

          {/* Loan Terms */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Loan Terms</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Loan Amount</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(loan.amount)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Interest Rate</dt>
                <dd className="text-lg font-semibold text-gray-900">{loan.interestRate}%</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Term</dt>
                <dd className="text-lg font-semibold text-gray-900">{loan.term} months</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Monthly Payment</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(loan.monthlyPayment)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Interest</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(loan.totalInterest)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(loan.totalAmount)}</dd>
              </div>
            </dl>
          </div>

          {/* Collateral Information */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <HomeIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Collateral</h2>
            </div>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="text-sm text-gray-900 capitalize">{loan.collateral.type.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Value</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(loan.collateral.value)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{loan.collateral.description}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Next Payment</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(loan.monthlyPayment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(payments.find(p => p.status === 'pending')?.dueDate || '').toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Remaining Balance</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(loan.amount - payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.principal, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Blockchain Information */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Blockchain</h3>
            </div>
            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Asset ID</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain.assetId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contract Address</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain.contractAddress}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Transaction Hash</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain.transactionHash}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockPaymentHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Total Payment" />
              <Line type="monotone" dataKey="principal" stroke="#10b981" strokeWidth={2} name="Principal" />
              <Line type="monotone" dataKey="interest" stroke="#f59e0b" strokeWidth={2} name="Interest" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.principal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.interest)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.paymentMethod || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
