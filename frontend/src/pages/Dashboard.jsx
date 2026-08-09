import { useState, useEffect } from 'react'
import PageMeta from '../components/common/PageMeta'
import PageBreadcrumb from '../components/common/PageBreadCrumb'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/badge/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../components/ui/table/index'
import { BoxIconLine, GroupIcon, CheckLineIcon, InfoIcon } from '../icons'
import api from '../api/axios'

const STATUS_BADGE = {
  available: { color: 'success', label: 'Disponible' },
  out_of_stock: { color: 'error', label: 'Rupture' },
  archived: { color: 'light', label: 'Archivé' },
}

function Dashboard() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [displays, setDisplays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/menu').then((r) => r.data),
      api.get('/categories').then((r) => r.data),
      api.get('/screens').then((r) => r.data),
    ])
      .then(([menuData, catData, screenData]) => {
        setItems(Array.isArray(menuData) ? menuData : [])
        setCategories(Array.isArray(catData) ? catData : [])
        setDisplays(Array.isArray(screenData) ? screenData : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const poll = setInterval(() => {
      api
        .get('/screens')
        .then(({ data }) => setDisplays(Array.isArray(data) ? data : []))
        .catch(console.error)
    }, 10000)
    return () => clearInterval(poll)
  }, [])

  const tvsOnline = displays.filter((d) => d.online).length
  const tvsOffline = displays.length - tvsOnline

  const stats = [
    {
      label: 'Produits',
      value: items.length,
      icon: <BoxIconLine className="size-6" />,
      iconClassName: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    },
    {
      label: 'Catégories',
      value: categories.length,
      icon: <GroupIcon className="size-6" />,
      iconClassName: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-400',
    },
    {
      label: 'TVs Online',
      value: tvsOnline,
      icon: <CheckLineIcon className="size-6" />,
      iconClassName: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    },
    {
      label: 'TVs Offline',
      value: tvsOffline,
      icon: <InfoIcon className="size-6" />,
      iconClassName: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    },
  ]

  return (
    <>
      <PageMeta title="Tableau de bord | GalaxyFood" description="Aperçu du menu board" />
      <PageBreadcrumb pageTitle="Tableau de bord" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Produits du menu
          </h3>
          <Badge color="primary">{items.length} au total</Badge>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : items.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              Aucun produit pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Nom
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Catégorie
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Prix
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Statut
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <TableCell className="px-6 py-4 text-sm text-gray-800 dark:text-white/90">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.category?.name || '—'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {Number(item.price).toFixed(2)} CHF
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {STATUS_BADGE[item.status] ? (
                        <Badge color={STATUS_BADGE[item.status].color}>
                          {STATUS_BADGE[item.status].label}
                        </Badge>
                      ) : (
                        <Badge color="light">Inconnu</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  )
}

export default Dashboard
