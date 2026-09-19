import { useState, type SubmitEvent } from 'react'
import logo from './assets/sntecx-logo-cropped.png'
import { login } from './api/auth'
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
    title: 'Enterprise Security',
    description: 'Bank-grade encryption & protection',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
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

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Please enter both username and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
            <span className="accent"> SNTecX VDI Solutions</span>
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
