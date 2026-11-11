import { Activity, AlertCircle, ChevronLeft, ChevronRight, Play, RefreshCw, RotateCcw, Square } from 'lucide-react'
import type { FileEntry } from '../types/merkle'
import { formatBytes } from '../utils/format'

export interface SimulationFrame {
  label: string
  description: string
  nodeId?: string
}

interface SimulationControlsProps {
  entries: FileEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
  byteIndex: string
  onByteIndex: (value: string) => void
  bitIndex: number
  onBitIndex: (value: number) => void
  frames: SimulationFrame[]
  frameIndex: number
  playing: boolean
  disabled?: boolean
  onStart: () => void
  onPrevious: () => void
  onNext: () => void
  onPlay: () => void
  onRestart: () => void
  onReset: () => void
}

export function SimulationControls(props: SimulationControlsProps) {
  const selected = props.entries.find((entry) => entry.id === props.selectedId)
  const empty = Boolean(selected && selected.file.size === 0)
  const maxByte = selected ? Math.max(selected.file.size - 1, 0) : 0
  const activeFrame = props.frames[props.frameIndex]
  return (
    <section className="panel lab-panel">
      <div className="panel-heading"><div><span className="eyebrow">LABORATORIO DE INTEGRIDAD</span><h2>Simular una alteración</h2></div><div className="panel-heading-icon lab-icon"><Activity size={18} /></div></div>
      <p className="panel-intro">Cambiá un bit en una copia y avanzá los pasos para seguir arriba cómo cambia cada nodo del gráfico.</p>
      <div className="lab-fields">
        <label className="field-label">Archivo
          <select value={props.selectedId ?? ''} onChange={(event) => props.onSelect(event.target.value)} disabled={props.disabled || props.entries.length === 0}>
            {props.entries.length === 0 && <option value="">Cargá archivos primero</option>}
            {props.entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.file.name} · {formatBytes(entry.file.size)}</option>)}
          </select>
        </label>
        <label className="field-label">Posición del byte
          <input type="number" min={0} max={maxByte} value={props.byteIndex} onChange={(event) => props.onByteIndex(event.target.value)} disabled={!selected || props.disabled || empty} placeholder="0" />
        </label>
        <label className="field-label">Bit a invertir
          <select value={props.bitIndex} onChange={(event) => props.onBitIndex(Number(event.target.value))} disabled={!selected || props.disabled || empty}>
            {Array.from({ length: 8 }, (_, index) => <option value={index} key={index}>Bit {index}</option>)}
          </select>
        </label>
      </div>
      {empty && <div className="inline-note warning-note"><AlertCircle size={15} /> Este archivo está vacío: no contiene una posición de byte modificable. Elegí otro archivo.</div>}
      {activeFrame && (
        <div className="simulation-progress">
          <div className="progress-top"><span>PASO {props.frameIndex + 1} DE {props.frames.length}</span><span>{Math.round(((props.frameIndex + 1) / props.frames.length) * 100)}%</span></div>
          <div className="progress-track"><span style={{ width: `${((props.frameIndex + 1) / props.frames.length) * 100}%` }} /></div>
          <strong>{activeFrame.label}</strong><p>{activeFrame.description}</p>
        </div>
      )}
      <div className="lab-actions">
        <button className="button button-primary" disabled={!selected || empty || props.disabled} onClick={props.onStart}><Play size={15} /> Iniciar simulación</button>
        <div className="step-actions">
          <button className="icon-button" title="Paso anterior" aria-label="Paso anterior" disabled={props.frameIndex <= 0} onClick={props.onPrevious}><ChevronLeft size={17} /></button>
          <button className="button button-secondary button-compact" title={props.playing ? 'Pausar' : 'Reproducir'} disabled={props.frames.length === 0} onClick={props.onPlay}>{props.playing ? <Square size={14} /> : <Play size={14} />} {props.playing ? 'Pausar' : 'Reproducir'}</button>
          <button className="icon-button" title="Siguiente paso" aria-label="Siguiente paso" disabled={props.frameIndex >= props.frames.length - 1} onClick={props.onNext}><ChevronRight size={17} /></button>
          <button className="icon-button" title="Reiniciar simulación" aria-label="Reiniciar simulación" onClick={props.onRestart} disabled={props.frames.length === 0}><RotateCcw size={15} /></button>
          <button className="icon-button" title="Restaurar estado original" aria-label="Restaurar estado original" onClick={props.onReset} disabled={props.disabled}><RefreshCw size={15} /></button>
        </div>
      </div>
      <div className="lab-disclaimer">La modificación se realiza sobre una copia temporal. El archivo seleccionado permanece intacto.</div>
    </section>
  )
}
