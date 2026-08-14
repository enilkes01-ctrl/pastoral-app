import { create } from 'zustand'
import apiClient from './api'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const initialTheme: Theme = (localStorage.getItem('theme') as Theme) || 'light'
applyTheme(initialTheme)

interface AuthStore {
  token: string | null
  user: any | null
  isAuthenticated: boolean
  theme: Theme
  toggleTheme: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: any) => void
}

export const useStore = create<AuthStore>((set, get) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  theme: initialTheme,

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    applyTheme(next)
    set({ theme: next })
  },

  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    set({ token: data.token, user: data.user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token, isAuthenticated: true })
  },

  setUser: (user: any) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))
