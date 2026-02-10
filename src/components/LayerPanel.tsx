import { useState } from 'react'
import type { MapLayer } from '../types/layers'
import './LayerPanel.css'

interface LayerPanelProps {
  layers: MapLayer[]
  activeLayerId: string | null
  onAddLayer: () => void
  onRemoveLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onSetActive: (id: string) => void
  onUpdateOpacity: (id: string, opacity: number) => void
  onRenameLayer: (id: string, name: string) => void
  onReorderLayer: (id: string, direction: 'up' | 'down') => void
}

const LayerPanel = ({
  layers,
  activeLayerId,
  onAddLayer,
  onRemoveLayer,
  onToggleVisibility,
  onToggleLock,
  onSetActive,
  onUpdateOpacity,
  onRenameLayer,
  onReorderLayer,
}: LayerPanelProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartEdit = (layer: MapLayer) => {
    setEditingId(layer.id)
    setEditName(layer.name)
  }

  const handleFinishEdit = (id: string) => {
    if (editName.trim()) {
      onRenameLayer(id, editName.trim())
    }
    setEditingId(null)
  }

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="layerPanel">
      <div className="layerPanelHeader">
        <h3>Camadas</h3>
        <button 
          className="btn btnSmall" 
          onClick={onAddLayer}
          title="Adicionar nova camada"
        >
          + Nova
        </button>
      </div>

      <div className="layerList">
        {sortedLayers.map((layer, index) => (
          <div
            key={layer.id}
            className={`layerItem ${activeLayerId === layer.id ? 'active' : ''}`}
            onClick={() => onSetActive(layer.id)}
          >
            <div className="layerControls">
              <button
                className="layerBtn"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisibility(layer.id)
                }}
                title={layer.visible ? 'Ocultar camada' : 'Mostrar camada'}
              >
                {layer.visible ? '👁️' : '👁️‍🗨️'}
              </button>
              
              <button
                className="layerBtn"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLock(layer.id)
                }}
                title={layer.locked ? 'Desbloquear camada' : 'Bloquear camada'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </div>

            <div className="layerInfo">
              {editingId === layer.id ? (
                <input
                  className="layerNameInput"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleFinishEdit(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEdit(layer.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <div
                  className="layerName"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit(layer)
                  }}
                >
                  {layer.name}
                  <span className="layerType">{layer.type}</span>
                </div>
              )}

              <div className="layerOpacity">
                <label>Opacidade:</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.opacity * 100}
                  onChange={(e) => {
                    e.stopPropagation()
                    onUpdateOpacity(layer.id, Number(e.target.value) / 100)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{Math.round(layer.opacity * 100)}%</span>
              </div>
            </div>

            <div className="layerActions">
              <button
                className="layerBtn"
                onClick={(e) => {
                  e.stopPropagation()
                  onReorderLayer(layer.id, 'up')
                }}
                disabled={index === 0}
                title="Mover para cima"
              >
                ▲
              </button>
              <button
                className="layerBtn"
                onClick={(e) => {
                  e.stopPropagation()
                  onReorderLayer(layer.id, 'down')
                }}
                disabled={index === sortedLayers.length - 1}
                title="Mover para baixo"
              >
                ▼
              </button>
              {layer.id !== 'default' && (
                <button
                  className="layerBtn layerBtnDelete"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Remover camada "${layer.name}"?`)) {
                      onRemoveLayer(layer.id)
                    }
                  }}
                  title="Remover camada"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="layerInfo">
        <small>
          💡 Clique duplo no nome para renomear
          <br />
          Total: {layers.length} camada{layers.length !== 1 ? 's' : ''}
        </small>
      </div>
    </div>
  )
}

export default LayerPanel
