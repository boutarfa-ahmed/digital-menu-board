import { useState, useEffect, useMemo, Fragment } from 'react'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import Badge from '../../components/ui/badge/Badge'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import TextArea from '../../components/form/input/TextArea'
import Label from '../../components/form/Label'
import Select from '../../components/form/Select'
import Checkbox from '../../components/form/input/Checkbox'
import { Modal } from '../../components/ui/modal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/table/index'
import {
  PencilIcon,
  TrashBinIcon,
  PlusIcon,
  CloseIcon,
  CopyIcon,
} from '../../icons'
import api from '../../api/axios'

const TAG_OPTIONS = [
  { value: 'spicy', label: 'Épicé' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'promo', label: 'Promo' },
]

const TAG_LABELS = {
  spicy: 'Épicé',
  vegan: 'Vegan',
  promo: 'Promo',
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'out_of_stock', label: 'Rupture de stock' },
  { value: 'archived', label: 'Archivé' },
]

const STATUS_LABELS = {
  available: 'Disponible',
  out_of_stock: 'Rupture',
  archived: 'Archivé',
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  status: 'available',
  tags: [],
  images: [],
}

function Menu() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTag, setFilterTag] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageInput, setImageInput] = useState('')
  const [dragState, setDragState] = useState(null)

  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCategory !== 'all') params.set('categoryId', filterCategory)
    if (filterStatus !== 'all') {
      params.set('status', filterStatus)
      if (filterStatus === 'archived') params.set('includeArchived', '1')
    }
    if (filterTag !== 'all') params.set('tag', filterTag)
    api
      .get(`/menu?${params.toString()}`)
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filterCategory, filterStatus, filterTag])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const catId = item.categoryId
      if (!map.has(catId)) {
        map.set(catId, {
          categoryId: catId,
          category: item.category,
          items: [],
        })
      }
      map.get(catId).items.push(item)
    }
    return [...map.values()]
  }, [items])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setImageInput('')
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price ?? ''),
      categoryId: String(item.categoryId),
      status: item.status || 'available',
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
      images: Array.isArray(item.images) ? [...item.images] : [],
    })
    setError('')
    setImageInput('')
    setModalOpen(true)
  }

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const addImage = () => {
    const url = imageInput.trim()
    if (!url) return
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }))
    setImageInput('')
  }

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      status: form.status,
      tags: form.tags,
      images: form.images,
      imageUrl: form.images[0] || null,
    }

    try {
      if (editing) {
        const { data } = await api.put(`/menu/${editing.id}`, payload)
        setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)))
      } else {
        const { data } = await api.post('/menu', payload)
        setItems((prev) => [...prev, data])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (item) => {
    if (!window.confirm(`Archiver "${item.name}" ? Il disparaîtra de la carte.`)) return
    try {
      const { data } = await api.patch(`/menu/${item.id}/archive`)
      setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDuplicate = async (item) => {
    try {
      const { data } = await api.post(`/menu/${item.id}/duplicate`)
      setItems((prev) => [...prev, data])
    } catch (err) {
      console.error(err)
    }
  }

  const toggleStatus = async (item) => {
    const next = item.status === 'available' ? 'out_of_stock' : 'available'
    try {
      const { data } = await api.patch(`/menu/${item.id}/status`, { status: next })
      setItems((prev) => prev.map((it) => (it.id === data.id ? data : it)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDragStart = (categoryId, index) => setDragState({ categoryId, index })

  const handleDrop = (categoryId, dropIndex) => {
    if (!dragState || dragState.categoryId !== categoryId || dragState.index === dropIndex) {
      setDragState(null)
      return
    }
    const group = grouped.find((g) => g.categoryId === categoryId)
    if (!group) {
      setDragState(null)
      return
    }
    const next = [...group.items]
    const [moved] = next.splice(dragState.index, 1)
    next.splice(dropIndex, 0, moved)

    setItems((prev) => {
      const others = prev.filter((it) => it.categoryId !== categoryId)
      return [...others, ...next]
    })
    api
      .put('/menu/reorder', {
        categoryId,
        ids: next.map((it) => it.id),
      })
      .then(({ data }) => setItems(Array.isArray(data) ? data : prev))
      .catch(console.error)
    setDragState(null)
  }

  const statusBadge = (status) => {
    if (status === 'available') return <Badge color="success">{STATUS_LABELS.available}</Badge>
    if (status === 'out_of_stock') return <Badge color="error">{STATUS_LABELS.out_of_stock}</Badge>
    return <Badge color="light">{STATUS_LABELS.archived}</Badge>
  }

  const coverOf = (item) => item.images?.[0] || item.imageUrl

  return (
    <div>
      <PageMeta title="Menu | GalaxyFood Admin" description="Gérer les produits du menu" />
      <PageBreadcrumb pageTitle="Menu" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            options={[
              { value: 'all', label: 'Toutes les catégories' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            defaultValue={filterCategory}
            placeholder="Catégorie"
            className="min-w-48"
            onChange={(value) => setFilterCategory(value)}
          />
          <Select
            options={[
              { value: 'all', label: 'Tous les statuts' },
              ...STATUS_OPTIONS,
            ]}
            defaultValue={filterStatus}
            placeholder="Statut"
            className="min-w-44"
            onChange={(value) => setFilterStatus(value)}
          />
          <Select
            options={[
              { value: 'all', label: 'Tous les tags' },
              ...TAG_OPTIONS,
            ]}
            defaultValue={filterTag}
            placeholder="Tag"
            className="min-w-36"
            onChange={(value) => setFilterTag(value)}
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Ajouter un produit
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : items.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun produit. Ajustez les filtres ou cliquez sur « Ajouter un produit ».
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Produit
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Prix
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Statut
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tags
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((group) => (
                  <Fragment key={group.categoryId}>
                    <TableRow className="bg-gray-50/70 dark:bg-gray-800/40">
                      <TableCell colSpan={5} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                            {group.category?.icon && (
                              <span
                                className="inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-semibold uppercase text-white"
                                style={{ backgroundColor: group.category.color || '#3b82f6' }}
                              >
                                {group.category.icon}
                              </span>
                            )}
                            {group.category?.name || 'Autre'}
                            <Badge color="primary">{group.items.length}</Badge>
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Glissez les lignes pour réordonner
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.items.map((item, index) => (
                      <TableRow
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(group.categoryId, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(group.categoryId, index)}
                        className="cursor-grab border-b border-gray-100 dark:border-gray-800 active:cursor-grabbing"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {coverOf(item) ? (
                              <img
                                src={coverOf(item)}
                                alt={item.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                                {item.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {item.name}
                              </p>
                              <p className="max-w-64 truncate text-xs text-gray-500 dark:text-gray-400">
                                {item.description || '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                          {Number(item.price).toFixed(2)} CHF
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {statusBadge(item.status)}
                            {item.status !== 'archived' && (
                              <Button size="sm" variant="outline" className="px-2 py-1 text-xs" onClick={() => toggleStatus(item)}>
                                {item.status === 'available' ? 'Rupture' : 'Disponible'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(item.tags) && item.tags.length > 0 ? (
                              item.tags.map((tag) => (
                                <Badge key={tag} color={tag === 'spicy' ? 'error' : tag === 'vegan' ? 'success' : 'warning'} size="sm">
                                  {TAG_LABELS[tag] || tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => handleDuplicate(item)} title="Dupliquer">
                              <CopyIcon className="size-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => openEdit(item)} title="Modifier">
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => handleArchive(item)} title="Archiver">
                              <TrashBinIcon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-2xl p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          {editing ? 'Modifier le produit' : 'Nouveau produit'}
        </h3>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="menu-name">Nom</Label>
            <Input
              id="menu-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pizza Margherita"
              required
            />
          </div>

          <div>
            <Label htmlFor="menu-desc">Description</Label>
            <TextArea
              id="menu-desc"
              placeholder="Ingrédients, particularités..."
              rows={2}
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <Label htmlFor="menu-price">Prix (CHF)</Label>
              <Input
                id="menu-price"
                type="number"
                step="0.5"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="9.50"
                required
              />
            </div>
            <div>
              <Label htmlFor="menu-cat">Catégorie</Label>
              <Select
                id="menu-cat"
                options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                defaultValue={form.categoryId}
                placeholder="Choisir une catégorie"
                onChange={(value) => setForm({ ...form, categoryId: value })}
              />
            </div>
            <div>
              <Label htmlFor="menu-status">Statut</Label>
              <Select
                id="menu-status"
                options={STATUS_OPTIONS}
                defaultValue={form.status}
                placeholder="Statut"
                onChange={(value) => setForm({ ...form, status: value })}
              />
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-5 pt-1">
              {TAG_OPTIONS.map((tag) => (
                <Checkbox
                  key={tag.value}
                  label={tag.label}
                  checked={form.tags.includes(tag.value)}
                  onChange={() => toggleTag(tag.value)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Images</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://.../image.jpg"
              />
              <Button type="button" variant="outline" onClick={addImage} className="shrink-0">
                Ajouter
              </Button>
            </div>
            {form.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.images.map((img, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={img}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white transition-transform hover:scale-110"
                    >
                      <CloseIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Menu
