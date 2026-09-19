import { useEffect, useRef, useState } from 'react'
import Guacamole from 'guacamole-common-js'
import { buildTunnelUrl } from '../services/guacamole'

interface Props {
  token: string
  dataSource: string
  connectionId: string
  connectionName: string
  onDisconnect: () => void
}

const KEYSYM_SUPER_L = 0xffeb
const KEYSYM_RETURN = 0xff0d

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function typeText(client: Guacamole.Client, text: string, delayMs = 40) {
  for (const char of text) {
    const keysym = char.charCodeAt(0)
    client.sendKeyEvent(1, keysym)
    client.sendKeyEvent(0, keysym)
    await sleep(delayMs)
  }
}

/**
 * Signs the remote user out of Windows (not the portal) by driving the Run
 * dialog, since Guacamole/RDP has no direct "log off" API call.
 */
async function signOutOfWindows(client: Guacamole.Client) {
  client.sendKeyEvent(1, KEYSYM_SUPER_L)
  client.sendKeyEvent(1, 'r'.charCodeAt(0))
  client.sendKeyEvent(0, 'r'.charCodeAt(0))
  client.sendKeyEvent(0, KEYSYM_SUPER_L)

  await sleep(500)
  await typeText(client, 'shutdown /l /f')
  await sleep(200)

  client.sendKeyEvent(1, KEYSYM_RETURN)
  client.sendKeyEvent(0, KEYSYM_RETURN)
}

export function VmSession({ token, dataSource, connectionId, connectionName, onDisconnect }: Props) {
  const displayRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<Guacamole.Client | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const container = displayRef.current
    if (!container) return

    const tunnel = new Guacamole.WebSocketTunnel(buildTunnelUrl())
    const client = new Guacamole.Client(tunnel)
    clientRef.current = client

    const display = client.getDisplay()
    const displayElement = display.getElement()
    container.appendChild(displayElement)

    function fitDisplayToContainer(nativeWidth: number, nativeHeight: number) {
      if (!container || nativeWidth === 0 || nativeHeight === 0) return

      const scale = Math.min(
        container.clientWidth / nativeWidth,
        container.clientHeight / nativeHeight,
      )
      display.scale(scale > 0 ? scale : 1)
    }

    display.onresize = (width, height) => {
      fitDisplayToContainer(width, height)
    }

    client.onerror = (status) => {
      setStatus('error')
      setErrorMessage(status.message || 'Connection error')
    }

    client.onstatechange = (state) => {
      if (state === Guacamole.Client.State.CONNECTED) {
        setStatus('connected')
        fitDisplayToContainer(display.getWidth(), display.getHeight())
      } else if (state === Guacamole.Client.State.DISCONNECTED) {
        setStatus('disconnected')
      }
    }

    const dpi = Math.round((window.devicePixelRatio || 1) * 96)
    const params = new URLSearchParams({
      token,
      GUAC_DATA_SOURCE: dataSource,
      GUAC_ID: connectionId,
      GUAC_TYPE: 'c',
      GUAC_WIDTH: String(container.clientWidth),
      GUAC_HEIGHT: String(container.clientHeight),
      GUAC_DPI: String(dpi),
    })
    client.connect(params.toString())

    const keyboard = new Guacamole.Keyboard(document)
    keyboard.onkeydown = (keysym) => {
      client.sendKeyEvent(1, keysym)
      return true
    }
    keyboard.onkeyup = (keysym) => {
      client.sendKeyEvent(0, keysym)
    }

    const mouse = new Guacamole.Mouse(displayElement)
    mouse.onEach(['mousedown', 'mousemove', 'mouseup', 'mouseout'], (event) => {
      const mouseEvent = event as Guacamole.Mouse.Event
      client.sendMouseState(mouseEvent.state, true)
    })

    let resizeTimeout: number | undefined
    const resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        if (!container) return
        client.sendSize(container.clientWidth, container.clientHeight)
        fitDisplayToContainer(display.getWidth(), display.getHeight())
      }, 300)
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      window.clearTimeout(resizeTimeout)
      keyboard.onkeydown = null
      keyboard.onkeyup = null
      display.onresize = null
      client.disconnect()
      clientRef.current = null
      container.innerHTML = ''
    }
  }, [token, dataSource, connectionId])

  async function handleWindowsLogout() {
    const client = clientRef.current
    if (!client || isLoggingOut) return

    setIsLoggingOut(true)
    try {
      await signOutOfWindows(client)
      await sleep(1000)
    } finally {
      onDisconnect()
    }
  }

  return (
    <div className="vm-session">
      <div className="vm-session-toolbar">
        <span className="vm-session-name">{connectionName}</span>
        {status === 'connecting' && <span className="vm-session-status">Connecting…</span>}
        {status === 'error' && <span className="vm-session-status vm-session-status-error">{errorMessage}</span>}
        {status === 'disconnected' && <span className="vm-session-status">Disconnected</span>}
        {isLoggingOut && <span className="vm-session-status">Signing out…</span>}
        <button className="logout-button" onClick={onDisconnect}>
          Disconnect
        </button>
        <button className="logout-button" onClick={handleWindowsLogout} disabled={isLoggingOut}>
          Logout
        </button>
      </div>
      <div ref={displayRef} className="vm-display" />
    </div>
  )
}
