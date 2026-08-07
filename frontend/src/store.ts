import { create } from 'zustand'
import apiClient from './api'

interface AuthStore {
  token: string | null
  user: any | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: any) => void
}

export const useStore = create<AuthStore>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),

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
