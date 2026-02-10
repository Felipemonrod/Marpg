import L from 'leaflet'
import type { FogOfWarState } from '../types/layers'

/**
 * Fog of War Layer - Covers the entire map with a dark overlay
 * Users can reveal areas by drawing shapes
 */
export default class FogOfWarLayer extends L.Layer {
  private fogCanvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private state: FogOfWarState

  constructor(state: FogOfWarState, _mapWidth: number, _mapHeight: number) {
    super()
    this.state = state
  }

  onAdd(map: L.Map): this {
    // Create canvas overlay
    this.fogCanvas = document.createElement('canvas')
    this.fogCanvas.style.position = 'absolute'
    this.fogCanvas.style.pointerEvents = 'none'
    this.fogCanvas.style.zIndex = '400' // Above map tiles but below controls

    const mapContainer = map.getContainer()
    const size = map.getSize()
    this.fogCanvas.width = size.x
    this.fogCanvas.height = size.y

    mapContainer.appendChild(this.fogCanvas)
    this.ctx = this.fogCanvas.getContext('2d')

    // Update on map events
    map.on('move', this.redraw, this)
    map.on('zoom', this.redraw, this)
    map.on('resize', this.handleResize, this)

    this.redraw()
    return this
  }

  onRemove(map: L.Map): this {
    if (this.fogCanvas && this.fogCanvas.parentNode) {
      this.fogCanvas.parentNode.removeChild(this.fogCanvas)
    }
    map.off('move', this.redraw, this)
    map.off('zoom', this.redraw, this)
    map.off('resize', this.handleResize, this)
    return this
  }

  private handleResize = () => {
    const map = this._map
    if (!map || !this.fogCanvas) return

    const size = map.getSize()
    this.fogCanvas.width = size.x
    this.fogCanvas.height = size.y
    this.redraw()
  }

  private redraw = () => {
    if (!this.ctx || !this.fogCanvas || !this._map) return
    if (!this.state.enabled) {
      this.ctx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)
      return
    }

    const map = this._map
    const ctx = this.ctx

    // Clear canvas
    ctx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)

    // Fill entire canvas with fog
    ctx.fillStyle = this.hexWithOpacity(this.state.color, this.state.opacity)
    ctx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height)

    // Cut out revealed areas using composite operation
    ctx.globalCompositeOperation = 'destination-out'

    this.state.revealedAreas.forEach(area => {
      if (area.shape === 'circle' && area.radius) {
        this.drawCircle(ctx, map, area.coordinates[0], area.radius)
      } else if (area.shape === 'rectangle' && area.coordinates.length === 2) {
        this.drawRectangle(ctx, map, area.coordinates)
      } else if (area.shape === 'polygon') {
        this.drawPolygon(ctx, map, area.coordinates)
      }
    })

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawCircle(ctx: CanvasRenderingContext2D, map: L.Map, center: number[], radius: number) {
    const point = map.latLngToContainerPoint(L.latLng(center[0], center[1]))
    const radiusPixels = this.coordsToPixels(map, radius)

    ctx.beginPath()
    ctx.arc(point.x, point.y, radiusPixels, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawRectangle(ctx: CanvasRenderingContext2D, map: L.Map, coords: number[][]) {
    const nw = map.latLngToContainerPoint(L.latLng(coords[0][0], coords[0][1]))
    const se = map.latLngToContainerPoint(L.latLng(coords[1][0], coords[1][1]))

    ctx.fillRect(
      Math.min(nw.x, se.x),
      Math.min(nw.y, se.y),
      Math.abs(se.x - nw.x),
      Math.abs(se.y - nw.y)
    )
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, map: L.Map, coords: number[][]) {
    if (coords.length < 3) return

    ctx.beginPath()
    const first = map.latLngToContainerPoint(L.latLng(coords[0][0], coords[0][1]))
    ctx.moveTo(first.x, first.y)

    for (let i = 1; i < coords.length; i++) {
      const point = map.latLngToContainerPoint(L.latLng(coords[i][0], coords[i][1]))
      ctx.lineTo(point.x, point.y)
    }

    ctx.closePath()
    ctx.fill()
  }

  private coordsToPixels(map: L.Map, coordUnits: number): number {
    // Convert coordinate units to pixels at current zoom
    const zoom = map.getZoom()
    const scale = Math.pow(2, zoom)
    return coordUnits * scale * 0.5 // Adjust multiplier as needed
  }

  private hexWithOpacity(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  public updateState(state: FogOfWarState) {
    this.state = state
    this.redraw()
  }

  public getState(): FogOfWarState {
    return this.state
  }
}
