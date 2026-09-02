import { useState, useEffect } from 'react'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import Button from '../../components/ui/button/Button'
import Input from '../../components/form/input/InputField'
import Label from '../../components/form/Label'
import { Modal } from '../../components/ui/modal'
import { PencilIcon, TrashBinIcon, PlusIcon } from '../../icons'
import api from '../../api/axios'

const EMPTY_FORM = { name: '', type: 'image' }

const CATEGORY_TYPES = [
  { value: 'image', label: 'Image', hint: 'Photos à placer comme élément (produits, décor...)' },
  { value: 'texture', label: 'Texture', hint: 'Fonds pleine zone (papier déchiré, motifs...)' },
  { value: 'font', label: 'Police', hint: 'Fichiers .ttf/.otf/.woff2 utilisables sur un texte' },
]

const TYPE_BADGE_STYLES = {
  image: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  texture: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  font: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
}
const TYPE_LABELS = { image: 'Image', texture: 'Texture', font: 'Police' }

function Library() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploadingFor, setUploadingFor] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = () => {
    api
      .get('/library/categories')
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
    setForm({ name: category.name, type: category.type || 'image' })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editing) {
        const { data } = await api.put(`/library/categories/${editing.id}`, {
          name: form.name.trim(),
          type: form.type,
        })
        setCategories((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)))
      } else {
        const { data } = await api.post('/library/categories', {
          name: form.name.trim(),
          type: form.type,
          order: categories.length + 1,
        })
        setCategories((prev) => [...prev, { ...data, assets: [] }])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.response?.data?.error || "Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (category) => {
    const assetCount = category.assets?.length || 0
    const message =
      assetCount > 0
        ? `Supprimer "${category.name}" ? ${assetCount} élément(s) seront aussi supprimés.`
        : `Supprimer la catégorie "${category.name}" ?`
    if (!window.confirm(message)) return

    try {
      await api.delete(`/library/categories/${category.id}`)
      setCategories((prev) => prev.filter((c) => c.id !== category.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssetUpload = async (category, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isFont = category.type === 'font'
    let name = file.name.replace(/\.[^.]+$/, '')
    if (isFont) {
      // The font file's own name becomes the CSS font-family used to select
      // it later — ask for something clean (e.g. "Roboto Flex") instead of
      // defaulting to a raw variable-font filename.
      const typed = window.prompt('Nom de la police (utilisé pour la sélectionner plus tard) :', name)
      if (typed === null) {
        e.target.value = ''
        return
      }
      name = typed.trim() || name
    }

    setUploadingFor(category.id)
    try {
      const fd = new FormData()
      fd.append(isFont ? 'font' : 'image', file)
      const { data: uploaded } = await api.post(isFont ? '/upload/font' : '/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { data: asset } = await api.post('/library/assets', {
        categoryId: category.id,
        url: uploaded.url,
        name,
      })
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, assets: [...(c.assets || []), asset] } : c))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingFor(null)
      e.target.value = ''
    }
  }

  const handleDeleteAsset = async (category, asset) => {
    if (!window.confirm('Supprimer cet élément de la bibliothèque ?')) return
    try {
      await api.delete(`/library/assets/${asset.id}`)
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, assets: c.assets.filter((a) => a.id !== asset.id) } : c))
      )
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <PageMeta title="Bibliothèque | GalaxyFood Admin" description="Éléments réutilisables pour les écrans" />
      <PageBreadcrumb pageTitle="Bibliothèque" />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Images et textures réutilisables (papier déchiré, photos produits...) — organisées par catégorie, à piocher
          depuis l'éditeur d'écran.
        </p>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {loading ? (
        <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Chargement...</p>
      ) : categories.length === 0 ? (
        <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          Aucune catégorie. Cliquez sur « Nouvelle catégorie ».
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {category.name}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_BADGE_STYLES[category.type] || TYPE_BADGE_STYLES.image
                    }`}
                  >
                    {TYPE_LABELS[category.type] || 'Image'}
                  </span>
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {category.assets?.length || 0} élément(s)
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="px-3 py-2" onClick={() => openEdit(category)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3 py-2"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <TrashBinIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 px-6 pb-6 sm:grid-cols-4 md:grid-cols-6">
                {(category.assets || []).map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                  >
                    {category.type === 'font' ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-50 p-2 text-center dark:bg-gray-900">
                        <span className="text-2xl text-gray-700 dark:text-gray-200" style={{ fontFamily: asset.name }}>
                          Aa
                        </span>
                        <span className="line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400">{asset.name}</span>
                      </div>
                    ) : (
                      <img src={asset.url} alt={asset.name || ''} className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(category, asset)}
                      className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <TrashBinIcon className="size-4" />
                    </button>
                  </div>
                ))}

                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-brand-500 hover:text-brand-500 dark:border-gray-700">
                  <PlusIcon className="size-5" />
                  <span className="text-xs">{uploadingFor === category.id ? 'Envoi...' : 'Ajouter'}</span>
                  <input
                    type="file"
                    accept={category.type === 'font' ? '.ttf,.otf,.woff,.woff2' : 'image/jpeg,image/png,image/webp,image/gif'}
                    className="hidden"
                    disabled={uploadingFor === category.id}
                    onChange={(e) => handleAssetUpload(category, e)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <Label htmlFor="lib-cat-name">Nom</Label>
            <Input
              id="lib-cat-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Papier déchiré, Tacos, Burger..."
              required
            />
          </div>

          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORY_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: opt.value })}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    form.type === opt.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{opt.label}</span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{opt.hint}</span>
                </button>
              ))}
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

export default Library
