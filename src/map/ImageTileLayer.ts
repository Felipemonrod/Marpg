import L from 'leaflet'

export default class ImageTileLayer extends L.GridLayer {
  private image: HTMLImageElement
  private imageWidth: number
  private imageHeight: number
  private smoothingQuality: ImageSmoothingQuality

  constructor(
    image: HTMLImageElement,
    width: number,
    height: number,
    smoothingQuality: ImageSmoothingQuality,
    options?: L.GridLayerOptions,
  ) {
    super(options)
    this.image = image
    this.imageWidth = width
    this.imageHeight = height
    this.smoothingQuality = smoothingQuality
  }

  createTile(coords: L.Coords): HTMLElement {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    const ctx = tile.getContext('2d')
    if (!ctx) return tile

    const bounds = (
      this as unknown as L.GridLayer & { _tileCoordsToBounds: (c: L.Coords) => L.LatLngBounds }
    )._tileCoordsToBounds(coords)
    const nw = bounds.getNorthWest()
    const se = bounds.getSouthEast()

    const x1 = nw.lng
    const x2 = se.lng
    const y1 = -nw.lat
    const y2 = -se.lat

    const srcX = Math.max(0, x1)
    const srcY = Math.max(0, y1)
    const srcW = Math.min(this.imageWidth, x2) - srcX
    const srcH = Math.min(this.imageHeight, y2) - srcY

    if (srcW <= 0 || srcH <= 0) return tile

    const destX = ((srcX - x1) / (x2 - x1)) * size.x
    const destY = ((srcY - y1) / (y2 - y1)) * size.y
    const destW = (srcW / (x2 - x1)) * size.x
    const destH = (srcH / (y2 - y1)) * size.y

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = this.smoothingQuality
    ctx.clearRect(0, 0, size.x, size.y)
    ctx.drawImage(this.image, srcX, srcY, srcW, srcH, destX, destY, destW, destH)

    return tile
  }
}
