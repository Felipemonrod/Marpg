import type { ImageMeta } from '../types'
import { buildSvgDataUrl } from './svg'

export const buildProjectDataUrl = async (params: {
  image: HTMLImageElement
  width: number
  height: number
  imageMeta: ImageMeta
}) => {
  const { image, width, height, imageMeta } = params

  if (imageMeta.dataUrl) return imageMeta.dataUrl
  if (imageMeta.svgText) return buildSvgDataUrl(imageMeta.svgText)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0)

  const supportedTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
  const outputType = imageMeta.type && supportedTypes.has(imageMeta.type) ? imageMeta.type : 'image/png'
  return canvas.toDataURL(outputType)
}
