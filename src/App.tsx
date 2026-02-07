import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import './App.css'
import ImageTileLayer from './map/ImageTileLayer'
import MenuBar from './components/MenuBar'
import Sidebar from './components/Sidebar'
import type { ImageMeta, ProjectFile, Quality, ZoomSettings } from './types'
import { extractSvgTextFromDataUrl, parseSvgDimensions } from './utils/svg'
import { buildProjectDataUrl } from './utils/projectDataUrl'

function App() {
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.Layer | null>(null)
  const imageRef = useRef<{ image: HTMLImageElement; width: number; height: number } | null>(null)
  const [mapLabel, setMapLabel] = useState<string>('Nenhuma imagem carregada')
  const [notice, setNotice] = useState<string>('')
  const [zoomSettings, setZoomSettings] = useState<ZoomSettings>({
    minZoom: -5,
    maxZoom: 6,
  })
  const [quality, setQuality] = useState<Quality>('high')
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)

  const cacheKeys = {
    project: 'rpg_map_project_v1',
    fixedImage: 'rpg_map_fixed_image_v1',
  }

  useEffect(() => {
    if (!mapDivRef.current) return
    if (leafletMapRef.current) return

    const map = L.map(mapDivRef.current, {
      crs: L.CRS.Simple,
      zoomControl: true,
      attributionControl: false,
      minZoom: -5,
    })

    map.setView([0, 0], 0)

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
    const cachedProject = localStorage.getItem(cacheKeys.project)
    if (!cachedProject) return

    try {
      const data = JSON.parse(cachedProject) as ProjectFile
      if (!data?.image?.dataUrl) return
      const img = new Image()
      img.onload = () => {
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        mountImageLayer(img, data.image.width, data.image.height)
        setMapLabel(`${data.image.name} • ${data.image.width}x${data.image.height}`)
        setNotice('Projeto carregado do armazenamento local.')
      }
      img.src = data.image.dataUrl
    } catch {
      // ignore cache errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const map = leafletMapRef.current
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
      tileLayerRef.current = null
    }
    imageRef.current = null
    setImageMeta(null)
    setMapLabel('Nenhuma imagem carregada')
    setNotice('Imagem removida.')

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

  const getProjectDataUrl = async () => {
    if (!imageRef.current || !imageMeta) return null
    return buildProjectDataUrl({
      image: imageRef.current.image,
      width: imageRef.current.width,
      height: imageRef.current.height,
      imageMeta,
    })
  }

  const handleImageFile = async (file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (width && height) {
        mountImageLayer(img, width, height)
        setMapLabel(`${file.name} • ${width}x${height}`)
        setImageMeta({ name: file.name, type: file.type })
      }
      setNotice('Imagem carregada com tiles de alta qualidade.')
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setNotice('Falha ao carregar a imagem.')
      URL.revokeObjectURL(url)
    }

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const svgText = await file.text()
      const dims = parseSvgDimensions(svgText)
      if (dims) {
        setZoomSettings((prev) => ({ ...prev, maxZoom: Math.max(prev.maxZoom, 10) }))
        img.onload = () => {
          mountImageLayer(img, dims.width, dims.height)
          setMapLabel(`${file.name} • ${dims.width}x${dims.height}`)
          setNotice('SVG carregado com alta definição.')
          setImageMeta({ name: file.name, type: file.type, svgText })
          URL.revokeObjectURL(url)
        }
      }
    }

    img.src = url
  }

  const handleFixedImageFile = async (file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (width && height) {
        mountImageLayer(img, width, height)
        setMapLabel(`${file.name} • ${width}x${height}`)
        setImageMeta({ name: file.name, type: file.type })
      }
      setNotice('Imagem fixa carregada.')
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setNotice('Falha ao carregar a imagem fixa.')
      URL.revokeObjectURL(url)
    }

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const svgText = await file.text()
      const dims = parseSvgDimensions(svgText)
      if (dims) {
        setZoomSettings((prev) => ({ ...prev, maxZoom: Math.max(prev.maxZoom, 10) }))
        img.onload = () => {
          mountImageLayer(img, dims.width, dims.height)
          setMapLabel(`${file.name} • ${dims.width}x${dims.height}`)
          setNotice('SVG carregado com alta definição.')
          setImageMeta({ name: file.name, type: file.type, svgText })
          URL.revokeObjectURL(url)
        }
      }
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
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        setNotice('Projeto carregado.')
      }
      img.onerror = () => setNotice('Falha ao carregar a imagem do projeto.')
      img.src = data.image.dataUrl
    } catch {
      setNotice('Arquivo de projeto inválido.')
    }
  }

  const loadProjectFromLocal = () => {
    const raw = localStorage.getItem(cacheKeys.project)
    if (!raw) {
      setNotice('Nenhum projeto salvo localmente.')
      return
    }
    try {
      const data = JSON.parse(raw) as ProjectFile
      if (!data?.image?.dataUrl) {
        setNotice('Projeto local inválido.')
        return
      }
      const img = new Image()
      img.onload = () => {
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        mountImageLayer(img, data.image.width, data.image.height)
        setMapLabel(`${data.image.name} • ${data.image.width}x${data.image.height}`)
        setNotice('Projeto carregado do armazenamento local.')
      }
      img.src = data.image.dataUrl
    } catch {
      setNotice('Projeto local inválido.')
    }
  }

  const exportProject = async () => {
    if (!imageMeta || !imageRef.current) {
      setNotice('Nenhuma imagem para exportar o projeto.')
      return
    }

    const dataUrl = await getProjectDataUrl()
    if (!dataUrl) {
      setNotice('Falha ao preparar a imagem do projeto.')
      return
    }

    const payload: ProjectFile = {
      version: 1,
      image: {
        name: imageMeta.name,
        type: imageMeta.type,
        width: imageRef.current.width,
        height: imageRef.current.height,
        dataUrl,
      },
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
    a.download = 'rpg-map-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportFixedImage = () => {
    if (!imageRef.current) {
      setNotice('Nenhuma imagem para exportar.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = imageRef.current.width
    canvas.height = imageRef.current.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imageRef.current.image, 0, 0)

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'rpg-map-fixed.png'
    a.click()
  }

  const exportAutomatic = () => {
    if (!imageRef.current) {
      setNotice('Nenhuma imagem para exportar.')
      return
    }
    exportFixedImage()
    window.setTimeout(() => void exportProject(), 300)
    setNotice('Exportação automática iniciada (imagem fixa + projeto).')
  }

  const saveProjectToCache = async () => {
    if (!imageMeta || !imageRef.current) {
      setNotice('Nenhuma imagem para salvar no cache.')
      return
    }

    const dataUrl = await getProjectDataUrl()
    if (!dataUrl) {
      setNotice('Falha ao preparar o projeto local.')
      return
    }

    const payload: ProjectFile = {
      version: 1,
      image: {
        name: imageMeta.name,
        type: imageMeta.type,
        width: imageRef.current.width,
        height: imageRef.current.height,
        dataUrl,
      },
      zoom: {
        minZoom: zoomSettings.minZoom,
        maxZoom: zoomSettings.maxZoom,
      },
      quality,
    }

    localStorage.setItem(cacheKeys.project, JSON.stringify(payload))
    setNotice('Projeto salvo localmente.')
  }

  const saveFixedImageToCache = () => {
    if (!imageRef.current) {
      setNotice('Nenhuma imagem para salvar no cache.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = imageRef.current.width
    canvas.height = imageRef.current.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imageRef.current.image, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')

    localStorage.setItem(cacheKeys.fixedImage, JSON.stringify({
      version: 1,
      name: imageMeta?.name ?? 'mapa.png',
      dataUrl,
    }))
    setNotice('Imagem fixa salva localmente.')
  }

  const loadFixedImageFromCache = () => {
    const raw = localStorage.getItem(cacheKeys.fixedImage)
    if (!raw) {
      setNotice('Nenhuma imagem fixa salva localmente.')
      return
    }
    try {
      const data = JSON.parse(raw) as { dataUrl: string; name?: string }
      if (!data?.dataUrl) {
        setNotice('Imagem fixa local inválida.')
        return
      }
      const img = new Image()
      img.onload = () => {
        mountImageLayer(img, img.naturalWidth, img.naturalHeight)
        setMapLabel(`${data.name ?? 'cache'} • ${img.naturalWidth}x${img.naturalHeight}`)
        setNotice('Imagem fixa carregada do armazenamento local.')
      }
      img.src = data.dataUrl
    } catch {
      setNotice('Imagem fixa local inválida.')
    }
  }

  return (
    <div className="app">
      <MenuBar />
      <div className={`main ${sidebarOpen ? 'sidebarOpen' : 'sidebarClosed'}`}>
        <div className="mapArea">
          <div ref={mapDivRef} className="map" />
        </div>

        <button
          className="panelHandle"
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
          title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
        >
          {sidebarOpen ? '>' : '<'}
        </button>

        <Sidebar
          mapLabel={mapLabel}
          notice={notice}
          zoomSettings={zoomSettings}
          quality={quality}
          onImageFile={(file) => void handleImageFile(file)}
          onFixedImageFile={(file) => void handleFixedImageFile(file)}
          onProjectFile={(file) => void handleProjectFile(file)}
          onClearImage={clearImageLayer}
          onExportFixed={exportFixedImage}
          onExportProject={() => void exportProject()}
          onExportAutomatic={exportAutomatic}
          onSaveFixedLocal={saveFixedImageToCache}
          onSaveProjectLocal={() => void saveProjectToCache()}
          onLoadProjectLocal={loadProjectFromLocal}
          onLoadFixedLocal={loadFixedImageFromCache}
          onZoomChange={setZoomSettings}
          onQualityChange={setQuality}
        />
      </div>
    </div>
  )
}

export default App
