import type { Quality, ZoomSettings } from '../types'

type SidebarProps = {
  mapLabel: string
  notice: string
  zoomSettings: ZoomSettings
  quality: Quality
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
}

const Sidebar = ({
  mapLabel,
  notice,
  zoomSettings,
  quality,
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
}: SidebarProps) => {
  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <div className="title">Tile System</div>
        <div className="hint">{mapLabel}</div>
      </div>

      <div className="section">
        <div className="sectionTitle">Arquivos</div>
        <label className="fileLabel">
          Carregar imagem base
          <input
            className="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => onImageFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="fileLabel">
          Carregar imagem fixa (arquivo)
          <input
            className="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => onFixedImageFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="fileLabel">
          Carregar projeto (arquivo)
          <input
            className="fileInput"
            type="file"
            accept="application/json"
            onChange={(e) => onProjectFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className="btn" type="button" onClick={onClearImage}>
          Remover imagem atual
        </button>
      </div>

      <div className="section">
        <div className="sectionTitle">Exportação</div>
        <button className="btn" type="button" onClick={onExportFixed}>
          Exportar imagem fixa
        </button>
        <button className="btn" type="button" onClick={onExportProject}>
          Exportar projeto
        </button>
        <button className="btn" type="button" onClick={onExportAutomatic}>
          Exportar automático
        </button>
      </div>

      <div className="section">
        <div className="sectionTitle">Armazenamento local</div>
        <button className="btn" type="button" onClick={onSaveFixedLocal}>
          Salvar imagem fixa
        </button>
        <button className="btn" type="button" onClick={onSaveProjectLocal}>
          Salvar projeto
        </button>
        <button className="btn" type="button" onClick={onLoadProjectLocal}>
          Carregar projeto
        </button>
        <button className="btn" type="button" onClick={onLoadFixedLocal}>
          Carregar imagem fixa
        </button>
      </div>

      <div className="section">
        <div className="sectionTitle">Zoom e qualidade</div>
        <div className="controlGroup">
          <label className="controlLabel">Min zoom</label>
          <input
            className="controlInput"
            type="number"
            step={1}
            value={zoomSettings.minZoom}
            onChange={(e) => {
              const value = Number(e.target.value)
              onZoomChange({ minZoom: Math.min(value, zoomSettings.maxZoom), maxZoom: zoomSettings.maxZoom })
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
              onZoomChange({ minZoom: zoomSettings.minZoom, maxZoom: Math.max(value, zoomSettings.minZoom) })
            }}
          />
        </div>
        <div className="controlGroup">
          <label className="controlLabel">Qualidade</label>
          <select
            className="controlSelect"
            value={quality}
            onChange={(e) => onQualityChange(e.target.value as Quality)}
          >
            <option value="low">Baixa (mais leve)</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="ultra">Ultra (mais pesada)</option>
          </select>
        </div>
      </div>

      <div className="note">Lembrete: qualidade mais alta gera tiles mais pesados.</div>
      {notice ? <div className="status">{notice}</div> : null}
    </aside>
  )
}

export default Sidebar
