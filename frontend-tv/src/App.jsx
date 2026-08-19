import { Component } from 'react'
import ScreenDisplay from './pages/ScreenDisplay.jsx'

// Screen id: explicit prop, URL query (?id=2), then fallback to 1
function screenIdFromProps() {
  const q = new URLSearchParams(window.location.search)
  const fromQuery = parseInt(q.get('id'), 10)
  return Number.isFinite(fromQuery) ? fromQuery : 1
}

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-black p-8 text-center font-menu-body text-menu-accent-2">
          Erreur TV : {this.state.error.message || String(this.state.error)}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ScreenDisplay screenId={screenIdFromProps()} />
    </ErrorBoundary>
  )
}