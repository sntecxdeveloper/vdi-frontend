import { useEffect, useState, type SubmitEvent } from 'react'
import logo from './assets/sntecx-logo-cropped.png'
import { login, logout, isSessionValid, getUserPermissions, type GuacConnection } from './services/guacamole'
import { ConnectionList } from './components/ConnectionList'
import { VmSession } from './components/VmSession'
import { Dashboard } from './components/Dashboard'
import './App.css'

const features = [
  {
    title: 'Virtual Desktops',
    description: 'Access your workspace from any device',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '24/7 Support',
    description: 'Dedicated technical assistance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 13a8 8 0 0116 0" strokeLinecap="round" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      </svg>
    ),
  },
]

interface GuacSession {
  authToken: string
  dataSource: string
  username: string
  isAdmin: boolean
}

type View =
  | { name: 'login' }
  | { name: 'dashboard'; session: GuacSession }
  | { name: 'connections'; session: GuacSession }
  | { name: 'session'; session: GuacSession; connection: GuacConnection }

const SESSION_STORAGE_KEY = 'sntecx-vdi-session'

function loadStoredSession(): GuacSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuacSession
  } catch {
    return null
  }
}

function storeSession(session: GuacSession | null) {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // sessionStorage unavailable (private browsing, etc.) - session just won't survive a refresh
  }
}

async function checkIsAdmin(token: string, dataSource: string, username: string): Promise<boolean> {
  try {
    const perms = await getUserPermissions(token, dataSource, username)
    return perms.systemPermissions.includes('ADMINISTER')
  } catch {
    return false
  }
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [view, setView] = useState<View>({ name: 'login' })
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  useEffect(() => {
    const stored = loadStoredSession()
    if (!stored) {
      setIsRestoringSession(false)
      return
    }

    let cancelled = false
    isSessionValid(stored.authToken)
      .then((valid) => {
        if (cancelled) return
        if (valid) {
          if (stored.isAdmin) {
            setView({ name: 'dashboard', session: stored })
          } else {
            setView({ name: 'connections', session: stored })
          }
        } else {
          storeSession(null)
        }
      })
      .catch(() => {
        if (!cancelled) storeSession(null)
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Please enter both username and password.')
      return
    }

    setIsSubmitting(true)
    try {
      const data = await login(username, password)
      setPassword('')
      const resolvedDataSource = data.availableDataSources.includes('mysql') ? 'mysql' : data.dataSource
      const isAdmin = await checkIsAdmin(data.authToken, resolvedDataSource, data.username)
      const session: GuacSession = {
        authToken: data.authToken,
        dataSource: resolvedDataSource,
        username: data.username,
        isAdmin,
      }
      storeSession(session)
      if (isAdmin) {
        setView({ name: 'dashboard', session })
      } else {
        setView({ name: 'connections', session })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout(session: GuacSession) {
    try {
      await logout(session.authToken)
    } finally {
      storeSession(null)
      setUsername('')
      setView({ name: 'login' })
    }
  }

  if (isRestoringSession) {
    return <div className="page" />
  }

  if (view.name === 'dashboard') {
    return (
      <Dashboard
        token={view.session.authToken}
        dataSource={view.session.dataSource}
        username={view.session.username}
        onLogout={() => handleLogout(view.session)}
        onViewConnections={() => setView({ name: 'connections', session: view.session })}
      />
    )
  }

  if (view.name === 'connections') {
    return (
      <ConnectionList
        token={view.session.authToken}
        dataSource={view.session.dataSource}
        username={view.session.username}
        isAdmin={view.session.isAdmin}
        onSelect={(connection) => setView({ name: 'session', session: view.session, connection })}
        onLogout={() => handleLogout(view.session)}
        onViewDashboard={() => setView({ name: 'dashboard', session: view.session })}
      />
    )
  }

  if (view.name === 'session') {
    return (
      <VmSession
        token={view.session.authToken}
        dataSource={view.session.dataSource}
        connectionId={view.connection.identifier}
        connectionName={view.connection.name}
        onDisconnect={() => setView({ name: 'connections', session: view.session })}
      />
    )
  }

  return (
    <div className="page">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout">
        <section className="brand">
          <img src={logo} alt="SNTecX" className="brand-logo" />

          <h1 className="brand-heading">
            Welcome to
            <span className="accent"> SNTecX Workspace</span>
          </h1>
          <p className="brand-subtext">
            Secure remote access to your virtual desktop, anytime, anywhere.
          </p>

          <ul className="feature-list">
            {features.map((feature) => (
              <li className="feature" key={feature.title}>
                <span className="feature-icon">{feature.icon}</span>
                <div>
                  <p className="feature-title">{feature.title}</p>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="login-card">
          <h2 className="login-title">Sign In</h2>
          <p className="login-subtitle">Enter your credentials to access your virtual desktop</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <p className="login-footer">Secure sign-in powered by SNTecX</p>
        </section>
      </main>
    </div>
  )
}

export default App
