import { useEffect, useRef } from 'react'
import L from 'leaflet'

const useLeafletMap = (options: { minZoom: number }) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapDivRef.current) return
    if (mapRef.current) return

    const map = L.map(mapDivRef.current, {
      crs: L.CRS.Simple,
      zoomControl: true,
      attributionControl: false,
      minZoom: options.minZoom,
    })

    map.setView([0, 0], 0)

    const pm = (map as L.Map & { pm?: { addControls: (config: Record<string, boolean>) => void } }).pm
    pm?.addControls({
      position: 'topleft',
      drawMarker: true,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [options.minZoom])

  return { mapDivRef, mapRef }
}

export default useLeafletMap
