import { useState } from 'react'
import type { Quality, ZoomSettings, RenderingMode } from '../types'
import type { MapLayer, FogOfWarState } from '../types/layers'
import LayerPanel from './LayerPanel'
import FogPanel from './FogPanel'
import './Sidebar.css'

type SidebarProps = {
  // Existing Sidebar Props
  mapLabel: string
  notice: string
  zoomSettings: ZoomSettings
  quality: Quality
  renderingMode: RenderingMode
  onImageFile: (file: File | null) => void
  onFixedImageFile: (file: File | null) => void
  onProjectFile: (file: File | null) => void
  onClearImage: () => void
  onExportFixed: () => void
  onExportProject: () => void
  onExportAutomatic: () => void
  onSaveFixedLocal: () => void
  onSaveProjectLocal: () => void
  onLoadProjectLocal: () => void
  onLoadFixedLocal: () => void
  onZoomChange: (next: ZoomSettings) => void
  onQualityChange: (next: Quality) => void
  onRenderingModeChange: (next: RenderingMode) => void
  
  // Layer Props
  layers: MapLayer[]
  activeLayerId: string | null
  onAddLayer: () => void
  onRemoveLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onSetActive: (id: string) => void
  onUpdateLayerOpacity: (id: string, opacity: number) => void
  onRenameLayer: (id: string, name: string) => void
  onReorderLayer: (id: string, direction: 'up' | 'down') => void

  // Fog Props
  fogState: FogOfWarState
  onToggleFog: () => void
  onUpdateFogOpacity: (opacity: number) => void
  onUpdateFogColor: (color: string) => void
  onClearFog: () => void
  isDrawingMode: boolean
  onToggleDrawMode: () => void
}

type Tab = 'files' | 'layers' | 'fog' | 'settings'

