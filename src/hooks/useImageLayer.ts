import { useEffect, useRef } from 'react'
import L from 'leaflet'
import ImageTileLayer from '../map/ImageTileLayer'
import type { Quality, ZoomSettings } from '../types'

type UseImageLayerParams = {
  mapRef: React.MutableRefObject<L.Map | null>
  zoomSettings: ZoomSettings
  quality: Quality
}

const useImageLayer = ({ mapRef, zoomSettings, quality }: UseImageLayerParams) => {
  const tileLayerRef = useRef<L.Layer | null>(null)
  const imageRef = useRef<{ image: HTMLImageElement; width: number; height: number } | null>(null)

  const mountImageLayer = (image: HTMLImageElement, width: number, height: number) => {
    const map = mapRef.current
    if (!map) return

    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
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

    const tileLayer = new ImageTileLayer(image, width, height, qualityConfig.smoothing, {
      tileSize: qualityConfig.tileSize,
      bounds,
      minZoom: zoomSettings.minZoom,
      maxZoom: zoomSettings.maxZoom,
      noWrap: true,
      keepBuffer: 0,
      updateWhenIdle: true,
      updateInterval: 200,
    })

    tileLayer.addTo(map)
    map.fitBounds(bounds, { animate: false })
    map.invalidateSize()
    tileLayerRef.current = tileLayer
    imageRef.current = { image, width, height }
  }

  const clearImageLayer = () => {
    const map = mapRef.current
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
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
  }, [zoomSettings, quality])

  return { imageRef, mountImageLayer, clearImageLayer }
}

export default useImageLayer
