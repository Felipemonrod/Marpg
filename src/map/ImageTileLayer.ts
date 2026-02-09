import L from 'leaflet'
import type { ResolutionPyramid } from '../utils/multiResolutionImage'
import { getResolutionForZoom } from '../utils/multiResolutionImage'

export default class ImageTileLayer extends L.GridLayer {
  private image: HTMLImageElement
  private imageWidth: number
  private imageHeight: number
  private smoothingQuality: ImageSmoothingQuality
  private resolutionPyramid?: ResolutionPyramid

  constructor(
    image: HTMLImageElement,
    width: number,
    height: number,
    smoothingQuality: ImageSmoothingQuality,
    options?: L.GridLayerOptions,
    resolutionPyramid?: ResolutionPyramid,
  ) {
    super(options)
    this.image = image
    this.imageWidth = width
    this.imageHeight = height
    this.smoothingQuality = smoothingQuality
    this.resolutionPyramid = resolutionPyramid
  }

  createTile(coords: L.Coords): HTMLElement {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    const ctx = tile.getContext('2d')
    if (!ctx) return tile

    // Select appropriate resolution image based on zoom level
    let sourceImage = this.image
    let scaleFactor = 1

    if (this.resolutionPyramid) {
      const zoomLevel = coords.z
      sourceImage = getResolutionForZoom(this.resolutionPyramid, zoomLevel)
      
      // Find the scale factor for coordinate adjustments
      const level = this.resolutionPyramid.levels.find(l => l.image === sourceImage)
      scaleFactor = level?.scale || 1
    }

    const bounds = (
      this as unknown as L.GridLayer & { _tileCoordsToBounds: (c: L.Coords) => L.LatLngBounds }
    )._tileCoordsToBounds(coords)
    const nw = bounds.getNorthWest()
    const se = bounds.getSouthEast()

    const x1 = nw.lng * scaleFactor
    const x2 = se.lng * scaleFactor
    const y1 = -nw.lat * scaleFactor
    const y2 = -se.lat * scaleFactor

    const srcX = Math.max(0, x1)
    const srcY = Math.max(0, y1)
    const srcW = Math.min(this.imageWidth * scaleFactor, x2) - srcX
    const srcH = Math.min(this.imageHeight * scaleFactor, y2) - srcY

    if (srcW <= 0 || srcH <= 0) return tile

    const destX = ((srcX - x1) / (x2 - x1)) * size.x
    const destY = ((srcY - y1) / (y2 - y1)) * size.y
    const destW = (srcW / (x2 - x1)) * size.x
    const destH = (srcH / (y2 - y1)) * size.y

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = this.smoothingQuality
    ctx.clearRect(0, 0, size.x, size.y)
    ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, destX, destY, destW, destH)

    return tile
  }
}
