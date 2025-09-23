import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  BanknotesIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardStats {
  totalLoans: number
  activeLoans: number
  totalAmount: number
  monthlyPayments: number
  loanGrowth: number
  paymentGrowth: number
}

interface RecentLoan {
  id: string
  borrowerName: string
  amount: number
  status: 'active' | 'pending' | 'completed' | 'defaulted' | 'approved'
  createdAt: string
}

// Empty initial data - will be populated from API
const initialStats: DashboardStats = {
  totalLoans: 0,
  activeLoans: 0,
  totalAmount: 0,
  monthlyPayments: 0,
  loanGrowth: 0,
  paymentGrowth: 0
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const { token } = useAuth()

  // Fetch loans data on component mount
  useEffect(() => {
    const fetchLoans = async () => {
      if (!token) return
      
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiBase}/loans?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const loans = data.data.loans || []
            // Map to UI shape and ensure numeric conversions
            const mappedRecentLoans = loans.slice(0, 5).map((loan: any) => ({
              id: loan.id,
              borrowerName: loan.borrowerName,
              amount: Number(loan.loanAmount || 0),
              status: loan.status,
              createdAt: loan.createdAt
            }))
            setRecentLoans(mappedRecentLoans)
            
            // Calculate stats from real data
            const totalLoans = loans.length
            const activeLoans = loans.filter((loan: any) => loan.status === 'active' || loan.status === 'pending').length
            const totalAmount = loans.reduce((sum: number, loan: any) => sum + Number(loan.loanAmount || 0), 0)
            const monthlyPayments = loans.reduce((sum: number, loan: any) => sum + Number(loan.monthlyPayment || 0), 0)
            
            setStats({
              totalLoans,
              activeLoans,
              totalAmount,
              monthlyPayments,
              loanGrowth: 0, // Could calculate from historical data
              paymentGrowth: 0 // Could calculate from historical data
            })
          }
        }
      } catch (error) {
        console.error('Error fetching loans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLoans()
  }, [token])

  // Listen for payment processing events to refresh data
  useEffect(() => {
    const handlePaymentProcessed = () => {
      fetchLoans()
    }

    window.addEventListener('paymentProcessed', handlePaymentProcessed)
    return () => window.removeEventListener('paymentProcessed', handlePaymentProcessed)
  }, [token])

  const approveLoan = async (loanId: string) => {
    if (!token) return
    try {
      setApprovingId(loanId)
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiBase}/loans/${loanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to approve loan')
      }
      // Update UI state
      setRecentLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'approved' as any } : l))
      // Recompute stats quickly
      setStats(prev => ({
        ...prev,
        activeLoans: prev.activeLoans + 1
      }))
    } catch (e) {
      console.error('Approve loan failed:', e)
      alert((e as Error).message)
    } finally {
      setApprovingId(null)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Loading your loan data...</p>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your loan portfolio and payment tracking system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Loans
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.totalLoans.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Loans
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.activeLoans.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Amount
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.totalAmount)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Monthly Payments
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.monthlyPayments)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Loans */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Loans</h3>
        </div>
        {recentLoans.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loan.borrowerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(loan.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {loan.status === 'pending' ? (
                        <button
                          onClick={() => approveLoan(loan.id)}
                          disabled={approvingId === loan.id}
                          className={`btn btn-primary ${approvingId === loan.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {approvingId === loan.id ? 'Approving…' : 'Approve'}
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No loans yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first loan.
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
        )}
      </div>
    </div>
  )
}
