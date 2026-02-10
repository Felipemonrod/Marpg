import type { FogOfWarState } from '../types/layers'
import './FogPanel.css'

interface FogPanelProps {
  fogState: FogOfWarState
  onToggleFog: () => void
  onUpdateOpacity: (opacity: number) => void
  onUpdateColor: (color: string) => void
  onClearAll: () => void
  isDrawingMode: boolean
  onToggleDrawMode: () => void
}

const FogPanel = ({
  fogState,
  onToggleFog,
  onUpdateOpacity,
  onUpdateColor,
  onClearAll,
  isDrawingMode,
  onToggleDrawMode,
}: FogPanelProps) => {
  return (
    <div className="fogPanel">
      <div className="fogPanelHeader">
        <h3>Névoa de Guerra</h3>
        <button
          className={`btn btnSmall ${fogState.enabled ? 'btnActive' : ''}`}
          onClick={onToggleFog}
        >
          {fogState.enabled ? '✓ Ativada' : 'Desativada'}
        </button>
      </div>

      {fogState.enabled && (
        <>
          <div className="fogControls">
            <div className="fogControl">
              <label>Opacidade da névoa:</label>
              <div className="fogControlRow">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fogState.opacity * 100}
                  onChange={(e) => onUpdateOpacity(Number(e.target.value) / 100)}
                />
                <span>{Math.round(fogState.opacity * 100)}%</span>
              </div>
            </div>

            <div className="fogControl">
              <label>Cor da névoa:</label>
              <div className="fogControlRow">
                <input
                  type="color"
                  value={fogState.color}
                  onChange={(e) => onUpdateColor(e.target.value)}
                />
                <span>{fogState.color}</span>
              </div>
            </div>

            <div className="fogControl">
              <label>Áreas reveladas: {fogState.revealedAreas.length}</label>
            </div>
          </div>

          <div className="fogActions">
            <button
              className={`btn ${isDrawingMode ? 'btnActive' : ''}`}
              onClick={onToggleDrawMode}
            >
              {isDrawingMode ? '✓ Modo Revelar' : '🖊️ Revelar Áreas'}
            </button>
            
            <button
              className="btn btnDanger"
              onClick={() => {
                if (confirm('Redefinir toda a névoa? As áreas reveladas serão perdidas.')) {
                  onClearAll()
                }
              }}
              disabled={fogState.revealedAreas.length === 0}
            >
              🔄 Resetar Névoa
            </button>
          </div>

          <div className="fogHelp">
            <small>
              💡 <strong>Como usar:</strong>
              <br />
              1. Ative o "Modo Revelar"
              <br />
              2. Use as ferramentas de desenho para revelar áreas
              <br />
              3. Círculos, retângulos e polígonos criam áreas visíveis
            </small>
          </div>
        </>
      )}

      {!fogState.enabled && (
        <div className="fogDisabled">
          <p>A névoa está desativada.</p>
          <small>Ative para ocultar o mapa e revelar áreas progressivamente.</small>
        </div>
      )}
    </div>
  )
}

export default FogPanel
