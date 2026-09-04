import { Component } from 'react'
import ScreenDisplay from './pages/ScreenDisplay.jsx'
import LibraryFontFaces from './components/layout/LibraryFontFaces.jsx'

// Screen id: explicit prop, URL query (?id=2), then fallback to 1
function screenIdFromProps() {
  const q = new URLSearchParams(window.location.search)
  const fromQuery = parseInt(q.get('id'), 10)
  return Number.isFinite(fromQuery) ? fromQuery : 1
}

// Kiosk screen, unattended 24/7: a render crash used to leave this message
// on screen forever, waiting for someone to notice and power-cycle it by
// hand. Reloading after a short delay lets it self-recover — a fresh mount
// re-fetches the layout (or falls back to the cached one), so most crashes
// clear on their own next load.
const CRASH_RELOAD_DELAY_MS = 10000

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    this.reloadTimer = setTimeout(() => window.location.reload(), CRASH_RELOAD_DELAY_MS)
  }

  componentWillUnmount() {
    clearTimeout(this.reloadTimer)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-black p-8 text-center font-menu-body text-menu-accent-2">
          <div>Erreur TV : {this.state.error.message || String(this.state.error)}</div>
          <div className="text-sm opacity-70">Redémarrage automatique...</div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LibraryFontFaces />
      <ScreenDisplay screenId={screenIdFromProps()} />
    </ErrorBoundary>
  )
}