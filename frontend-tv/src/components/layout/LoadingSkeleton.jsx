// T7.9 — skeleton shown while the initial layout is fetched. Mirrors the 16:9
// stage with a banner zone + a two-column grid/list zone below it.
export default function LoadingSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <div className="w-full" style={{ maxWidth: 'calc(100vh * 16 / 9)' }}>
        <div
          className="grid h-full w-full grid-cols-2 grid-rows-6 gap-5 p-10"
          style={{ aspectRatio: '16 / 9' }}
        >
          <div className="col-span-2 row-span-2 animate-pulse rounded-xl bg-white/10" />

          <div className="row-span-4 flex animate-pulse flex-col justify-between rounded-xl bg-white/10 p-6">
            <div className="h-4 w-1/2 rounded bg-white/15" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-3 rounded bg-white/10" />
              ))}
              <div className="h-3 w-3/4 rounded bg-white/10" />
            </div>
          </div>

          <div className="row-span-4 grid animate-pulse grid-cols-2 grid-rows-[auto_1fr_1fr] gap-4 rounded-xl bg-white/10 p-6">
            <div className="col-span-2 h-4 w-1/3 rounded bg-white/15" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
