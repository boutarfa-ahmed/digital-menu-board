import ScreenDisplay from './pages/ScreenDisplay.jsx'

// Screen id: explicit prop, URL query (?id=2), then fallback to 1
function screenIdFromProps() {
  const q = new URLSearchParams(window.location.search)
  const fromQuery = parseInt(q.get('id'), 10)
  return Number.isFinite(fromQuery) ? fromQuery : 1
}

export default function App() {
  return <ScreenDisplay screenId={screenIdFromProps()} />
}