/**
 * Layer management types for RPG map tool
 */

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  opacity: number // 0-1
  zIndex: number
  locked: boolean // If true, cannot be edited
  type: 'drawing' | 'fog' | 'annotation' | 'custom'
  items: LayerItem[]
}

export interface LayerItem {
  id: string
  layerId: string
  type: 'shape' | 'marker' | 'text' | 'polygon' | 'polyline' | 'circle' | 'rectangle'
  data: any // GeoJSON or Leaflet layer data
  leafletId?: number // Internal Leaflet layer ID
}

export interface FogOfWarState {
  enabled: boolean
  opacity: number // 0-1
  color: string // hex color
  revealedAreas: RevealedArea[]
}

export interface RevealedArea {
  id: string
  shape: 'circle' | 'rectangle' | 'polygon'
  coordinates: number[][] // lat/lng pairs
  radius?: number // for circles
}

export interface LayerManagerState {
  layers: MapLayer[]
  activeLayerId: string | null
  fogOfWar: FogOfWarState
}
