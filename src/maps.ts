export type MapOverlayEntry = {
  /** Unique id within the map */
  id: string
  /** Display name in the layer control */
  name: string
  /** File inside public/maps */
  file: string
  /** 0..1 */
  opacity?: number
  /** Whether the overlay starts enabled */
  enabled?: boolean
}

export type MapEntry = {
  id: string
  name: string
  file: string
  overlays?: MapOverlayEntry[]
}

export type MapManifest = {
  maps: MapEntry[]
}

export async function fetchMapManifest(): Promise<MapManifest> {
  const response = await fetch('/maps/manifest.json', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Falha ao carregar manifest de mapas: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as MapManifest
}

export async function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  const img = new Image()
  img.decoding = 'async'

  const promise = new Promise<{ width: number; height: number }>((resolve, reject) => {
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem do mapa: ${url}`))
  })

  img.src = url
  return await promise
}
