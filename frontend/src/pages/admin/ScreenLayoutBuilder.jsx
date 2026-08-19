import { useState, useEffect, useMemo } from 'react'
import Button from '../../components/ui/button/Button'
import Badge from '../../components/ui/badge/Badge'
import { Modal } from '../../components/ui/modal'
import { PlusIcon } from '../../icons'
import api from '../../api/axios'

function SimplePreview({ layout, itemsById, catsById, dragOver, onDragOver, onDragLeave, onDrop }) {
  const { template, cols, cells } = layout

  const renderCell = (cell) => {
    if (!cell || cell.type === 'empty') {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500">
          <PlusIcon className="size-5" />
          <span className="text-xs">Vide</span>
        </div>
      )
    }
    if (cell.type === 'item') {
      const item = itemsById[cell.itemId]
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
          {item?.images?.[0] || item?.imageUrl ? (
            <img src={item?.images?.[0] || item?.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              {item?.name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item?.name || 'Produit'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item?.price != null ? `${Number(item.price).toFixed(2)} CHF` : '—'}</p>
        </div>
      )
    }
    if (cell.type === 'category') {
      const cat = catsById[cell.categoryId]
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold uppercase text-white"
            style={{ backgroundColor: cat?.color || '#3b82f6' }}
          >
            {cat?.icon || '?'}
          </span>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{cat?.name || 'Catégorie'}</p>
        </div>
      )
    }
    return null
  }

  if (template === 'list') {
    const autoItems = Object.values(itemsById)
    return (
      <div className="space-y-2">
        {autoItems.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">Aucun produit assigné.</p>
        )}
        {autoItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                {item.name?.[0]?.toUpperCase() || '?'}
              </span>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
            </div>
<p className="text-sm text-gray-500 dark:text-gray-400">{item.price != null ? `${Number(item.price).toFixed(2)} CHF` : '—'}</p>
            </div>
          ))}
        </div>
      )
    }

  if (template === 'carousel') {
    const first = Object.values(itemsById)[0]
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {first ? (
          <div className="flex items-center gap-4">
            {first.images?.[0] || first.imageUrl ? (
              <img src={first.images?.[0] || first.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-lg font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                {first.name?.[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{first.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{first.price != null ? `${Number(first.price).toFixed(2)} CHF` : '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">Aucun produit assigné pour le carrousel.</p>
        )}
      </div>
    )
  }

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {(cells || []).map((cell, index) => (
        <div
          key={index}
          onDragOver={(e) => {
            e.preventDefault()
            onDragOver?.(index)
          }}
          onDragLeave={() => onDragLeave?.(index)}
          onDrop={(e) => {
            e.preventDefault()
            onDragLeave?.(index)
            onDrop?.(index, e)
          }}
          className={`min-h-24 rounded-lg border p-2 transition-shadow ${
            dragOver === index
              ? 'border-brand-500 ring-2 ring-brand-500/40'
              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
          }`}
        >
          {renderCell(cell)}
        </div>
      ))}
    </div>
  )
}

function ScreenLayoutBuilder({ screen, onClose, onSaved }) {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [assignedCats, setAssignedCats] = useState([])
  const [assignedItems, setAssignedItems] = useState([])
  const [layout, setLayout] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/screens/templates').then((r) => r.data),
      api.get('/categories').then((r) => r.data),
      api.get('/menu').then((r) => r.data),
      api.get(`/screens/${screen.id}`).then((r) => r.data),
    ])
      .then(([tpl, cats, menu, scr]) => {
        setTemplates(Array.isArray(tpl) ? tpl : [])
        setCategories(Array.isArray(cats) ? cats : [])
        setAllItems(Array.isArray(menu) ? menu : [])
        setAssignedCats((scr.categories || []).map((c) => c.id))
        setAssignedItems((scr.items || []).map((i) => i.id))
        setLayout(scr.layout || null)
      })
      .catch(console.error)
  }, [screen.id])

  const itemsById = useMemo(() => Object.fromEntries(allItems.map((i) => [i.id, i])), [allItems])
  const catsById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const paletteItems = useMemo(
    () => [...allItems].sort((a, b) => Number(assignedItems.includes(b.id)) - Number(assignedItems.includes(a.id))),
    [allItems, assignedItems]
  )
  const paletteCats = useMemo(
    () => [...categories].sort((a, b) => Number(assignedCats.includes(b.id)) - Number(assignedCats.includes(a.id))),
    [categories, assignedCats]
  )

  const selectTemplate = (key) => {
    const t = templates.find((x) => x.key === key)
    if (!t) return
    const count = t.type === 'grid' ? t.rows * t.cols : 0
    setLayout((prev) => {
      const old = prev?.cells || []
      const cells = Array.from({ length: count }, (_, i) => old[i] || { type: 'empty' })
      return { ...prev, template: key, rows: t.rows, cols: t.cols, cells }
    })
  }

  const setCell = (index, value) => {
    setLayout((prev) => ({
      ...prev,
      cells: (prev?.cells || []).map((c, i) => (i === index ? value : c)),
    }))
  }

  const handleDragStart = (e, payload) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDrop = (index, e) => {
    let payload
    try {
      payload = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return
    }
    if (payload && payload.type) setCell(index, { type: payload.type, [payload.type === 'item' ? 'itemId' : 'categoryId']: payload.id })
  }

  const save = async () => {
    if (!layout) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/screens/${screen.id}/layout`, layout)
      onSaved?.(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const templateLabel = (key) => templates.find((t) => t.key === key)?.label || key

  return (
    <Modal isOpen onClose={onClose} isFullscreen className="!max-w-[1400px]">
      <div className="flex h-full flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Layout — {screen.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {screen.location || ''} · Glissez les produits de la palette vers la grille, puis publiez.
            </p>
          </div>
          <Badge color="primary">{layout ? templateLabel(layout.template) : '—'}</Badge>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTemplate(t.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                layout?.template === t.key
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                  : 'border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 lg:w-[280px] lg:flex-none">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Palette</p>
              <p className="text-xs text-gray-400">Produits assignés en premier</p>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Produits</p>
                <div className="space-y-2">
                  {paletteItems.length === 0 && (
                    <p className="text-xs text-gray-400">Aucun produit.</p>
                  )}
                  {paletteItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { type: 'item', id: item.id })}
                      className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 active:cursor-grabbing"
                    >
                      {item.images?.[0] || item.imageUrl ? (
                        <img src={item.images?.[0] || item.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                          {item.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.price != null ? `${Number(item.price).toFixed(2)} CHF` : '—'}</p>
                      </div>
                      {assignedItems.includes(item.id) && <Badge size="sm" color="success">assigné</Badge>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Catégories</p>
                <div className="space-y-2">
                  {paletteCats.length === 0 && (
                    <p className="text-xs text-gray-400">Aucune catégorie.</p>
                  )}
                  {paletteCats.map((cat) => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, { type: 'category', id: cat.id })}
                      className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 active:cursor-grabbing"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded text-xs font-bold uppercase text-white"
                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                      >
                        {cat.icon || '?'}
                      </span>
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{cat.name}</p>
                      {assignedCats.includes(cat.id) && <Badge size="sm" color="success">assigné</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Aperçu</p>
              <Badge size="sm" color="light">Mise à jour en direct</Badge>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {layout ? (
                <SimplePreview
                  layout={layout}
                  itemsById={itemsById}
                  catsById={catsById}
                  dragOver={dragOver}
                  onDragOver={(i) => setDragOver(i)}
                  onDragLeave={(i) => setDragOver((cur) => (cur === i ? null : cur))}
                  onDrop={handleDrop}
                />
              ) : (
                <p className="py-10 text-center text-gray-400">Chargement...</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={save} disabled={saving || !layout}>
            {saving ? 'Publication...' : 'Publier le layout'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ScreenLayoutBuilder
