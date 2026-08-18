import { useEffect, useState } from 'react'
import { fetchScreenLayout } from '../api/layoutApi'
import ScreenRenderer from '../components/layout/ScreenRenderer.jsx'
import LoadingSkeleton from '../components/layout/LoadingSkeleton.jsx'

const STORAGE_KEY = 'galaxy-tv-screen-id'

function initialScreenId(fallbackId) {
  const q = new URLSearchParams(window.location.search)
  const fromQuery = parseInt(q.get('id'), 10)
  if (Number.isFinite(fromQuery)) return fromQuery
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10)
  return Number.isFinite(saved) ? saved : fallbackId
}

function hasZones(layout) {
  return !!layout && Array.isArray(layout.zones) && layout.zones.length > 0
}

async function firstScreenWithLayout() {
  try {
    const res = await fetch('/api/screens', { cache: 'no-store' })
    if (!res.ok) return null
    const screens = await res.json()
    for (const s of screens) {
      if (!s || s.id == null) continue
      const lr = await fetch(`/api/screens/${s.id}/layout`, { cache: 'no-store' })
      if (!lr.ok) continue
      const layout = await lr.json()
      if (hasZones(layout)) return s.id
    }
  } catch {
    return null
  }
  return null
}

export default function ScreenDisplay({ screenId }) {
  const [resolvedId, setResolvedId] = useState(() => initialScreenId(screenId))
  const [layout, setLayout] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [autoSelected, setAutoSelected] = useState(false)

  useEffect(() => {
    let cancelled = false

    const apply = (data) => {
      if (cancelled) return
      setLayout(data)
      setError(null)
    }

    const tryFallback = (onDone) => {
      firstScreenWithLayout().then((id) => {
        if (cancelled) return
        if (id && id !== resolvedId) {
          localStorage.setItem(STORAGE_KEY, String(id))
          setResolvedId(id)
          setAutoSelected(true)
          onDone()
          return
        }
        onDone()
      })
    }

    fetchScreenLayout(resolvedId)
      .then((data) => {
        apply(data)
        if (hasZones(data)) {
          setAutoSelected(false)
          setLoading(false)
        } else {
          tryFallback(() => setLoading(false))
        }
      })
      .catch((err) => {
        apply(err)
        tryFallback(() => setLoading(false))
      })

    return () => {
      cancelled = true
    }
  }, [resolvedId])

  useEffect(() => {
    let cancelled = false

    const recover = () => {
      firstScreenWithLayout().then((id) => {
        if (cancelled || !id || id === resolvedId) return
        localStorage.setItem(STORAGE_KEY, String(id))
        setResolvedId(id)
        setAutoSelected(true)
      })
    }

    let timer = setInterval(() => {
      fetchScreenLayout(resolvedId).then((data) => {
        if (cancelled) return
        if (hasZones(data)) {
          setLayout(data)
          setError(null)
          setAutoSelected(false)
        } else {
          recover()
        }
      })
    }, 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchScreenLayout(resolvedId).then((data) => {
          if (cancelled) return
          if (hasZones(data)) {
            setLayout(data)
            setError(null)
          } else {
            recover()
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [resolvedId])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error && !hasZones(layout)) {
    return <div className="font-menu-body text-menu-accent-2">Erreur : {error.message || String(error)}</div>
  }

  if (!hasZones(layout)) {
    return <div className="font-menu-body text-menu-text-muted">Layout vide — aucun écran publié</div>
  }

  return (
    <>
      {autoSelected ? (
        <div className="z-50 flex w-full items-center justify-center gap-2 py-1 font-menu-body text-sm text-menu-text-muted">
          TV auto : écran n°{resolvedId} — utilisez <span className="text-menu-accent">?id={resolvedId}</span> pour le fixer
        </div>
      ) : null}
      <ScreenRenderer layout={layout} />
    </>
  )
}