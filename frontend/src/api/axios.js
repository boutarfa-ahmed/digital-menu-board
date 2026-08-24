import axios from 'axios'

let authToken = localStorage.getItem('token')
let refreshToken = localStorage.getItem('refreshToken')

export const setAuthToken = (token) => {
  authToken = token
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

export const setRefreshToken = (token) => {
  refreshToken = token
  if (token) {
    localStorage.setItem('refreshToken', token)
  } else {
    localStorage.removeItem('refreshToken')
  }
}

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

function forceLogout() {
  setAuthToken(null)
  setRefreshToken(null)
  localStorage.removeItem('user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// The access token expires well before the admin is done working (15m-8h
// depending on config) — without this, that 401 logged them out mid-edit.
// One in-flight refresh at a time: refresh tokens are single-use and rotate
// server-side, so two concurrent 401s racing their own /auth/refresh call
// would have the second one fail on an already-invalidated token.
let refreshPromise = null

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        setAuthToken(data.accessToken)
        setRefreshToken(data.refreshToken)
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isRefreshCall = config?.url === '/auth/refresh'

    if (response?.status === 401 && refreshToken && !isRefreshCall && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true
      try {
        const newToken = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${newToken}`
        return api(config)
      } catch {
        forceLogout()
        return Promise.reject(error)
      }
    }

    if (response?.status === 401) {
      forceLogout()
    }
    return Promise.reject(error)
  },
)

export default api
