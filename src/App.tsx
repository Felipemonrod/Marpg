import { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import './App.css'
import MenuBar from './components/MenuBar'
import Sidebar from './components/Sidebar'
import type { ImageMeta, ProjectFile, Quality, ZoomSettings, RenderingMode } from './types'
import { extractSvgTextFromDataUrl, parseSvgDimensions } from './utils/svg'
import { buildProjectDataUrl } from './utils/projectDataUrl'
import { generateSvgPyramid, generateRasterPyramid, type ResolutionPyramid } from './utils/multiResolutionImage'
import { useLayerManager } from './hooks/useLayerManager'
import FogOfWarLayer from './map/FogOfWarLayer'
import useLeafletMap from './hooks/useLeafletMap'
import useImageLayer from './hooks/useImageLayer'

function App() {
  const [mapLabel, setMapLabel] = useState<string>('Nenhuma imagem carregada')
  const [notice, setNotice] = useState<string>('')
  const [zoomSettings, setZoomSettings] = useState<ZoomSettings>({
    minZoom: -5,
    maxZoom: 6,
  })
  const [quality, setQuality] = useState<Quality>('high')
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('auto')
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null)
  const [resolutionPyramid, setResolutionPyramid] = useState<ResolutionPyramid | undefined>(undefined)
  const [fogDrawMode, setFogDrawMode] = useState<boolean>(false)
  const [fogLayerRef, setFogLayerRef] = useState<FogOfWarLayer | null>(null)

  const { mapDivRef, mapRef } = useLeafletMap({ minZoom: -5 })
  const { imageRef, mountImageLayer, clearImageLayer: clearMapImage } = useImageLayer({
    mapRef,
    zoomSettings,
    quality,
    renderingMode,
    svgText: imageMeta?.svgText,
    resolutionPyramid,
  })

  // Layer management system
  const layerManager = useLayerManager()

  const cacheKeys = {
    project: 'rpg_map_project_v1',
    fixedImage: 'rpg_map_fixed_image_v1',
  }

  useEffect(() => {
    const cachedProject = localStorage.getItem(cacheKeys.project)
    if (!cachedProject) return

    try {
      const data = JSON.parse(cachedProject) as ProjectFile
      if (!data?.image?.dataUrl) return
      const img = new Image()
      img.onload = async () => {
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        if (data.renderingMode) {
          setRenderingMode(data.renderingMode)
        }
        
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        
        // Regenerate resolution pyramid
        if (svgText) {
          const pyramid = await generateSvgPyramid(svgText, data.image.width, data.image.height, [1, 2, 4, 8])
          setResolutionPyramid(pyramid)
        } else {
          const pyramid = await generateRasterPyramid(img, [1, 2, 4])
          setResolutionPyramid(pyramid)
        }
        
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

  // Manage Fog of War layer
  useEffect(() => {
    const map = mapRef.current
    if (!map || !imageRef.current) return

    if (layerManager.fogOfWar.enabled) {
      // Add or update fog layer
      if (!fogLayerRef) {
        const fogLayer = new FogOfWarLayer(
          layerManager.fogOfWar,
          imageRef.current.width,
          imageRef.current.height
        )
        fogLayer.addTo(map)
        setFogLayerRef(fogLayer)
      } else {
        fogLayerRef.updateState(layerManager.fogOfWar)
      }
    } else {
      // Remove fog layer
      if (fogLayerRef) {
        fogLayerRef.remove()
        setFogLayerRef(null)
      }
    }
  }, [layerManager.fogOfWar, mapRef, imageRef, fogLayerRef])

  // Handle fog drawing mode integration with Geoman
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (fogDrawMode && layerManager.fogOfWar.enabled) {
      // Listen to Geoman events to capture revealed areas
      const handleCreated = (e: any) => {
        const layer = e.layer
        if (!layer) return

        // Extract coordinates based on shape type
        if (layer instanceof L.Circle) {
          const center = layer.getLatLng()
          const radius = layer.getRadius()
          layerManager.revealFogArea({
            id: `fog-${Date.now()}`,
            shape: 'circle',
            coordinates: [[center.lat, center.lng]],
            radius,
          })
          // Remove the drawing layer as it's now part of fog
          map.removeLayer(layer)
        } else if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds()
          layerManager.revealFogArea({
            id: `fog-${Date.now()}`,
            shape: 'rectangle',
            coordinates: [
              [bounds.getNorth(), bounds.getWest()],
              [bounds.getSouth(), bounds.getEast()],
            ],
          })
          map.removeLayer(layer)
        } else if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[]
          layerManager.revealFogArea({
            id: `fog-${Date.now()}`,
            shape: 'polygon',
            coordinates: latlngs.map(ll => [ll.lat, ll.lng]),
          })
          map.removeLayer(layer)
        }
      }

      map.on('pm:create', handleCreated)

      return () => {
        map.off('pm:create', handleCreated)
      }
    }
  }, [fogDrawMode, layerManager, mapRef])

  useEffect(() => {
    if (!imageRef.current) return
    mountImageLayer(imageRef.current.image, imageRef.current.width, imageRef.current.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSettings, quality, renderingMode, imageMeta?.svgText, resolutionPyramid])

  const clearImageLayer = () => {
    clearMapImage()
    setImageMeta(null)
    setResolutionPyramid(undefined)
    setMapLabel('Nenhuma imagem carregada')
    setNotice('Imagem removida.')
  }

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
    
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    let svgText: string | undefined

    if (isSvg) {
      svgText = await file.text()
      const dims = parseSvgDimensions(svgText)
      if (dims) {
        // For SVG, increase max zoom to allow more detail
        setZoomSettings((prev) => ({ ...prev, maxZoom: Math.max(prev.maxZoom, 12) }))
        
        img.onload = async () => {
          // Generate resolution pyramid for SVG
          const pyramid = await generateSvgPyramid(svgText!, dims.width, dims.height, [1, 2, 4, 8])
          setResolutionPyramid(pyramid)
          
          mountImageLayer(img, dims.width, dims.height)
          setMapLabel(`${file.name} • ${dims.width}x${dims.height} (Multi-Res)`)
          setNotice('SVG carregado com multi-resolução e suporte vetorial.')
          setImageMeta({ name: file.name, type: file.type, svgText })
          URL.revokeObjectURL(url)
        }
        
        img.src = url
        return
      }
    }

    // Handle raster images
    img.onload = async () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (width && height) {
        // Generate resolution pyramid for raster images
        const pyramid = await generateRasterPyramid(img, [1, 2, 4])
        setResolutionPyramid(pyramid)
        
        mountImageLayer(img, width, height)
        setMapLabel(`${file.name} • ${width}x${height} (Multi-Res)`)
        setImageMeta({ name: file.name, type: file.type })
        setNotice('Imagem carregada com multi-resolução.')
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setNotice('Falha ao carregar a imagem.')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  const handleFixedImageFile = async (file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    let svgText: string | undefined

    if (isSvg) {
      svgText = await file.text()
      const dims = parseSvgDimensions(svgText)
      if (dims) {
        setZoomSettings((prev) => ({ ...prev, maxZoom: Math.max(prev.maxZoom, 12) }))
        
        img.onload = async () => {
          const pyramid = await generateSvgPyramid(svgText!, dims.width, dims.height, [1, 2, 4, 8])
          setResolutionPyramid(pyramid)
          
          mountImageLayer(img, dims.width, dims.height)
          setMapLabel(`${file.name} • ${dims.width}x${dims.height} (Multi-Res)`)
          setNotice('SVG carregado com multi-resolução.')
          setImageMeta({ name: file.name, type: file.type, svgText })
          URL.revokeObjectURL(url)
        }
        
        img.src = url
        return
      }
    }

    img.onload = async () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (width && height) {
        const pyramid = await generateRasterPyramid(img, [1, 2, 4])
        setResolutionPyramid(pyramid)
        
        mountImageLayer(img, width, height)
        setMapLabel(`${file.name} • ${width}x${height} (Multi-Res)`)
        setImageMeta({ name: file.name, type: file.type })
        setNotice('Imagem fixa carregada com multi-resolução.')
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setNotice('Falha ao carregar a imagem fixa.')
      URL.revokeObjectURL(url)
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
      img.onload = async () => {
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        if (data.renderingMode) {
          setRenderingMode(data.renderingMode)
        }
        
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        
        // Regenerate resolution pyramid
        if (svgText) {
          const pyramid = await generateSvgPyramid(svgText, data.image.width, data.image.height, [1, 2, 4, 8])
          setResolutionPyramid(pyramid)
        } else {
          const pyramid = await generateRasterPyramid(img, [1, 2, 4])
          setResolutionPyramid(pyramid)
        }
        
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
      img.onload = async () => {
        setZoomSettings(data.zoom)
        setQuality(data.quality)
        if (data.renderingMode) {
          setRenderingMode(data.renderingMode)
        }
        
        const svgText = extractSvgTextFromDataUrl(data.image.dataUrl)
        setImageMeta({ name: data.image.name, type: data.image.type, svgText: svgText ?? undefined })
        
        // Regenerate resolution pyramid
        if (svgText) {
          const pyramid = await generateSvgPyramid(svgText, data.image.width, data.image.height, [1, 2, 4, 8])
          setResolutionPyramid(pyramid)
        } else {
          const pyramid = await generateRasterPyramid(img, [1, 2, 4])
          setResolutionPyramid(pyramid)
        }
        
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
      renderingMode,
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

  // Layer management callbacks
  const handleAddLayer = useCallback(() => {
    const name = prompt('Nome da nova camada:', `Camada ${layerManager.layers.length + 1}`)
    if (name) {
      layerManager.addLayer(name, 'drawing')
      setNotice(`Camada "${name}" criada.`)
    }
  }, [layerManager])

  const handleReorderLayer = useCallback((id: string, direction: 'up' | 'down') => {
    const layer = layerManager.layers.find(l => l.id === id)
    if (!layer) return

    const sortedLayers = [...layerManager.layers].sort((a, b) => a.zIndex - b.zIndex)
    const currentIndex = sortedLayers.findIndex(l => l.id === id)

    if (direction === 'up' && currentIndex > 0) {
      const newZIndex = sortedLayers[currentIndex - 1].zIndex
      layerManager.reorderLayer(id, newZIndex - 0.5)
    } else if (direction === 'down' && currentIndex < sortedLayers.length - 1) {
      const newZIndex = sortedLayers[currentIndex + 1].zIndex
      layerManager.reorderLayer(id, newZIndex + 0.5)
    }

    // Normalize z-indexes
    const normalized = [...layerManager.layers].sort((a, b) => a.zIndex - b.zIndex)
    normalized.forEach((layer, index) => {
      layerManager.updateLayer(layer.id, { zIndex: index + 1 })
    })
  }, [layerManager])

  return (
    <div className="app">
      <MenuBar />
      <div className="main">
        <div className="mapArea">
          <div ref={mapDivRef} className="map" />
        </div>

        <Sidebar
          // General
          mapLabel={mapLabel}
          notice={notice}
          zoomSettings={zoomSettings}
          quality={quality}
          renderingMode={renderingMode}
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
          onRenderingModeChange={setRenderingMode}

          // Layers
          layers={layerManager.layers}
          activeLayerId={layerManager.activeLayerId}
          onAddLayer={handleAddLayer}
          onRemoveLayer={layerManager.removeLayer}
          onToggleVisibility={(id) => {
            const layer = layerManager.layers.find(l => l.id === id)
            if (layer) layerManager.updateLayer(id, { visible: !layer.visible })
          }}
          onToggleLock={(id) => {
            const layer = layerManager.layers.find(l => l.id === id)
            if (layer) layerManager.updateLayer(id, { locked: !layer.locked })
          }}
          onSetActive={layerManager.setActiveLayer}
          onUpdateLayerOpacity={(id, opacity) => layerManager.updateLayer(id, { opacity })}
          onRenameLayer={(id, name) => layerManager.updateLayer(id, { name })}
          onReorderLayer={handleReorderLayer}

          // Fog
          fogState={layerManager.fogOfWar}
          onToggleFog={layerManager.toggleFog}
          onUpdateFogOpacity={(opacity) => layerManager.updateFog({ opacity })}
          onUpdateFogColor={(color) => layerManager.updateFog({ color })}
          onClearFog={layerManager.clearAllFog}
          isDrawingMode={fogDrawMode}
          onToggleDrawMode={() => setFogDrawMode(v => !v)}
        />
      </div>
    </div>
  )
}

export default App
