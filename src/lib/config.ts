const LS_API_BASE_URL = 'frd.apiBaseUrl'

export function getApiBaseUrl(): string {
  const fromLs = localStorage.getItem(LS_API_BASE_URL)
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (fromLs && fromLs.trim()) || (fromEnv && fromEnv.trim()) || ''
}

export function setApiBaseUrl(value: string) {
  localStorage.setItem(LS_API_BASE_URL, value.trim())
}

export function clearApiBaseUrl() {
  localStorage.removeItem(LS_API_BASE_URL)
}