const Sidebar = ({
  mapLabel,
  notice,
  zoomSettings,
  quality,
  renderingMode,
  onImageFile,
  onFixedImageFile,
  onProjectFile,
  onClearImage,
  onExportFixed,
  onExportProject,
  onExportAutomatic,
  onSaveFixedLocal,
  onSaveProjectLocal,
  onLoadProjectLocal,
  onLoadFixedLocal,
  onZoomChange,
  onQualityChange,
  onRenderingModeChange,
  
  // Layers
  layers,
  activeLayerId,
  onAddLayer,
  onRemoveLayer,
  onToggleVisibility,
  onToggleLock,
  onSetActive,
  onUpdateLayerOpacity,
  onRenameLayer,
  onReorderLayer,

  // Fog
  fogState,
  onToggleFog,
  onUpdateFogOpacity,
  onUpdateFogColor,
  onClearFog,
  isDrawingMode,
  onToggleDrawMode,
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('files')
  const [isOpen, setIsOpen] = useState(true)

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      <button 
        className={`sidebar-toggle-btn ${isOpen ? 'open' : 'closed'}`}
        title={isOpen ? 'Fechar menu' : 'Abrir menu'}
        onClick={toggleSidebar}
      >
        {isOpen ? '▶' : '◀'}
      </button>

      <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
        <div className="sidebar-tabs">
          <button 
            className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            title="Arquivos e Projeto"
          >
            📂
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
            title="Camadas"
          >
            📚
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'fog' ? 'active' : ''}`}
            onClick={() => setActiveTab('fog')}
            title="Névoa de Guerra"
          >
            🌫️
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Ajustes e Configurações"
          >
            ⚙️
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'files' && (
            <>
              <div className="project-info">
                <div className="project-name">RPG Map Studio</div>
                <div className="project-details">{mapLabel}</div>
                {notice && <div style={{ fontSize: '11px', color: '#fbcb69', marginTop: '6px' }}>{notice}</div>}
              </div>

              <div className="panel-section">
                <div className="panel-title">📁 Arquivos</div>
                
                <div className="sidebar-input-group">
                  <label className="sidebar-label">Imagem Base</label>
                  <label className="sidebar-btn sidebar-file-upload">
                    <span>🖼️ Carregar Imagem</span>
                    <input
                      type="file"
                      accept="image/*,.webp"
                      onChange={(e) => onImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div className="sidebar-input-group">
                  <label className="sidebar-label">Importar</label>
                  <label className="sidebar-btn sidebar-file-upload">
                    <span>📷 Imagem Fixa </span>
                     <input
                      type="file"
                      accept="image/*,.webp"
                      onChange={(e) => onFixedImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                   <label className="sidebar-btn sidebar-file-upload">
                    <span>📄 Projeto JSON</span>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => onProjectFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <button className="sidebar-btn" onClick={onClearImage}>
                   🗑️ Remover Imagem
                </button>
              </div>

              <div className="panel-section">
                <div className="panel-title">💾 Armazenamento Local</div>
                <button className="sidebar-btn primary" onClick={onSaveProjectLocal}>
                  Salvar Projeto (Browser)
                </button>
                 <button className="sidebar-btn" onClick={onSaveFixedLocal}>
                  Salvar Imagem Fixa (Browser)
                </button>
                <button className="sidebar-btn" onClick={onLoadProjectLocal}>
                  Carregar do Browser
                </button>
              </div>

              <div className="panel-section">
                <div className="panel-title">📤 Exportação</div>
                <button className="sidebar-btn" onClick={onExportAutomatic}>
                  ✨ Exportar Automático
                </button>
                <button className="sidebar-btn" onClick={onExportProject}>
                  📄 Exportar JSON
                </button>
                <button className="sidebar-btn" onClick={onExportFixed}>
                  🖼️ Exportar PNG
                </button>
              </div>
            </>
          )}

          {activeTab === 'layers' && (
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onAddLayer={onAddLayer}
              onRemoveLayer={onRemoveLayer}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onSetActive={onSetActive}
              onUpdateOpacity={onUpdateLayerOpacity}
              onRenameLayer={onRenameLayer}
              onReorderLayer={onReorderLayer}
            />
          )}

          {activeTab === 'fog' && (
            <FogPanel
              fogState={fogState}
              onToggleFog={onToggleFog}
              onUpdateOpacity={onUpdateFogOpacity}
              onUpdateColor={onUpdateFogColor}
              onClearAll={onClearFog}
              isDrawingMode={isDrawingMode}
              onToggleDrawMode={onToggleDrawMode}
            />
          )}

          {activeTab === 'settings' && (
            <>
              <div className="panel-section">
                <div className="panel-title">👁️ Visualização</div>
                
                <div className="sidebar-input-group">
                  <label className="sidebar-label">Zoom Mínimo: {zoomSettings.minZoom}</label>
                  <input
                    type="range"
                    min="-20"
                    max="-1"
                    value={zoomSettings.minZoom}
                    onChange={(e) => onZoomChange({ ...zoomSettings, minZoom: Number(e.target.value) })}
                  />
                </div>

                <div className="sidebar-input-group">
                  <label className="sidebar-label">Zoom Máximo: {zoomSettings.maxZoom}</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={zoomSettings.maxZoom}
                    onChange={(e) => onZoomChange({ ...zoomSettings, maxZoom: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-title">⚡ Performance</div>
                
                <div className="sidebar-input-group">
                  <label className="sidebar-label">Qualidade de Renderização</label>
                  <select 
                    className="sidebar-btn"
                    value={quality}
                    onChange={(e) => onQualityChange(e.target.value as Quality)}
                  >
                    <option value="low">Baixa (Mais rápido)</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta (Melhor qualidade)</option>
                    <option value="ultra">Ultra (Muito pesado)</option>
                  </select>
                </div>

                <div className="sidebar-input-group">
                  <label className="sidebar-label">Modo de Renderização</label>
                  <select 
                    className="sidebar-btn"
                    value={renderingMode}
                    onChange={(e) => onRenderingModeChange(e.target.value as RenderingMode)}
                  >
                    <option value="auto">Automático</option>
                    <option value="vector">Vetorial (SVG)</option>
                    <option value="raster">Raster (Multi-Res)</option>
                    <option value="crisp-edges">Pixel Art (Crisp)</option>
                    <option value="smooth">Suave (Smooth)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
