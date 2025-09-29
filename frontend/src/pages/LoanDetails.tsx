import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
import { prepareLoanAssetForKeplr, signAndBroadcastWithKeplr, confirmBroadcastedTx } from '../services/blockchain'

interface Loan {
  id: string
  borrowerName: string
  borrowerEmail: string
  borrowerPhone: string
  amount: number
  interestRate: number
  term: number
  status: 'active' | 'pending' | 'completed' | 'defaulted' | 'approved'
  createdAt: string
  collateral: {
    type: string
    value: number
    description: string
  } | null
  loanPurpose: string
  monthlyPayment: number
  totalInterest: number
  totalAmount: number
  blockchain?: {
    assetId?: string | null
    contractAddress?: string | null
    transactionHash?: string | null
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
  status: 'paid' | 'pending' | 'overdue' | 'scheduled'
  paymentMethod?: string
  reference?: string
}

const buildPaymentHistoryFromPayments = (payments: Payment[]) => {
  // Aggregate by month; split into paid vs scheduled series
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
  const byMonth: Record<string, {
    amountPaid: number;
    amountScheduled: number;
    principal: number;
    interest: number;
  }> = {}

  payments.forEach(p => {
    const key = formatter.format(new Date(p.dueDate))
    if (!byMonth[key]) {
      byMonth[key] = { amountPaid: 0, amountScheduled: 0, principal: 0, interest: 0 }
    }
    const amt = Number(p.amount || 0)
    const principal = Number(p.principal || 0)
    const interest = Number(p.interest || 0)
    if (p.status === 'paid') {
      byMonth[key].amountPaid += amt
    } else {
      byMonth[key].amountScheduled += amt
    }
    byMonth[key].principal += principal
    byMonth[key].interest += interest
  })

  return Object.entries(byMonth).map(([month, v]) => ({ month, ...v }))
}

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLoanDetails = async () => {
      if (!id || !token) return
      try {
        setLoading(true)
        setError(null)
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiBase}/loans/${id}?t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error?.message || 'Failed to fetch loan')
        }
        const data = await res.json()
        const b = data.data.loan

        const mappedLoan: Loan = {
          id: b.id,
          borrowerName: b.borrowerName,
          borrowerEmail: b.borrowerEmail,
          borrowerPhone: b.borrowerPhone,
          amount: Number(b.loanAmount || 0),
          interestRate: Number(b.interestRate || 0),
          term: Number(b.loanTerm || 0),
          status: b.status,
          createdAt: b.createdAt,
          collateral: b.collateral ? {
            type: b.collateral.type,
            value: Number(b.collateral.value || 0),
            description: b.collateral.description
          } : null,
          loanPurpose: b.loanPurpose || '',
          monthlyPayment: Number(b.monthlyPayment || 0),
          totalInterest: Number(b.totalInterest || 0),
          totalAmount: Number(b.totalAmount || 0),
          blockchain: {
            assetId: b.blockchainAssetId || null,
            contractAddress: b.blockchainContractAddress || null,
            transactionHash: b.blockchainTransactionHash || null
          }
        }

        const mappedPayments: Payment[] = (b.payments || []).map((p: any) => ({
          id: p.id,
          amount: Number(p.amount || 0),
          principal: Number(p.principal || 0),
          interest: Number(p.interest || 0),
          fees: Number(p.fees || 0),
          dueDate: p.dueDate,
          paidDate: p.paidDate || undefined,
          status: p.status as Payment['status'],
          paymentMethod: p.paymentMethod || undefined,
          reference: p.reference || undefined
        }))

        setLoan(mappedLoan)
        setPayments(mappedPayments)
      } catch (e) {
        console.error('Loan details fetch failed:', e)
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchLoanDetails()
  }, [id, token])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleApproveAndBroadcast = async () => {
    if (!loan || !token) return
    try {
      setApproving(true)
      setApproveError(null)

      // Ensure Keplr account on Provenance testnet to obtain borrower address
      const defaultChainId = 'pio-testnet-1'
      if (!window.keplr || !window.getOfflineSignerAuto) {
        throw new Error('Keplr wallet not detected')
      }
      await window.keplr.enable(defaultChainId)
      const signer = await window.getOfflineSignerAuto(defaultChainId)
      const accounts = await signer.getAccounts()
      const borrowerAddress = accounts[0]?.address
      if (!borrowerAddress) throw new Error('No account in Keplr')

      // Prepare messages
      const prepared = await prepareLoanAssetForKeplr({
        token,
        loanId: loan.id,
        borrowerAddress,
        metadata: {
          borrowerName: loan.borrowerName,
          loanAmount: Number(loan.amount),
          interestRate: Number(loan.interestRate),
          loanTerm: Number(loan.term),
          createdAt: loan.createdAt
        }
      })

      // Sign and broadcast
      const txHash = await signAndBroadcastWithKeplr(
        prepared.chainId,
        prepared.rpc,
        prepared.messages,
        prepared.fee,
        prepared.memo
      )

      // Confirm and persist
      await confirmBroadcastedTx({ token, loanId: loan.id, txHash })

      // Update loan status to approved
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      await fetch(`${apiBase}/loans/${loan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      })

      // Refresh details
      window.location.reload()
    } catch (e) {
      console.error('Approve and broadcast failed:', e)
      setApproveError((e as Error).message)
    } finally {
      setApproving(false)
    }
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
      case 'approved':
        return 'bg-purple-100 text-purple-800'
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
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
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

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load loan</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
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
        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(loan.status)}`}>
            {loan.status}
          </span>
          {loan.status === 'pending' && (
            <button
              onClick={handleApproveAndBroadcast}
              disabled={approving}
              className="btn btn-primary"
              title="Approve loan and broadcast to Provenance testnet via Keplr"
            >
              {approving ? 'Broadcasting…' : 'Approve & Broadcast'}
            </button>
          )}
        </div>
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
                <dd className="text-sm text-gray-900 capitalize">{loan.collateral?.type?.replace('_', ' ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Value</dt>
                <dd className="text-sm text-gray-900">{loan.collateral ? formatCurrency(loan.collateral.value) : '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{loan.collateral?.description || '-'}</dd>
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
                  {(() => {
                    const next = [...payments]
                      .filter(p => p.status === 'scheduled')
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
                    return next ? new Date(next.dueDate).toLocaleDateString() : '-'
                  })()}
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
              {approveError && (
                <div className="text-sm text-red-600">{approveError}</div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Asset ID</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain?.assetId || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contract Address</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain?.contractAddress || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Transaction Hash</dt>
                <dd className="text-xs text-gray-900 font-mono break-all">{loan.blockchain?.transactionHash || '-'}</dd>
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
            <LineChart data={buildPaymentHistoryFromPayments(payments)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
              <Line type="monotone" dataKey="amountPaid" stroke="#16a34a" strokeWidth={2} name="Total Payment (Paid)" dot={{ r: 3, strokeWidth: 0, fill: '#16a34a' }} activeDot={{ r: 5, strokeWidth: 0, fill: '#16a34a' }} />
              <Line type="monotone" dataKey="amountScheduled" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 6" name="Total Payment (Scheduled)" dot={{ r: 3, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }} />
              <Line type="monotone" dataKey="principal" stroke="#7c3aed" strokeWidth={2} name="Principal" />
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
