// The torn-paper edge: one traced outline, reused as a horizontal strip, a
// vertical strip, and a clip-path. Extracted verbatim from
// ScreenLayoutCanvas.jsx — the shape data is unchanged.

// Traced from a licensed torn-paper reference (Vecteezy #1222320) — same
// fixed points as frontend-tv/src/components/ui/ZoneSeams.jsx, so the "Fond"
// dialog preview matches the TV render exactly. Keep both copies in sync;
// the two apps share no module to import from.
const TORN_TILE_LEN = 220
const TORN_THICKNESS = 40

// prettier-ignore
const TORN_TOP = [[0.0,4.9],[2.4,5.4],[4.9,5.6],[7.3,8.2],[9.8,10.5],[12.2,12.0],[14.7,12.6],[17.1,12.6],[19.6,12.0],[22.0,10.8],[24.4,10.3],[26.9,11.1],[29.3,11.6],[31.8,11.8],[34.2,11.8],[36.7,11.5],[39.1,10.8],[41.6,9.8],[44.0,9.5],[46.4,9.7],[48.9,10.2],[51.3,10.7],[53.8,11.0],[56.2,11.0],[58.7,10.3],[61.1,10.0],[63.6,10.2],[66.0,10.0],[68.4,9.7],[70.9,9.3],[73.3,9.3],[75.8,9.5],[78.2,10.0],[80.7,9.8],[83.1,9.5],[85.6,9.2],[88.0,9.3],[90.4,10.7],[92.9,11.5],[95.3,10.8],[97.8,10.2],[100.2,10.3],[102.7,12.1],[105.1,13.3],[107.6,13.6],[110.0,13.4],[112.4,12.6],[114.9,11.8],[117.3,11.0],[119.8,11.0],[122.2,10.5],[124.7,9.5],[127.1,8.4],[129.6,7.2],[132.0,6.2],[134.4,5.4],[136.9,4.6],[139.3,3.8],[141.8,2.9],[144.2,2.1],[146.7,1.8],[149.1,1.5],[151.6,1.5],[154.0,0.8],[156.4,0.3],[158.9,0.0],[161.3,0.0],[163.8,0.3],[166.2,0.8],[168.7,0.8],[171.1,0.0],[173.6,0.3],[176.0,1.6],[178.4,3.1],[180.9,3.4],[183.3,3.4],[185.8,3.8],[188.2,4.3],[190.7,5.1],[193.1,5.1],[195.6,4.9],[198.0,4.4],[200.4,3.9],[202.9,3.6],[205.3,3.4],[207.8,3.8],[210.2,4.8],[212.7,5.4],[215.1,5.7],[217.6,5.6],[220.0,5.1]]

// prettier-ignore
const TORN_BOTTOM = [[0.0,3.7],[2.4,3.7],[4.9,3.2],[7.3,5.5],[9.8,6.4],[12.2,7.1],[14.7,9.4],[17.1,10.9],[19.6,11.1],[22.0,10.2],[24.4,9.9],[26.9,12.1],[29.3,11.0],[31.8,11.6],[34.2,12.8],[36.7,13.6],[39.1,13.4],[41.6,12.6],[44.0,12.2],[46.4,12.4],[48.9,12.9],[51.3,13.6],[53.8,11.6],[56.2,10.1],[58.7,12.2],[61.1,11.7],[63.6,9.6],[66.0,7.7],[68.4,6.9],[70.9,7.6],[73.3,8.1],[75.8,7.5],[78.2,7.4],[80.7,7.7],[83.1,8.4],[85.6,10.9],[88.0,11.6],[90.4,11.1],[92.9,9.7],[95.3,8.3],[97.8,8.3],[100.2,8.9],[102.7,9.3],[105.1,9.1],[107.6,10.1],[110.0,10.7],[112.4,7.8],[114.9,6.0],[117.3,5.5],[119.8,6.9],[122.2,6.5],[124.7,7.4],[127.1,8.1],[129.6,8.7],[132.0,8.9],[134.4,8.7],[136.9,8.0],[139.3,7.6],[141.8,8.2],[144.2,8.5],[146.7,8.3],[149.1,7.3],[151.6,5.6],[154.0,4.1],[156.4,3.9],[158.9,0.5],[161.3,2.1],[163.8,1.1],[166.2,1.4],[168.7,2.1],[171.1,2.0],[173.6,0.5],[176.0,0.0],[178.4,0.6],[180.9,2.0],[183.3,3.1],[185.8,4.2],[188.2,4.2],[190.7,3.9],[193.1,3.9],[195.6,4.1],[198.0,4.6],[200.4,5.1],[202.9,5.3],[205.3,4.9],[207.8,4.9],[210.2,4.3],[212.7,3.4],[215.1,2.9],[217.6,2.8],[220.0,3.6]]

export function tornStripDataUri(color) {
  const topPts = TORN_TOP.map(([x, d]) => `${x} ${d}`).join(' L')
  const botPts = TORN_BOTTOM
    .map(([x, d]) => `${x} ${(TORN_THICKNESS - d).toFixed(1)}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TORN_TILE_LEN}' height='${TORN_THICKNESS}'><filter id='ds' x='-20%' y='-60%' width='140%' height='220%'><feDropShadow dx='0' dy='2' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${topPts} L${botPts} Z' fill='${color}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function tornStripVDataUri(color) {
  const leftPts = TORN_TOP.map(([y, d]) => `${d} ${y}`).join(' L')
  const rightPts = TORN_BOTTOM
    .map(([y, d]) => `${(TORN_THICKNESS - d).toFixed(1)} ${y}`)
    .reverse()
    .join(' L')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TORN_THICKNESS}' height='${TORN_TILE_LEN}'><filter id='ds' x='-60%' y='-20%' width='220%' height='140%'><feDropShadow dx='2' dy='0' stdDeviation='1.6' flood-color='#000000' flood-opacity='0.3'/></filter><path filter='url(#ds)' d='M${leftPts} L${rightPts} Z' fill='${color}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Ragged top edge, used as a clip-path on badges.
export const TORN_CLIP =
  'polygon(0% 0%, 2.4% 7%, 4.6% 1.5%, 8% 9%, 10.5% 2%, 14% 8%, 16.8% 0.5%, 20% 7%, 23% 2.5%, 26.5% 9.5%, 29% 1.5%, 32.5% 7.5%, 35% 0%, 100% 0%, 100% 100%, 0% 100%)'
