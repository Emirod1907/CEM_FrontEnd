const trimTrailingSlash = (value) => value.replace(/\/+$/, '')
const stripApiSuffix = (value) => value.replace(/\/api\/?$/, '')

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export const BACKEND_URL = stripApiSuffix(trimTrailingSlash(rawBackendUrl))

const rawApiUrl = import.meta.env.VITE_API_URL || `${BACKEND_URL}/api`
export const API_URL = `${trimTrailingSlash(rawApiUrl)}/`

export const GOOGLE_AUTH_URL = `${BACKEND_URL}/api/auth/google`
