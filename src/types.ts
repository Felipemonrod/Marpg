export type Quality = 'low' | 'medium' | 'high' | 'ultra'

export type RenderingMode = 'auto' | 'vector' | 'raster'

export type ZoomSettings = {
  minZoom: number
  maxZoom: number
}

export type ProjectFile = {
  version: 1
  image: {
    name: string
    type: string
    width: number
    height: number
    dataUrl: string
  }
  zoom: ZoomSettings
  quality: Quality
  renderingMode?: RenderingMode
}

export type ImageMeta = {
  name: string
  type: string
  dataUrl?: string
  svgText?: string
}
