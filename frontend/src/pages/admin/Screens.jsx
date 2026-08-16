import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import Badge from '../../components/ui/badge/Badge'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import Label from '../../components/form/Label'
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
  GridIcon,
  ListIcon,
  EyeIcon,
} from '../../icons'
import api from '../../api/axios'

const TEMPLATE_LABELS = {
  grid_2x2: 'Grille 2×2',
  grid_2x3: 'Grille 2×3',
  grid_3x4: 'Grille 3×4',
  list: 'Liste',
  carousel: 'Carrousel',
}

const EMPTY_FORM = {
  name: '',
  location: '',
}

function formatPing(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function Screens() {
  const [screens, setScreens] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignedCats, setAssignedCats] = useState([])
  const [assignedItems, setAssignedItems] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    loadScreens()
  }, [])

  useEffect(() => {
    const poll = setInterval(loadScreens, 10000)
    return () => clearInterval(poll)
  }, [])

  const loadScreens = () => {
    api
      .get('/screens')
      .then(({ data }) => setScreens(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (screen) => {
    setEditing(screen)
    setForm({
      name: screen.name,
      location: screen.location || '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      location: form.location.trim() || null,
    }

    try {
      if (editing) {
        const { data } = await api.put(`/screens/${editing.id}`, payload)
        setScreens((prev) => prev.map((s) => (s.id === data.id ? data : s)))
      } else {
        const { data } = await api.post('/screens', payload)
        setScreens((prev) => [...prev, data])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (screen) => {
    if (!window.confirm(`Supprimer "${screen.name}" ?`)) return
    try {
      await api.delete(`/screens/${screen.id}`)
      setScreens((prev) => prev.filter((s) => s.id !== screen.id))
    } catch (err) {
      console.error(err)
    }
  }

  const openAssign = async (screen) => {
    setAssignTarget(screen)
    setError('')
    const [screenData, catData, itemData] = await Promise.all([
      api.get(`/screens/${screen.id}`).then((r) => r.data),
      api.get('/categories').then((r) => r.data),
      api.get('/menu').then((r) => r.data),
    ]).catch((err) => {
      console.error(err)
      return [null, [], []]
    })
    if (screenData) {
      setAssignedCats((screenData.categories || []).map((c) => c.id))
      setAssignedItems((screenData.items || []).map((i) => i.id))
    }
    setCategories(Array.isArray(catData) ? catData : [])
    setItems(Array.isArray(itemData) ? itemData : [])
    setAssignOpen(true)
  }

  const toggleCat = (id) => {
    setAssignedCats((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleItem = (id) => {
    setAssignedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const saveAssignments = async () => {
    if (!assignTarget) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/screens/${assignTarget.id}/assignments`, {
        categoryIds: assignedCats,
        itemIds: assignedItems,
      })
      setScreens((prev) => prev.map((s) => (s.id === data.id ? { ...s, _count: { categories: data.categories.length, items: data.items.length } } : s)))
      setAssignOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageMeta title="TV / Écrans | GalaxyFood Admin" description="Gérer les écrans TV" />
      <PageBreadcrumb pageTitle="TV / Écrans" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Écrans TV
          </h3>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="size-4" />
            Ajouter un écran
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : screens.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun écran. Cliquez sur « Ajouter un écran ».
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Écran
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Emplacement
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Connexion
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Dernier ping
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Assigné
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screens.map((screen) => (
                  <TableRow
                    key={screen.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                          <GridIcon className="size-5" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {screen.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {TEMPLATE_LABELS[screen.layout?.template] || 'Grille 2×2'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {screen.location || '—'}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {screen.online ? (
                        <Badge color="success">En ligne</Badge>
                      ) : (
                        <Badge color="error">Hors ligne</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatPing(screen.lastPing)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge color="primary">
                          {screen._count?.categories ?? 0} cat.
                        </Badge>
                        <Badge color="info">
                          {screen._count?.items ?? 0} prod.
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => navigate(`/dashboard/screens/${screen.id}/layout`)} title="Layout">
                          <EyeIcon className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => openAssign(screen)} title="Assigner des produits">
                          <ListIcon className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => openEdit(screen)} title="Modifier">
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => handleDelete(screen)} title="Supprimer">
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
          {editing ? 'Modifier l\'écran' : 'Nouvel écran'}
        </h3>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="screen-name">Nom</Label>
            <Input
              id="screen-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="TV1, TV Entrée..."
              required
            />
          </div>

          <div>
            <Label htmlFor="screen-location">Emplacement</Label>
            <Input
              id="screen-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Salle principale, Terrasse..."
            />
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

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} className="max-w-2xl p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Assigner à {assignTarget?.name || ''}
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Choisissez les catégories et produits affichés sur cet écran.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Catégories ({assignedCats.length})
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              {categories.length === 0 && (
                <p className="text-sm text-gray-400">Aucune catégorie.</p>
              )}
              {categories.map((cat) => (
                <Checkbox
                  key={cat.id}
                  label={cat.name}
                  checked={assignedCats.includes(cat.id)}
                  onChange={() => toggleCat(cat.id)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Produits ({assignedItems.length})
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              {items.length === 0 && (
                <p className="text-sm text-gray-400">Aucun produit.</p>
              )}
              {items.map((item) => (
                <Checkbox
                  key={item.id}
                  label={`${item.name}${item.price != null ? ` — ${Number(item.price).toFixed(2)} CHF` : ''}`}
                  checked={assignedItems.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5">
          <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={saveAssignments} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default Screens
