import { useEffect, useState } from 'react'
import { fetchScreenLayout } from '../api/layoutApi'
import ScreenRenderer from '../components/layout/ScreenRenderer.jsx'
import LoadingSkeleton from '../components/layout/LoadingSkeleton.jsx'

export default function ScreenDisplay({ screenId }) {
  const [layout, setLayout] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer

    // silent = background refresh: keep showing current layout, ignore errors
    const load = (silent = false) => {
      if (silent) {
        fetchScreenLayout(screenId).then((data) => {
          if (cancelled) return
          setLayout(data)
          setError(null)
        })
        return
      }
      setLoading(true)
      setError(null)
      fetchScreenLayout(screenId)
        .then((data) => {
          if (!cancelled) setLayout(data)
        })
        .catch((err) => {
          if (!cancelled) setError(err.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load(false)

    // pick up admin changes without a manual reload
    timer = setInterval(() => load(true), 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [screenId])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <div className="font-menu-body text-menu-accent-2">Erreur : {error}</div>
  }

  if (!layout || !layout.zones?.length) {
    return <div className="font-menu-body text-menu-text-muted">Layout vide</div>
  }

  return <ScreenRenderer layout={layout} />
}