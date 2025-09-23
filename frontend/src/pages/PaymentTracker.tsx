import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Payment {
  id: string
  loanId: string
  borrowerName: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'scheduled' | 'pending' | 'overdue' | 'partial'
  paymentMethod?: string
  reference?: string
  principal: number
  interest: number
  fees: number
}

interface Loan {
  id: string
  borrowerName: string
  loanAmount: number
  status: string
}

interface PaymentFormData {
  loanId: string
  amount: number
  paymentMethod: string
  reference: string
  notes: string
}

// Empty initial data - will be populated from API

const statusColors = {
  paid: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  partial: 'bg-purple-100 text-purple-800'
}

const statusIcons = {
  paid: CheckCircleIcon,
  scheduled: ClockIcon,
  pending: ClockIcon,
  overdue: ExclamationTriangleIcon,
  partial: ClockIcon
}

export default function PaymentTracker() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    loanId: '',
    amount: 0,
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  })
  const { token } = useAuth()

  // Fetch payments and loans data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
        
        // Fetch payments
        const paymentsResponse = await fetch(`${apiBase}/payments?t=${Date.now()}` , {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })
        
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          if (paymentsData.success) {
            const mappedPayments = (paymentsData.data.payments || []).map((payment: any) => ({
              id: payment.id,
              loanId: payment.loanId,
              borrowerName: payment.loan?.borrowerName || 'Unknown',
              amount: Number(payment.amount || 0),
              dueDate: payment.dueDate,
              paidDate: payment.paidDate,
              status: payment.status,
              paymentMethod: payment.paymentMethod,
              reference: payment.reference,
              principal: Number(payment.principal || 0),
              interest: Number(payment.interest || 0),
              fees: Number(payment.fees || 0)
            }))
            setPayments(mappedPayments)
          }
        }

        // Fetch loans for payment form
        const loansResponse = await fetch(`${apiBase}/loans?t=${Date.now()}` , {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })
        
        if (loansResponse.ok) {
          const loansData = await loansResponse.json()
          if (loansData.success) {
            const mappedLoans = (loansData.data.loans || []).map((loan: any) => ({
              id: loan.id,
              borrowerName: loan.borrowerName,
              loanAmount: Number(loan.loanAmount || 0),
              status: loan.status
            }))
            setLoans(mappedLoans)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  // Refresh loans on demand (e.g., when opening the Add Payment modal)
  const refreshLoans = async () => {
    if (!token) return
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const loansResponse = await fetch(`${apiBase}/loans?t=${Date.now()}` , {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      if (loansResponse.ok) {
        const loansData = await loansResponse.json()
        if (loansData.success) {
          const mappedLoans = (loansData.data.loans || []).map((loan: any) => ({
            id: loan.id,
            borrowerName: loan.borrowerName,
            loanAmount: Number(loan.loanAmount || 0),
            status: loan.status
          }))
          setLoans(mappedLoans)
        }
      }
    } catch (e) {
      console.error('Error refreshing loans:', e)
    }
  }

  // Filter payments based on search and filter criteria
  useEffect(() => {
    let filtered = payments

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(payment => {
        const dueDate = new Date(payment.dueDate)
        
        switch (dateFilter) {
          case 'today':
            return dueDate.toDateString() === today.toDateString()
          case 'this_week':
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay())
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            return dueDate >= weekStart && dueDate <= weekEnd
          case 'this_month':
            return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()
          case 'overdue':
            return dueDate < today && payment.status !== 'paid'
          default:
            return true
        }
      })
    }

    setFilteredPayments(filtered)
  }, [payments, searchTerm, statusFilter, dateFilter])

  const handlePaymentFormChange = (field: keyof PaymentFormData, value: string | number) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }))
  }

  const handleProcessPayment = async () => {
    if (!token || !paymentForm.loanId || paymentForm.amount <= 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setProcessingPayment(true)
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiBase}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          loanId: paymentForm.loanId,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference,
          notes: paymentForm.notes
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Refresh both payments and loans data
          const [paymentsResponse, loansResponse] = await Promise.all([
            fetch(`${apiBase}/payments?t=${Date.now()}` , { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
            fetch(`${apiBase}/loans?t=${Date.now()}` , { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
          ])
          
          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json()
            if (paymentsData.success) {
              const mappedPayments = (paymentsData.data.payments || []).map((payment: any) => ({
                id: payment.id,
                loanId: payment.loanId,
                borrowerName: payment.loan?.borrowerName || 'Unknown',
                amount: Number(payment.amount || 0),
                dueDate: payment.dueDate,
                paidDate: payment.paidDate,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                reference: payment.reference,
                principal: Number(payment.principal || 0),
                interest: Number(payment.interest || 0),
                fees: Number(payment.fees || 0)
              }))
              setPayments(mappedPayments)
            }
          }

          if (loansResponse.ok) {
            const loansData = await loansResponse.json()
            if (loansData.success) {
              const mappedLoans = (loansData.data.loans || []).map((loan: any) => ({
                id: loan.id,
                borrowerName: loan.borrowerName,
                loanAmount: Number(loan.loanAmount || 0),
                status: loan.status
              }))
              setLoans(mappedLoans)
            }
          }
          
          // Reset form and close modal
          setPaymentForm({
            loanId: '',
            amount: 0,
            paymentMethod: 'bank_transfer',
            reference: '',
            notes: ''
          })
          setShowPaymentForm(false)
          
          // Trigger refresh of other components
          window.dispatchEvent(new CustomEvent('paymentProcessed'))
          
          alert('Payment processed successfully!')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to process payment')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      alert((error as Error).message)
    } finally {
      setProcessingPayment(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons]
    return <IconComponent className="h-4 w-4" />
  }

  const exportPayments = () => {
    const csvContent = [
      ['Loan ID', 'Borrower', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Payment Method', 'Reference'],
      ...filteredPayments.map(payment => [
        payment.loanId,
        payment.borrowerName,
        payment.amount.toString(),
        format(new Date(payment.dueDate), 'MM/dd/yyyy'),
        payment.paidDate ? format(new Date(payment.paidDate), 'MM/dd/yyyy') : '',
        payment.status,
        payment.paymentMethod || '',
        payment.reference || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Calculate outstanding loan amounts
  const calculateOutstandingAmount = () => {
    const loanOutstandingMap = new Map<string, number>()
    
    // Initialize with original loan amounts
    loans.forEach(loan => {
      if (loan.status === 'active' || loan.status === 'approved') {
        loanOutstandingMap.set(loan.id, loan.loanAmount)
      }
    })
    
    // Subtract paid principal from each loan
    payments.forEach(payment => {
      if (payment.status === 'paid') {
        const currentOutstanding = loanOutstandingMap.get(payment.loanId) || 0
        loanOutstandingMap.set(payment.loanId, Math.max(0, currentOutstanding - payment.principal))
      }
    })
    
    return Array.from(loanOutstandingMap.values()).reduce((sum, amount) => sum + amount, 0)
  }

  const outstandingAmount = calculateOutstandingAmount()
  const paidAmount = filteredPayments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const scheduledAmount = filteredPayments
    .filter(payment => payment.status === 'scheduled')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const overdueAmount = filteredPayments
    .filter(payment => payment.status === 'overdue')
    .reduce((sum, payment) => sum + payment.amount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">Loading payment data...</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Tracker</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor and manage loan payments in real-time
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => { await refreshLoans(); setShowPaymentForm(true) }}
                className="btn btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Payment
              </button>
              {payments.length > 0 && (
                <button
                  onClick={exportPayments}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export
                </button>
              )}
            </div>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Outstanding loan amounts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(outstandingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Paid</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(paidAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <ClockIcon className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(scheduledAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(overdueAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by borrower, loan ID, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.loanId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.borrowerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-gray-500">
                        P: {formatCurrency(payment.principal)} | 
                        I: {formatCurrency(payment.interest)} | 
                        F: {formatCurrency(payment.fees)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(payment.dueDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.paidDate ? format(new Date(payment.paidDate), 'MMM dd, yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.paymentMethod || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Payments will appear here once you create loans and they generate payment schedules.
            </p>
            <div className="mt-6">
              <a
                href="/loans/create"
                className="btn btn-primary"
              >
                Create Loan
              </a>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        ) : null}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowPaymentForm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Process Payment</h3>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form className="p-6 space-y-4">
                <div>
                  <label className="label">Loan</label>
                  <select
                    value={paymentForm.loanId}
                    onChange={(e) => handlePaymentFormChange('loanId', e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select a loan</option>
                    {loans.filter(loan => loan.status === 'active' || loan.status === 'approved').map(loan => (
                      <option key={loan.id} value={loan.id}>
                        {loan.borrowerName} - {formatCurrency(loan.loanAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount || ''}
                    onChange={(e) => handlePaymentFormChange('amount', parseFloat(e.target.value) || 0)}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="label">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => handlePaymentFormChange('paymentMethod', e.target.value)}
                    className="input"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="ach">ACH</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="label">Reference</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => handlePaymentFormChange('reference', e.target.value)}
                    className="input"
                    placeholder="Payment reference number"
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => handlePaymentFormChange('notes', e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Additional notes about this payment"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={processingPayment || !paymentForm.loanId || paymentForm.amount <= 0}
                    className="btn btn-primary"
                  >
                    {processingPayment ? 'Processing...' : 'Process Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
