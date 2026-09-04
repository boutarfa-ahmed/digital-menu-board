import Label from '../../../components/form/Label'
import { BADGE_TYPES, BADGE_TYPE_LABELS } from './constants'

// Sélecteur de design de badge prix. Rend une vraie miniature de chaque type
// (mêmes découpes/couleurs que PriceBadge côté TV) pour que le choix se fasse
// à l'œil plutôt que sur un nom. `dark` suit le fond déjà choisi, si bien que
// l'aperçu montre exactement la combinaison type x fond qui partira à l'écran.
// Copie du clip-path de PriceBadge (frontend-tv) : les deux apps ne partagent
// pas de module, donc l'aperçu duplique la forme pour rester fidele au rendu.
const BADGE_TYPE2_CLIP =
  'polygon(0.0% 1.6%, 4.6% 8.7%, 8.0% 0.7%, 13.8% 8.9%, 16.7% 1.8%, 21.9% 8.2%, 26.0% 1.0%, 28.7% 7.5%, 31.7% 1.3%, 37.2% 6.5%, 41.1% 1.5%, 47.2% 8.0%, 53.4% 2.0%, 59.0% 6.3%, 62.9% 1.6%, 67.3% 8.0%, 72.7% 1.9%, 76.6% 7.5%, 80.7% 0.8%, 85.9% 6.0%, 88.9% 1.7%, 95.4% 5.7%, 100% 2.0%, 100.0% 98.8%, 95.3% 92.9%, 90.6% 97.9%, 87.2% 91.6%, 81.3% 98.1%, 78.6% 92.5%, 72.4% 99.1%, 68.7% 93.5%, 64.9% 97.5%, 59.5% 92.3%, 55.2% 98.1%, 51.0% 91.5%, 46.0% 98.3%, 42.2% 90.6%, 37.3% 98.5%, 33.2% 92.5%, 29.1% 97.7%, 23.3% 91.8%, 17.6% 98.6%, 14.3% 91.6%, 8.7% 98.1%, 5.8% 91.5%, 1.5% 98.3%, 0% 98.0%)'

const BADGE_TYPE1_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%,' +
  '26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'

function BadgeTypeThumb({ type, dark }) {
  const isType2 = type === 'type2'
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const ink = dark ? '#FFFFFF' : '#1A1A1A'
  // Type 1 tinte les centimes en accent, type 2 les garde dans la même encre.
  const cents = isType2 ? ink : '#FF6B00'
  return (
    <span
      className="inline-block"
      style={{ filter: isType2 ? 'drop-shadow(0 3px 5px rgba(0,0,0,0.35))' : undefined }}
    >
      <span
        className="inline-block font-bold leading-none"
        style={{
          background: bg,
          color: ink,
          padding: isType2 ? '7px 10px' : '4px 8px',
          borderRadius: isType2 ? 0 : '6px 6px 2px 2px',
          clipPath: isType2 ? BADGE_TYPE2_CLIP : BADGE_TYPE1_CLIP,
          border: !isType2 && !dark ? '2px solid #0D0D0D' : undefined,
        }}
      >
        <span style={{ fontSize: 17 }}>12</span>
        <span style={{ fontSize: 10, color: cents, verticalAlign: 'super' }}>,90</span>
        <span style={{ fontSize: 11 }}>CHF</span>
      </span>
    </span>
  )
}

function BadgeTypePicker({ value, dark, onChange }) {
  const active = BADGE_TYPES.includes(value) ? value : 'type1'
  return (
    <div>
      <Label>Type de badge</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {BADGE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            title={BADGE_TYPE_LABELS[t]}
            className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-2.5 transition-colors ${
              active === t
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15'
                : 'border-gray-200 hover:border-brand-300 dark:border-gray-700'
            }`}
          >
            <span
              className="flex h-11 w-full items-center justify-center rounded"
              style={{ background: dark ? '#F1F1F1' : '#2A2A2A' }}
            >
              <BadgeTypeThumb type={t} dark={dark} />
            </span>
            <span
              className={`text-[11px] font-medium ${
                active === t
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {BADGE_TYPE_LABELS[t]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default BadgeTypePicker
