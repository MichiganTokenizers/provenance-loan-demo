import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Payment {
  id: string
  loanId: string
  borrowerName: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  paymentMethod?: string
  reference?: string
  principal: number
  interest: number
  fees: number
}

const mockPayments: Payment[] = [
  {
    id: '1',
    loanId: 'LOAN-001',
    borrowerName: 'John Smith',
    amount: 1250.00,
    dueDate: '2024-01-15T00:00:00Z',
    paidDate: '2024-01-14T10:30:00Z',
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    reference: 'TXN123456',
    principal: 1000.00,
    interest: 200.00,
    fees: 50.00
  },
  {
    id: '2',
    loanId: 'LOAN-002',
    borrowerName: 'Sarah Johnson',
    amount: 850.00,
    dueDate: '2024-01-20T00:00:00Z',
    status: 'pending',
    principal: 700.00,
    interest: 120.00,
    fees: 30.00
  },
  {
    id: '3',
    loanId: 'LOAN-003',
    borrowerName: 'Michael Brown',
    amount: 2100.00,
    dueDate: '2024-01-10T00:00:00Z',
    status: 'overdue',
    principal: 1800.00,
    interest: 250.00,
    fees: 50.00
  },
  {
    id: '4',
    loanId: 'LOAN-004',
    borrowerName: 'Emily Davis',
    amount: 950.00,
    dueDate: '2024-01-25T00:00:00Z',
    paidDate: '2024-01-24T14:20:00Z',
    status: 'paid',
    paymentMethod: 'ACH',
    reference: 'TXN789012',
    principal: 800.00,
    interest: 130.00,
    fees: 20.00
  }
]

const statusColors = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  partial: 'bg-blue-100 text-blue-800'
}

const statusIcons = {
  paid: CheckCircleIcon,
  pending: ClockIcon,
  overdue: ExclamationTriangleIcon,
  partial: ClockIcon
}

export default function PaymentTracker() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>(mockPayments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

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
      ['Loan ID', 'Borrower', 'Amount', 'Due Date', 'Status', 'Payment Method', 'Reference'],
      ...filteredPayments.map(payment => [
        payment.loanId,
        payment.borrowerName,
        payment.amount.toString(),
        format(new Date(payment.dueDate), 'MM/dd/yyyy'),
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

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const paidAmount = filteredPayments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const pendingAmount = filteredPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const overdueAmount = filteredPayments
    .filter(payment => payment.status === 'overdue')
    .reduce((sum, payment) => sum + payment.amount, 0)

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
        <button
          onClick={exportPayments}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export
        </button>
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
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalAmount)}
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
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <ClockIcon className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(pendingAmount)}
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

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
