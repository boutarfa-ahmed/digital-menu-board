// T7.9 — generic food icon placeholder shown when a MenuItem has no image.
export default function ImageFallback({ accent = 'var(--menu-accent)', label = '' }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--menu-badge)', color: accent }}
      role="img"
      aria-label={label || 'Sans image'}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    </div>
  )
}
