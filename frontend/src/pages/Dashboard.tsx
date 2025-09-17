import { useState, useEffect } from 'react'
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
  status: 'active' | 'pending' | 'completed' | 'defaulted'
  createdAt: string
}

const mockStats: DashboardStats = {
  totalLoans: 1247,
  activeLoans: 892,
  totalAmount: 45600000,
  monthlyPayments: 2340000,
  loanGrowth: 12.5,
  paymentGrowth: 8.3
}

const mockRecentLoans: RecentLoan[] = [
  {
    id: '1',
    borrowerName: 'John Smith',
    amount: 250000,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    borrowerName: 'Sarah Johnson',
    amount: 180000,
    status: 'pending',
    createdAt: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    borrowerName: 'Michael Brown',
    amount: 320000,
    status: 'active',
    createdAt: '2024-01-13T09:15:00Z'
  },
  {
    id: '4',
    borrowerName: 'Emily Davis',
    amount: 150000,
    status: 'completed',
    createdAt: '2024-01-12T16:45:00Z'
  }
]

const mockChartData = [
  { month: 'Jan', loans: 45, payments: 1200000 },
  { month: 'Feb', loans: 52, payments: 1350000 },
  { month: 'Mar', loans: 48, payments: 1280000 },
  { month: 'Apr', loans: 61, payments: 1450000 },
  { month: 'May', loans: 55, payments: 1380000 },
  { month: 'Jun', loans: 67, payments: 1520000 }
]

const mockPaymentData = [
  { status: 'On Time', count: 756, percentage: 84.7 },
  { status: 'Late', count: 98, percentage: 11.0 },
  { status: 'Defaulted', count: 38, percentage: 4.3 }
]

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(mockStats)
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>(mockRecentLoans)

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
      default:
        return 'bg-gray-100 text-gray-800'
    }
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

      {/* Growth Indicators */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Loan Growth</h3>
              <p className="text-sm text-gray-500">Compared to last month</p>
            </div>
            <div className="flex items-center">
              <ArrowUpIcon className="h-5 w-5 text-green-500" />
              <span className="ml-1 text-lg font-semibold text-green-600">
                +{stats.loanGrowth}%
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Payment Growth</h3>
              <p className="text-sm text-gray-500">Compared to last month</p>
            </div>
            <div className="flex items-center">
              <ArrowUpIcon className="h-5 w-5 text-green-500" />
              <span className="ml-1 text-lg font-semibold text-green-600">
                +{stats.paymentGrowth}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Loan Trends Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'loans' ? value : formatCurrency(Number(value)),
                    name === 'loans' ? 'Loans' : 'Payments'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="loans" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="loans"
                />
                <Line 
                  type="monotone" 
                  dataKey="payments" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="payments"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockPaymentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Loans */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Loans</h3>
        </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
