import { useState, useCallback } from 'react'
import type { MapLayer, LayerItem, LayerManagerState, FogOfWarState } from '../types/layers'

interface UseLayerManagerReturn {
  layers: MapLayer[]
  activeLayerId: string | null
  fogOfWar: FogOfWarState
  addLayer: (name: string, type?: MapLayer['type']) => MapLayer
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<MapLayer>) => void
  setActiveLayer: (id: string | null) => void
  reorderLayer: (id: string, newZIndex: number) => void
  addItemToLayer: (layerId: string, item: Omit<LayerItem, 'layerId'>) => void
  removeItemFromLayer: (layerId: string, itemId: string) => void
  updateItemInLayer: (layerId: string, itemId: string, updates: Partial<LayerItem>) => void
  toggleFog: () => void
  updateFog: (updates: Partial<FogOfWarState>) => void
  revealFogArea: (area: FogOfWarState['revealedAreas'][0]) => void
  hideFogArea: (areaId: string) => void
  clearAllFog: () => void
  getState: () => LayerManagerState
  setState: (state: LayerManagerState) => void
}

const DEFAULT_FOG: FogOfWarState = {
  enabled: false,
  opacity: 0.85,
  color: '#000000',
  revealedAreas: [],
}

export function useLayerManager(): UseLayerManagerReturn {
  const [layers, setLayers] = useState<MapLayer[]>([
    {
      id: 'default',
      name: 'Camada principal',
      visible: true,
      opacity: 1,
      zIndex: 1,
      locked: false,
      type: 'drawing',
      items: [],
    },
  ])
  
  const [activeLayerId, setActiveLayerId] = useState<string | null>('default')
  const [fogOfWar, setFogOfWar] = useState<FogOfWarState>(DEFAULT_FOG)

  const addLayer = useCallback((name: string, type: MapLayer['type'] = 'drawing'): MapLayer => {
    const newLayer: MapLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      visible: true,
      opacity: 1,
      zIndex: layers.length + 1,
      locked: false,
      type,
      items: [],
    }
    setLayers(prev => [...prev, newLayer])
    return newLayer
  }, [layers.length])

  const removeLayer = useCallback((id: string) => {
    if (id === 'default') return // Cannot remove default layer
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeLayerId === id) {
      setActiveLayerId('default')
    }
  }, [activeLayerId])

  const updateLayer = useCallback((id: string, updates: Partial<MapLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ))
  }, [])

  const setActiveLayer = useCallback((id: string | null) => {
    setActiveLayerId(id)
  }, [])

  const reorderLayer = useCallback((id: string, newZIndex: number) => {
    setLayers(prev => {
      const updated = prev.map(layer => {
        if (layer.id === id) {
          return { ...layer, zIndex: newZIndex }
        }
        return layer
      })
      // Sort by zIndex
      return updated.sort((a, b) => a.zIndex - b.zIndex)
    })
  }, [])

  const addItemToLayer = useCallback((layerId: string, item: Omit<LayerItem, 'layerId'>) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          items: [...layer.items, { ...item, layerId }],
        }
      }
      return layer
    }))
  }, [])

  const removeItemFromLayer = useCallback((layerId: string, itemId: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          items: layer.items.filter(item => item.id !== itemId),
        }
      }
      return layer
    }))
  }, [])

  const updateItemInLayer = useCallback((layerId: string, itemId: string, updates: Partial<LayerItem>) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          items: layer.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
      }
      return layer
    }))
  }, [])

  const toggleFog = useCallback(() => {
    setFogOfWar(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const updateFog = useCallback((updates: Partial<FogOfWarState>) => {
    setFogOfWar(prev => ({ ...prev, ...updates }))
  }, [])

  const revealFogArea = useCallback((area: FogOfWarState['revealedAreas'][0]) => {
    setFogOfWar(prev => ({
      ...prev,
      revealedAreas: [...prev.revealedAreas, area],
    }))
  }, [])

  const hideFogArea = useCallback((areaId: string) => {
    setFogOfWar(prev => ({
      ...prev,
      revealedAreas: prev.revealedAreas.filter(a => a.id !== areaId),
    }))
  }, [])

  const clearAllFog = useCallback(() => {
    setFogOfWar(prev => ({ ...prev, revealedAreas: [] }))
  }, [])

  const getState = useCallback((): LayerManagerState => ({
    layers,
    activeLayerId,
    fogOfWar,
  }), [layers, activeLayerId, fogOfWar])

  const setState = useCallback((state: LayerManagerState) => {
    setLayers(state.layers)
    setActiveLayerId(state.activeLayerId)
    setFogOfWar(state.fogOfWar)
  }, [])

  return {
    layers,
    activeLayerId,
    fogOfWar,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayer,
    addItemToLayer,
    removeItemFromLayer,
    updateItemInLayer,
    toggleFog,
    updateFog,
    revealFogArea,
    hideFogArea,
    clearAllFog,
    getState,
    setState,
  }
}
