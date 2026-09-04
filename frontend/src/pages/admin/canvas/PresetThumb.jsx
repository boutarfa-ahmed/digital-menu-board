import { TYPE_SWATCH } from './constants'

function PresetThumb({ zones }) {
  return (
    <div
      className="relative h-14 w-24 flex-none overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
      style={{ aspectRatio: '16 / 9' }}
    >
      {zones.map((z, i) => (
        <div
          key={i}
          className={`absolute ${TYPE_SWATCH[z.zoneType] || 'bg-gray-400'}`}
          style={{
            left: `${(z.x / 12) * 100}%`,
            top: `${(z.y / 12) * 100}%`,
            width: `${(z.w / 12) * 100}%`,
            height: `${(z.h / 12) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export default PresetThumb
