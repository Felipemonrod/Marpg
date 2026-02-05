import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import './App.css'

type ProjectFile = {
  version: 1
  image: {
    name: string
    type: string
    width: number
    height: number
    dataUrl: string
  }
}

class ImageTileLayer extends L.GridLayer {
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

    const srcX = Math.max(0, nw.lng)
    const srcY = Math.max(0, nw.lat)
    const srcW = Math.min(this.imageWidth, se.lng) - srcX
    const srcH = Math.min(this.imageHeight, se.lat) - srcY

    if (srcW <= 0 || srcH <= 0) return tile

    const destX = ((srcX - nw.lng) / (se.lng - nw.lng)) * size.x
    const destY = ((srcY - nw.lat) / (se.lat - nw.lat)) * size.y
    const destW = (srcW / (se.lng - nw.lng)) * size.x
    const destH = (srcH / (se.lat - nw.lat)) * size.y

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = this.smoothingQuality
    ctx.clearRect(0, 0, size.x, size.y)
    ctx.drawImage(this.image, srcX, srcY, srcW, srcH, destX, destY, destW, destH)

    return tile
  }
}

function App() {
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.Layer | null>(null)
  const imageRef = useRef<{ image: HTMLImageElement; width: number; height: number } | null>(null)
  const [mapLabel, setMapLabel] = useState<string>('Nenhuma imagem carregada')
  const [notice, setNotice] = useState<string>('')
  const [zoomSettings, setZoomSettings] = useState<{ minZoom: number; maxZoom: number }>({
    minZoom: -5,
    maxZoom: 6,
  })
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high')

  useEffect(() => {
    if (!mapDivRef.current) return
    if (leafletMapRef.current) return

    const map = L.map(mapDivRef.current, {
      crs: L.CRS.Simple,
      zoomControl: true,
      attributionControl: false,
      minZoom: -5,
    })

    const pm = (map as L.Map & { pm?: { addControls: (options: Record<string, boolean>) => void } }).pm
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

    leafletMapRef.current = map

    return () => {
      map.remove()
      leafletMapRef.current = null
    }
  }, [])

  useEffect(() => {
    let timer: number | undefined

    const handler = (e: ClipboardEvent) => {
      const data = e.clipboardData
      if (!data) return

      const imageItem = Array.from(data.items).find((it) => it.kind === 'file' && it.type.startsWith('image/'))
      const fileFromItems = imageItem?.getAsFile() ?? null
      const fileFromFiles = data.files && data.files.length ? data.files[0] : null

      const file = fileFromItems ?? (fileFromFiles?.type.startsWith('image/') ? fileFromFiles : null)

      if (file) {
        e.preventDefault()
        void handleImageFile(file)
        setNotice('Imagem colada do clipboard.')
        if (timer) window.clearTimeout(timer)
        timer = window.setTimeout(() => setNotice(''), 2500)
        return
      }

      const text = data.getData('text/plain')
      if (text && text.startsWith('data:image/')) {
        e.preventDefault()
        const img = new Image()
        img.onload = () => {
          mountImageLayer(img, img.naturalWidth, img.naturalHeight)
          setMapLabel(`clipboard • ${img.naturalWidth}x${img.naturalHeight}`)
          setNotice('Imagem colada do clipboard (data URL).')
        }
        img.onerror = () => setNotice('Falha ao carregar imagem colada.')
        img.src = text
        return
      }

      setNotice('Clipboard sem imagem reconhecida.')
    }

    window.addEventListener('paste', handler)
    return () => {
      window.removeEventListener('paste', handler)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  const mountImageLayer = (image: HTMLImageElement, width: number, height: number) => {
    const map = leafletMapRef.current
    if (!map) return

    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
    }

    const bounds = L.latLngBounds([0, 0], [height, width])
    map.setMaxBounds(bounds)

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
    })

    tileLayer.addTo(map)
    map.fitBounds(bounds)
    tileLayerRef.current = tileLayer
    imageRef.current = { image, width, height }
  }

  useEffect(() => {
    if (!imageRef.current) return
    mountImageLayer(imageRef.current.image, imageRef.current.width, imageRef.current.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSettings, quality])

  const handleImageFile = async (file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      mountImageLayer(img, img.naturalWidth, img.naturalHeight)
      setMapLabel(`${file.name} • ${img.naturalWidth}x${img.naturalHeight}`)
      setNotice('Imagem carregada com tiles de alta qualidade.')
    }
    img.onerror = () => {
      setNotice('Falha ao carregar a imagem.')
    }
    img.src = url
  }

  const handleProjectFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ProjectFile
      if (!data?.image?.dataUrl) {
        setNotice('Arquivo de projeto inválido.')
        return
      }

      const img = new Image()
      img.onload = () => {
        mountImageLayer(img, data.image.width, data.image.height)
        setMapLabel(`${data.image.name} • ${data.image.width}x${data.image.height}`)
        setNotice('Projeto carregado.')
      }
      img.onerror = () => setNotice('Falha ao carregar a imagem do projeto.')
      img.src = data.image.dataUrl
    } catch {
      setNotice('Arquivo de projeto inválido.')
    }
  }

  const handleZoomImport = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as {
        version?: number
        zoom?: { minZoom?: number; maxZoom?: number }
        quality?: 'low' | 'medium' | 'high' | 'ultra'
      }
      if (!data?.zoom) {
        setNotice('Arquivo de zoom inválido.')
        return
      }

      const nextMin = typeof data.zoom.minZoom === 'number' ? data.zoom.minZoom : zoomSettings.minZoom
      const nextMax = typeof data.zoom.maxZoom === 'number' ? data.zoom.maxZoom : zoomSettings.maxZoom
      setZoomSettings({ minZoom: Math.min(nextMin, nextMax), maxZoom: Math.max(nextMin, nextMax) })
      if (data.quality) setQuality(data.quality)
      setNotice('Ajustes de zoom importados.')
    } catch {
      setNotice('Arquivo de zoom inválido.')
    }
  }

  const handleZoomExport = () => {
    const payload = {
      version: 1,
      zoom: {
        minZoom: zoomSettings.minZoom,
        maxZoom: zoomSettings.maxZoom,
      },
      quality,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zoom-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <div className="menu">
        <div className="menu-left">
          <span className="menu-title">RPG Map Studio</span>
          <span className="menu-item">Arquivo</span>
          <span className="menu-item">Editar</span>
          <span className="menu-item">Exibir</span>
        </div>
        <div className="menu-right">
          <span className="menu-hint">Dica: Ctrl+V para colar imagem</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="title">Tile System (alta qualidade)</div>
          <div className="hint">{mapLabel}</div>
        </div>
        <div className="toolbar-right">
          <label className="fileLabel">
            Importar imagem
            <input
              className="fileInput"
              type="file"
              accept="image/*"
              onChange={(e) => void handleImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="fileLabel">
            Importar projeto
            <input
              className="fileInput"
              type="file"
              accept="application/json"
              onChange={(e) => void handleProjectFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="fileLabel">
            Importar zoom
            <input
              className="fileInput"
              type="file"
              accept="application/json"
              onChange={(e) => void handleZoomImport(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="btn" type="button" onClick={handleZoomExport}>
            Exportar zoom
          </button>
        </div>
      </div>
      <div className="controls">
        <div className="controlGroup">
          <label className="controlLabel">Min zoom</label>
          <input
            className="controlInput"
            type="number"
            step={1}
            value={zoomSettings.minZoom}
            onChange={(e) => {
              const value = Number(e.target.value)
              setZoomSettings((prev) => ({
                minZoom: Math.min(value, prev.maxZoom),
                maxZoom: prev.maxZoom,
              }))
            }}
          />
        </div>
        <div className="controlGroup">
          <label className="controlLabel">Max zoom</label>
          <input
            className="controlInput"
            type="number"
            step={1}
            value={zoomSettings.maxZoom}
            onChange={(e) => {
              const value = Number(e.target.value)
              setZoomSettings((prev) => ({
                minZoom: prev.minZoom,
                maxZoom: Math.max(value, prev.minZoom),
              }))
            }}
          />
        </div>
        <div className="controlGroup">
          <label className="controlLabel">Qualidade</label>
          <select
            className="controlSelect"
            value={quality}
            onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high' | 'ultra')}
          >
            <option value="low">Baixa (mais leve)</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="ultra">Ultra (mais pesada)</option>
          </select>
        </div>
      </div>
      <div className="note">
        Lembrete: qualidade mais alta gera tiles mais pesados. Exporte os ajustes de zoom/qualidade para reutilizar.
      </div>
      {notice ? <div className="status">{notice}</div> : null}
      <div ref={mapDivRef} className="map" />
    </div>
  )
}

export default App
