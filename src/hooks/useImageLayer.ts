import { useEffect, useRef } from 'react'
import L from 'leaflet'
import ImageTileLayer from '../map/ImageTileLayer'
import SvgVectorLayer from '../map/SvgVectorLayer'
import type { Quality, ZoomSettings, RenderingMode } from '../types'
import type { ResolutionPyramid } from '../utils/multiResolutionImage'

type UseImageLayerParams = {
  mapRef: React.MutableRefObject<L.Map | null>
  zoomSettings: ZoomSettings
  quality: Quality
  renderingMode: RenderingMode
  svgText?: string
  resolutionPyramid?: ResolutionPyramid
}

const useImageLayer = ({ 
  mapRef, 
  zoomSettings, 
  quality, 
  renderingMode, 
  svgText, 
  resolutionPyramid 
}: UseImageLayerParams) => {
  const tileLayerRef = useRef<L.Layer | null>(null)
  const vectorLayerRef = useRef<SvgVectorLayer | null>(null)
  const imageRef = useRef<{ image: HTMLImageElement; width: number; height: number } | null>(null)

  const mountImageLayer = (image: HTMLImageElement, width: number, height: number) => {
    const map = mapRef.current
    if (!map) return

    // Remove existing layers
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
    }
    if (vectorLayerRef.current) {
      vectorLayerRef.current.remove()
      vectorLayerRef.current = null
    }

    const bounds = L.latLngBounds([0, 0], [-height, width])

    map.setMinZoom(zoomSettings.minZoom)
    map.setMaxZoom(zoomSettings.maxZoom)

    const qualityConfig = {
      low: { tileSize: 128, smoothing: 'low' as ImageSmoothingQuality },
      medium: { tileSize: 256, smoothing: 'medium' as ImageSmoothingQuality },
      high: { tileSize: 256, smoothing: 'high' as ImageSmoothingQuality },
      ultra: { tileSize: 512, smoothing: 'high' as ImageSmoothingQuality },
    }[quality]

    // Determine which rendering mode to use
    const shouldUseVector = 
      svgText && 
      (renderingMode === 'vector' || (renderingMode === 'auto' && svgText))

    if (shouldUseVector && svgText) {
      // Use SVG vector layer for crisp rendering
      try {
        const vectorLayer = new SvgVectorLayer(svgText, width, height)
        vectorLayer.addTo(map)
        vectorLayerRef.current = vectorLayer
        
        // Also add a low-opacity raster layer as fallback for complex SVGs
        const tileLayer = new ImageTileLayer(
          image, 
          width, 
          height, 
          qualityConfig.smoothing, 
          {
            tileSize: qualityConfig.tileSize,
            bounds,
            minZoom: zoomSettings.minZoom,
            maxZoom: zoomSettings.maxZoom,
            noWrap: true,
            keepBuffer: 0,
            updateWhenIdle: true,
            updateInterval: 200,
            opacity: 0.3, // Low opacity for fallback
          },
          resolutionPyramid
        )
        tileLayer.addTo(map)
        tileLayerRef.current = tileLayer
      } catch (error) {
        console.error('Failed to create vector layer, falling back to raster:', error)
        // Fall through to raster rendering
      }
    }
    
    // Use raster tile layer (with or without resolution pyramid)
    if (!vectorLayerRef.current || renderingMode === 'raster') {
      const tileLayer = new ImageTileLayer(
        image, 
        width, 
        height, 
        qualityConfig.smoothing, 
        {
          tileSize: qualityConfig.tileSize,
          bounds,
          minZoom: zoomSettings.minZoom,
          maxZoom: zoomSettings.maxZoom,
          noWrap: true,
          keepBuffer: 0,
          updateWhenIdle: true,
          updateInterval: 200,
        },
        resolutionPyramid
      )

      tileLayer.addTo(map)
      tileLayerRef.current = tileLayer
    }

    map.fitBounds(bounds, { animate: false })
    map.invalidateSize()
    imageRef.current = { image, width, height }
  }

  const clearImageLayer = () => {
    const map = mapRef.current
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
    }
    if (vectorLayerRef.current) {
      vectorLayerRef.current.remove()
      vectorLayerRef.current = null
    }
    imageRef.current = null

    if (map) {
      map.setView([0, 0], 0)
      map.invalidateSize()
    }
  }

  useEffect(() => {
    if (!imageRef.current) return
    mountImageLayer(imageRef.current.image, imageRef.current.width, imageRef.current.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSettings, quality, renderingMode, svgText, resolutionPyramid])

  return { imageRef, mountImageLayer, clearImageLayer }
}

export default useImageLayer
