import { ChevronLeftIcon } from '../../../icons'

// Parcours de la Bibliothèque en deux temps : la liste des catégories, puis les
// vignettes de la catégorie ouverte. Le même bloc sert au fond d'écran, au fond
// d'une zone et aux décorations — seule l'action au clic change.
export default function LibraryPicker({
  categories = [],
  catId,
  onCatId,
  onPick,
  emptyLabel = 'Bibliothèque vide.',
  className = '',
}) {
  const cat = categories.find((c) => c.id === catId)
  const assets = cat?.assets || []
  return (
    <div className={`space-y-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700 ${className}`}>
      {categories.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyLabel}</p>
      ) : catId == null ? (
        <div className="space-y-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCatId(c.id)}
              className="flex w-full items-center justify-between rounded-md border border-gray-200 px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
            >
              <span>{c.name}</span>
              <span className="text-gray-400">{(c.assets || []).length}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onCatId(null)}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400"
          >
            <ChevronLeftIcon className="size-3.5" />
            {cat?.name}
          </button>
          {assets.length === 0 ? (
            <p className="text-xs text-gray-400">Vide.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onPick(asset)}
                  title={asset.name || ''}
                  className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-white transition-colors hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
                >
                  <img src={asset.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
