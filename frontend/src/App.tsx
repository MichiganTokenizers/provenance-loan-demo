import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import LoanCreation from './pages/LoanCreation'
import PaymentTracker from './pages/PaymentTracker'
import LoanDetails from './pages/LoanDetails'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/loans/create" element={<LoanCreation />} />
          <Route path="/loans/:id" element={<LoanDetails />} />
          <Route path="/payments" element={<PaymentTracker />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </div>
  )
}

export default App
