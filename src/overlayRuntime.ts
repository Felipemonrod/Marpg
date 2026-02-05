import L from 'leaflet'
import type { LayerRecord, TokenRecord } from './overlayDb'

export type LayerRuntime = {
  layer: L.LayerGroup
  markers: Map<string, L.Marker>
}

export function createTokenMarker(opts: {
  token: TokenRecord
  iconUrl: string
  opacity: number
  onMove: (lat: number, lng: number) => void
  onRemove: () => void
  onSelect?: () => void
}): L.Marker {
  const { token, iconUrl, opacity, onMove, onRemove, onSelect } = opts

  const icon = L.icon({
    iconUrl,
    iconSize: [token.size, token.size],
    iconAnchor: [token.size / 2, token.size / 2],
  })

  const marker = L.marker([token.lat, token.lng], {
    draggable: true,
    icon,
    opacity,
    keyboard: false,
    pane: 'overlay',
    bubblingMouseEvents: false,
  })

  ;(marker as any).__tokenSize = token.size

  marker.on('dragend', () => {
    const p = marker.getLatLng()
    onMove(p.lat, p.lng)
  })

  marker.on('contextmenu', () => {
    onRemove()
  })

  marker.on('click', (e: any) => {
    if (!onSelect) return
    // Prevent map click from also triggering placement.
    const domEvent = e?.originalEvent ?? e
    L.DomEvent.stopPropagation(domEvent)
    onSelect()
  })

  return marker
}

export function setTokenMarkerSize(marker: L.Marker, iconUrl: string, size: number): void {
  ;(marker as any).__tokenSize = size
  marker.setIcon(
    L.icon({
      iconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    }),
  )
}

export function applyLayerOpacity(runtime: LayerRuntime, opacity: number): void {
  for (const marker of runtime.markers.values()) {
    marker.setOpacity(opacity)
  }
}

export function applyLayerVisibility(map: L.Map, runtime: LayerRuntime, visible: boolean): void {
  const has = map.hasLayer(runtime.layer)
  if (visible && !has) runtime.layer.addTo(map)
  if (!visible && has) runtime.layer.removeFrom(map)
}

export function defaultLayer(name = 'Camada'): LayerRecord {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    opacity: 1,
    tokens: [],
  }
}
