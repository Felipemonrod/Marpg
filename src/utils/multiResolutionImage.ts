/**
 * Multi-resolution image generator for map rendering
 * Generates resolution pyramid for both SVG and raster images
 */

export interface ResolutionLevel {
  scale: number // 1x, 2x, 4x, etc.
  image: HTMLImageElement
  minZoom: number // Minimum zoom level where this resolution should be used
  maxZoom: number // Maximum zoom level where this resolution should be used
}

export interface ResolutionPyramid {
  levels: ResolutionLevel[]
  originalWidth: number
  originalHeight: number
  type: 'svg' | 'raster'
}

/**
 * Generate resolution pyramid from SVG text
 */
export async function generateSvgPyramid(
  svgText: string,
  originalWidth: number,
  originalHeight: number,
  scales: number[] = [1, 2, 4]
): Promise<ResolutionPyramid> {
  const levels: ResolutionLevel[] = []

  for (let i = 0; i < scales.length; i++) {
    const scale = scales[i]
    const level = await renderSvgAtScale(svgText, originalWidth, originalHeight, scale)
    
    // Calculate zoom ranges for this resolution level
    const minZoom = i === 0 ? -10 : Math.floor(Math.log2(scales[i - 1]) * 2)
    const maxZoom = i === scales.length - 1 ? 20 : Math.floor(Math.log2(scale) * 2 + 2)

    levels.push({
      scale,
      image: level,
      minZoom,
      maxZoom,
    })
  }

  return {
    levels,
    originalWidth,
    originalHeight,
    type: 'svg',
  }
}

/**
 * Generate resolution pyramid from raster image
 */
export async function generateRasterPyramid(
  sourceImage: HTMLImageElement,
  scales: number[] = [1, 2, 4]
): Promise<ResolutionPyramid> {
  const originalWidth = sourceImage.naturalWidth
  const originalHeight = sourceImage.naturalHeight
  const levels: ResolutionLevel[] = []

  for (let i = 0; i < scales.length; i++) {
    const scale = scales[i]
    const level = await scaleRasterImage(sourceImage, scale)
    
    // Calculate zoom ranges for this resolution level
    const minZoom = i === 0 ? -10 : Math.floor(Math.log2(scales[i - 1]) * 2)
    const maxZoom = i === scales.length - 1 ? 20 : Math.floor(Math.log2(scale) * 2 + 2)

    levels.push({
      scale,
      image: level,
      minZoom,
      maxZoom,
    })
  }

  return {
    levels,
    originalWidth,
    originalHeight,
    type: 'raster',
  }
}

/**
 * Render SVG at a specific scale
 */
async function renderSvgAtScale(
  svgText: string,
  width: number,
  height: number,
  scale: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const scaledWidth = Math.round(width * scale)
    const scaledHeight = Math.round(height * scale)

    // Create a blob from SVG text
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.width = scaledWidth
    img.height = scaledHeight

    img.onload = () => {
      // Create canvas to render SVG at target resolution
      const canvas = document.createElement('canvas')
      canvas.width = scaledWidth
      canvas.height = scaledHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Use high-quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Draw SVG at scaled resolution
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

      // Convert canvas to image
      const resultImg = new Image()
      resultImg.onload = () => {
        URL.revokeObjectURL(url)
        resolve(resultImg)
      }
      resultImg.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load result image'))
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resultImg.src = URL.createObjectURL(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }

    img.src = url
  })
}

/**
 * Scale raster image using high-quality canvas rendering
 */
async function scaleRasterImage(
  sourceImage: HTMLImageElement,
  scale: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const scaledWidth = Math.round(sourceImage.naturalWidth * scale)
    const scaledHeight = Math.round(sourceImage.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = scaledWidth
    canvas.height = scaledHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Use high-quality rendering settings
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw scaled image
    ctx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight)

    // Convert canvas to image
    const resultImg = new Image()
    resultImg.onload = () => resolve(resultImg)
    resultImg.onerror = () => reject(new Error('Failed to load scaled image'))

    canvas.toBlob((blob) => {
      if (blob) {
        resultImg.src = URL.createObjectURL(blob)
      } else {
        reject(new Error('Failed to create blob from canvas'))
      }
    }, 'image/png')
  })
}

/**
 * Get the appropriate resolution level for a given zoom level
 */
export function getResolutionForZoom(pyramid: ResolutionPyramid, zoom: number): HTMLImageElement {
  // Find the most appropriate resolution level for this zoom
  for (const level of pyramid.levels) {
    if (zoom >= level.minZoom && zoom <= level.maxZoom) {
      return level.image
    }
  }

  // Fallback to highest resolution if zoom exceeds all ranges
  return pyramid.levels[pyramid.levels.length - 1].image
}

/**
 * Release memory from resolution pyramid
 */
export function disposePyramid(pyramid: ResolutionPyramid) {
  pyramid.levels.forEach((level) => {
    if (level.image.src.startsWith('blob:')) {
      URL.revokeObjectURL(level.image.src)
    }
  })
}
