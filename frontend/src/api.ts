import axios from 'axios'

// En vacío usa rutas relativas (/api/...), que el proxy de Vite redirige al backend.
// Esto funciona igual desde localhost o desde el celular en la misma red WiFi.
const API_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: API_URL,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
