import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'

function Settings() {
  return (
    <div>
      <PageMeta title="Paramètres | GalaxyFood" description="Paramètres" />
      <PageBreadcrumb pageTitle="Paramètres" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Paramètres
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Réservé aux administrateurs. Gérez les paramètres de l'application ici.
        </p>
      </div>
    </div>
  )
}

export default Settings
