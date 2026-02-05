import type { FeatureCollection } from 'geojson'

const keyFor = (mapId: string) => `rpgmap:${mapId}:drawings`

export function saveDrawings(mapId: string, geojson: FeatureCollection): void {
  localStorage.setItem(keyFor(mapId), JSON.stringify(geojson))
}

export function loadDrawings(mapId: string): FeatureCollection | null {
  const raw = localStorage.getItem(keyFor(mapId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as FeatureCollection
  } catch {
    return null
  }
}

export function clearDrawings(mapId: string): void {
  localStorage.removeItem(keyFor(mapId))
}
