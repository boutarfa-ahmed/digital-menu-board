import { useState, useEffect } from 'react'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import Badge from '../../components/ui/badge/Badge'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import Label from '../../components/form/Label'
import Select from '../../components/form/Select'
import { Modal } from '../../components/ui/modal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/table/index'
import { PencilIcon, TrashBinIcon, PlusIcon } from '../../icons'
import api from '../../api/axios'

const ICON_OPTIONS = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burger' },
  { value: 'fries', label: 'Frites' },
  { value: 'salad', label: 'Salade' },
  { value: 'drink', label: 'Boisson' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'coffee', label: 'Café' },
  { value: 'ice', label: 'Glace' },
  { value: 'box', label: 'Autre' },
]

const COLOR_PRESETS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']

const EMPTY_FORM = { name: '', icon: 'pizza', color: '#3b82f6' }

function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [dragIndex, setDragIndex] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = () => {
    api
      .get('/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({
      name: category.name,
      icon: category.icon || 'pizza',
      color: category.color || '#3b82f6',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, name: form.name.trim() }

    try {
      if (editing) {
        const { data } = await api.put(`/categories/${editing.id}`, payload)
        setCategories((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)))
      } else {
        const { data } = await api.post('/categories', {
          ...payload,
          order: categories.length + 1,
        })
        setCategories((prev) => [...prev, data])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (category) => {
    const itemCount = category.items?.length || 0
    const message =
      itemCount > 0
        ? `Supprimer "${category.name}" ? ${itemCount} produit(s) lié(s) seront aussi supprimés.`
        : `Supprimer la catégorie "${category.name}" ?`
    if (!window.confirm(message)) return

    try {
      await api.delete(`/categories/${category.id}`)
      setCategories((prev) => prev.filter((c) => c.id !== category.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDragStart = (index) => setDragIndex(index)

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      return
    }
    const next = [...categories]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(dropIndex, 0, moved)
    setCategories(next)
    api
      .put('/categories/reorder', { ids: next.map((c) => c.id) })
      .then(({ data }) => setCategories(data))
      .catch(console.error)
    setDragIndex(null)
  }

  const colorStyles = (color) => ({
    backgroundColor: color,
    color: '#fff',
  })

  return (
    <div>
      <PageMeta title="Catégories | GalaxyFood Admin" description="Gérer les catégories" />
      <PageBreadcrumb pageTitle="Catégories" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Catégories
          </h3>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="size-4" />
            Ajouter
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : categories.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Aucune catégorie. Cliquez sur « Ajouter ».
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Ordre
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Icône
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Nom
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Couleur
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Produits
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <TableRow
                    key={category.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="cursor-grab border-b border-gray-100 dark:border-gray-800 active:cursor-grabbing"
                  >
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span
                        className="inline-flex min-w-8 items-center justify-center rounded-lg px-2 py-1 text-xs font-semibold uppercase"
                        style={colorStyles(category.color || '#3b82f6')}
                      >
                        {category.icon || '?'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {category.name}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span
                          className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                        />
                        {category.color || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge color="primary">{category.items?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => openEdit(category)}>
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3 py-2"
                          onClick={() => handleDelete(category)}
                        >
                          <TrashBinIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-lg p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h3>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="cat-name">Nom</Label>
            <Input
              id="cat-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pizzas, Boissons..."
              required
            />
          </div>

          <div>
            <Label htmlFor="cat-icon">Icône</Label>
            <Select
              options={ICON_OPTIONS}
              defaultValue={form.icon}
              placeholder="Choisir une icône"
              onChange={(value) => setForm({ ...form, icon: value })}
            />
          </div>

          <div>
            <Label htmlFor="cat-color">Couleur</Label>
            <div className="flex items-center gap-3">
              <input
                id="cat-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent dark:border-gray-700"
              />
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, color: preset })}
                    className="h-7 w-7 rounded-full border border-gray-200 transition-transform hover:scale-110 dark:border-gray-700"
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
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

export default Categories
