import ZoneBadge from '../ui/ZoneBadge.jsx'

// Badge overlay rendered from a zone's badgeConfig, positioned inside the
// (relative) card root.
export default function CardBadge({ config }) {
  return <ZoneBadge config={config} />
}
