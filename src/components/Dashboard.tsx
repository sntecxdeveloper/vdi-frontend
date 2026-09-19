import { useEffect, useState } from 'react'
import {
  getActiveConnections,
  getConnectionHistory,
  getConnections,
  getUserGroupPermissions,
  getUserGroups,
  getUserPermissions,
  getUsers,
  type GuacActiveConnection,
  type GuacConnection,
  type GuacHistoryEntry,
} from '../services/guacamole'

interface Props {
  token: string
  dataSource: string
  username: string
  onLogout: () => void
  onViewConnections: () => void
}

type SectionKey = 'active' | 'disconnected' | 'connections' | 'access'

interface DashboardData {
  activeSessions: GuacActiveConnection[]
  history: GuacHistoryEntry[]
  connections: GuacConnection[]
  entitiesWithAccess: { name: string; type: 'User' | 'Group' }[]
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString()
}

function formatDuration(startMs: number, endMs: number | null): string {
  const end = endMs ?? Date.now()
  const totalSeconds = Math.max(0, Math.round((end - startMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function Dashboard({ token, dataSource, username, onLogout, onViewConnections }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [active, history, connections, users, groups] = await Promise.all([
          getActiveConnections(token, dataSource),
          getConnectionHistory(token, dataSource),
          getConnections(token, dataSource),
          getUsers(token, dataSource),
          getUserGroups(token, dataSource),
        ])

        const userPermissionChecks = Object.keys(users).map(async (name) => {
          const perms = await getUserPermissions(token, dataSource, name)
          return { name, type: 'User' as const, hasAccess: Object.keys(perms.connectionPermissions).length > 0 }
        })

        const groupPermissionChecks = Object.keys(groups).map(async (name) => {
          const perms = await getUserGroupPermissions(token, dataSource, name)
          return { name, type: 'Group' as const, hasAccess: Object.keys(perms.connectionPermissions).length > 0 }
        })

        const results = await Promise.all([...userPermissionChecks, ...groupPermissionChecks])
        const entitiesWithAccess = results
          .filter((entry) => entry.hasAccess)
          .map((entry) => ({ name: entry.name, type: entry.type }))

        const historyList = Object.values(history) as GuacHistoryEntry[]
        const sortedHistory = [...historyList].sort((a, b) => b.startDate - a.startDate)

        if (cancelled) return
        setData({
          activeSessions: Object.values(active),
          history: sortedHistory,
          connections: Object.values(connections),
          entitiesWithAccess,
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token, dataSource])

  function toggleSection(key: SectionKey) {
    setExpandedSection((current) => (current === key ? null : key))
  }

  const disconnectedHistory = data ? data.history.filter((entry) => !entry.active) : []

  return (
    <div className="page">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout dashboard-layout">
        <section className="login-card dashboard-card">
          <div className="connections-header">
            <div>
              <h2 className="login-title">Admin Dashboard</h2>
              <p className="login-subtitle">Signed in as {username}</p>
            </div>
            <div className="dashboard-header-actions">
              <button className="logout-button" onClick={onViewConnections}>
                My Desktops
              </button>
              <button className="logout-button" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>

          {loading && <p className="connections-status">Loading dashboard…</p>}
          {!loading && error && <p className="form-error">{error}</p>}

          {!loading && !error && data && (
            <>
              <div className="stat-grid">
                <button
                  type="button"
                  className={`stat-card${expandedSection === 'active' ? ' stat-card-active' : ''}`}
                  onClick={() => toggleSection('active')}
                >
                  <span className="stat-value">{data.activeSessions.length}</span>
                  <span className="stat-label">Active Sessions</span>
                </button>
                <button
                  type="button"
                  className={`stat-card${expandedSection === 'disconnected' ? ' stat-card-active' : ''}`}
                  onClick={() => toggleSection('disconnected')}
                >
                  <span className="stat-value">{disconnectedHistory.length}</span>
                  <span className="stat-label">Disconnected Sessions</span>
                </button>
                <button
                  type="button"
                  className={`stat-card${expandedSection === 'connections' ? ' stat-card-active' : ''}`}
                  onClick={() => toggleSection('connections')}
                >
                  <span className="stat-value">{data.connections.length}</span>
                  <span className="stat-label">Connections Created</span>
                </button>
                <button
                  type="button"
                  className={`stat-card${expandedSection === 'access' ? ' stat-card-active' : ''}`}
                  onClick={() => toggleSection('access')}
                >
                  <span className="stat-value">{data.entitiesWithAccess.length}</span>
                  <span className="stat-label">Users &amp; Groups with Access</span>
                </button>
              </div>

              {expandedSection === 'active' && (
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title">Active Sessions</h3>
                  {data.activeSessions.length === 0 ? (
                    <p className="connections-status">No active sessions right now.</p>
                  ) : (
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Connection</th>
                          <th>Started</th>
                          <th>Remote Host</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.activeSessions.map((session) => (
                          <tr key={session.identifier}>
                            <td>{session.username}</td>
                            <td>{session.connectionName || session.connectionIdentifier}</td>
                            <td>{formatDate(session.startDate)}</td>
                            <td>{session.remoteHost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {expandedSection === 'disconnected' && (
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title">Disconnected Sessions</h3>
                  {disconnectedHistory.length === 0 ? (
                    <p className="connections-status">No disconnected sessions yet.</p>
                  ) : (
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Connection</th>
                          <th>Started</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disconnectedHistory.slice(0, 25).map((entry) => (
                          <tr key={entry.identifier}>
                            <td>{entry.username}</td>
                            <td>{entry.connectionName}</td>
                            <td>{formatDate(entry.startDate)}</td>
                            <td>{formatDuration(entry.startDate, entry.endDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {expandedSection === 'connections' && (
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title">Connections</h3>
                  {data.connections.length === 0 ? (
                    <p className="connections-status">No connections have been created.</p>
                  ) : (
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Protocol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.connections.map((conn) => (
                          <tr key={conn.identifier}>
                            <td>{conn.name}</td>
                            <td>{conn.protocol.toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {expandedSection === 'access' && (
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title">Users &amp; Groups with Connection Access</h3>
                  {data.entitiesWithAccess.length === 0 ? (
                    <p className="connections-status">No users or groups have connection access assigned.</p>
                  ) : (
                    <ul className="dashboard-entity-list">
                      {data.entitiesWithAccess.map((entity) => (
                        <li key={`${entity.type}-${entity.name}`}>
                          <span className="dashboard-entity-name">{entity.name}</span>
                          <span className="dashboard-entity-type">{entity.type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
