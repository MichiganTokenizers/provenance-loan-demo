import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock user for demo purposes
  const [user, setUser] = useState<User | null>({
    id: 'demo-user-123',
    email: 'demo@michigantokenizers.com',
    name: 'Demo User',
    role: 'banker'
  })
  const [token, setToken] = useState<string | null>('demo-token-123')
  const [loading, setLoading] = useState(false)

  // Skip real authentication for demo
  useEffect(() => {
    setLoading(false)
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.data.user)
        } else {
          localStorage.removeItem('token')
          setToken(null)
        }
      } else {
        localStorage.removeItem('token')
        setToken(null)
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - always succeeds for demo
    return true
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    // Mock register - always succeeds for demo
    return true
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
