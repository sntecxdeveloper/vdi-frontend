import { useEffect, useState } from 'react'
import { getConnections, type GuacConnection } from '../services/guacamole'

interface Props {
  token: string
  dataSource: string
  username: string
  isAdmin: boolean
  onSelect: (connection: GuacConnection) => void
  onLogout: () => void
  onViewDashboard: () => void
}

export function ConnectionList({
  token,
  dataSource,
  username,
  isAdmin,
  onSelect,
  onLogout,
  onViewDashboard,
}: Props) {
  const [connections, setConnections] = useState<GuacConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getConnections(token, dataSource)
      .then((data) => {
        if (cancelled) return
        setConnections(Object.values(data))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load connections')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, dataSource])

  return (
    <div className="page">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout connections-layout">
        <section className="login-card connections-card">
          <div className="connections-header">
            <div>
              <h2 className="login-title">Your Virtual Desktops</h2>
              <p className="login-subtitle">Signed in as {username}</p>
            </div>
            <div className="dashboard-header-actions">
              {isAdmin && (
                <button className="logout-button" onClick={onViewDashboard}>
                  Dashboard
                </button>
              )}
              <button className="logout-button" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>

          {loading && <p className="connections-status">Loading connections…</p>}
          {!loading && error && <p className="form-error">{error}</p>}
          {!loading && !error && connections.length === 0 && (
            <p className="connections-status">No virtual desktops are assigned to this account.</p>
          )}

          {!loading && !error && connections.length > 0 && (
            <ul className="connection-list">
              {connections.map((conn) => (
                <li key={conn.identifier}>
                  <button className="connection-item" onClick={() => onSelect(conn)}>
                    <span className="connection-name">{conn.name}</span>
                    <span className="connection-protocol">{conn.protocol.toUpperCase()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
