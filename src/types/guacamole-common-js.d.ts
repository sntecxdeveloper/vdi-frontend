declare module 'guacamole-common-js' {
  namespace Guacamole {
    class Tunnel {}

    class WebSocketTunnel extends Tunnel {
      constructor(url: string)
    }

    class Display {
      getElement(): HTMLElement
      getWidth(): number
      getHeight(): number
      scale(factor: number): void
      getScale(): number
      onresize: ((width: number, height: number) => void) | null
    }

    class Status {
      code: number
      message?: string
    }

    namespace Client {
      const State: {
        IDLE: 0
        CONNECTING: 1
        WAITING: 2
        CONNECTED: 3
        DISCONNECTING: 4
        DISCONNECTED: 5
      }
      type State = 0 | 1 | 2 | 3 | 4 | 5
    }

    class Client {
      constructor(tunnel: Tunnel)
      connect(data?: string): void
      disconnect(): void
      getDisplay(): Display
      sendKeyEvent(pressed: 0 | 1, keysym: number): void
      sendMouseState(state: Mouse.State, applyDisplayScale?: boolean): void
      sendSize(width: number, height: number): void
      onerror: ((status: Status) => void) | null
      onstatechange: ((state: Client.State) => void) | null
    }

    class Keyboard {
      constructor(element?: HTMLDocument | HTMLElement)
      onkeydown: ((keysym: number) => boolean | void) | null
      onkeyup: ((keysym: number) => void) | null
    }

    namespace Mouse {
      class State {
        x: number
        y: number
        left: boolean
        middle: boolean
        right: boolean
        up: boolean
        down: boolean
      }

      class Event {
        state: State
      }
    }

    class Mouse {
      constructor(element: HTMLElement)
      onEach(types: string[], listener: (event: Mouse.Event) => void): void
    }
  }

  export default Guacamole
}
