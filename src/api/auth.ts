const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface LoginResponse {
  token: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Invalid username or password')
  }

  return response.json()
}
