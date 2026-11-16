import { AlertCircle, ChevronLeft, ChevronRight, FileUp, Play, RefreshCw, RotateCcw, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { hashLeaf, toHex } from '../core/hash'
import { compareTrees, updateTreeForLeaf } from '../core/merkle'
import type { FileEntry, MerkleNode, MerkleTree } from '../types/merkle'
import { formatBytes } from '../utils/format'
import { MAX_FILE_BYTES } from './FileUploader'
import { IntegrityDashboard } from './IntegrityDashboard'
import { MerkleTreeGraph } from './MerkleTreeGraph'
import type { SimulationFrame } from './SimulationControls'

interface RealFileVerificationProps {
  entries: FileEntry[]
  tree: MerkleTree | null
  selectedId: string | null
  onSelect: (id: string) => void
  filePanel: ReactNode
}

export function RealFileVerification({ entries, tree, selectedId, onSelect, filePanel }: RealFileVerificationProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [replacement, setReplacement] = useState<File | null>(null)
  const [currentTree, setCurrentTree] = useState(tree)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set())
  const [affectedPath, setAffectedPath] = useState<string[]>([])
  const [frames, setFrames] = useState<SimulationFrame[]>([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [compared, setCompared] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentTree(tree)
  }, [tree])

  useEffect(() => {
    setReplacement(null)
    setCurrentTree(tree)
    setSelectedNodeId(null)
    setChangedIds(new Set())
    setAffectedPath([])
    setFrames([])
    setFrameIndex(0)
    setPlaying(false)
    setCompared(false)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [selectedId])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    const timer = window.setTimeout(() => {
      if (frameIndex >= frames.length - 1) setPlaying(false)
      else setFrameIndex((index) => index + 1)
    }, 950)
    return () => window.clearTimeout(timer)
  }, [playing, frameIndex, frames.length])

  useEffect(() => {
    const nodeId = frames[frameIndex]?.nodeId
    if (nodeId) setSelectedNodeId(nodeId)
  }, [frames, frameIndex])

  const clearResult = () => {
    setCurrentTree(tree)
    setSelectedNodeId(null)
    setChangedIds(new Set())
    setAffectedPath([])
    setFrames([])
    setFrameIndex(0)
    setPlaying(false)
    setCompared(false)
    setError(null)
  }

  const chooseReference = (id: string) => {
    onSelect(id)
  }

  const chooseReplacement = (file: File | null) => {
    setReplacement(file)
    clearResult()
    if (inputRef.current) inputRef.current.value = ''
  }

  const verify = async () => {
    if (!tree || !replacement || busy) return
    const leafIndex = entries.findIndex((entry) => entry.id === selectedId)
    if (leafIndex < 0) return
    if (replacement.size > MAX_FILE_BYTES) {
      setError('La nueva versión supera el máximo de 100 MiB por archivo.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const bytes = new Uint8Array(await replacement.arrayBuffer())
      const newLeafHash = await hashLeaf(bytes)
      const nextTree = await updateTreeForLeaf(tree, leafIndex, newLeafHash)
      const changed = compareTrees(tree, nextTree)
      const path = tree.levels
        .map((level, levelIndex) => level[Math.floor(leafIndex / 2 ** levelIndex)]?.id)
        .filter((id): id is string => Boolean(id) && changed.has(id))
      const nextFrames: SimulationFrame[] = [{
        label: 'Nueva versión leída',
        description: `Se leyó «${replacement.name}» (${formatBytes(replacement.size)}) y se comparó con la hoja ${leafIndex + 1}. El archivo de referencia no se modificó.`,
      }]
      path.forEach((id) => {
        const node = nextTree.levels.flat().find((item) => item.id === id)!
        nextFrames.push({
          label: node.kind === 'root' ? 'Raíz recalculada' : node.kind === 'leaf' ? 'Hash de hoja recalculado' : `Hash del nodo padre · nivel ${node.level}`,
          description: `El hash del nodo ${node.position} cambió a ${toHex(node.hash)}.`,
          nodeId: id,
        })
      })
      nextFrames.push({
        label: changed.size > 0 ? 'Alteración detectada' : 'Contenido íntegro',
        description: changed.size > 0
          ? `La raíz actual difiere de la referencia. Cambiaron ${changed.size} hashes en el camino de la hoja a la raíz.`
          : 'La nueva versión tiene el mismo contenido binario que el archivo de referencia. Las raíces coinciden.',
      })
      setCurrentTree(nextTree)
      setChangedIds(changed)
      setAffectedPath(path)
      setFrames(nextFrames)
      setFrameIndex(0)
      setPlaying(false)
      setCompared(true)
    } catch {
      setError('No se pudo leer o procesar la nueva versión. Elegí el archivo nuevamente e intentá otra vez.')
    } finally {
      setBusy(false)
    }
  }

  const revealedIds = useMemo(() => new Set(affectedPath.slice(0, Math.min(affectedPath.length, frameIndex))), [affectedPath, frameIndex])
  const selectedNode = useMemo<MerkleNode | null>(() => {
    if (!selectedNodeId || !currentTree) return null
    return currentTree.levels.flat().find((node) => node.id === selectedNodeId) ?? null
  }, [selectedNodeId, currentTree])
  const selected = entries.find((entry) => entry.id === selectedId)
  const activeFrame = frames[frameIndex]

  return (
    <section className="real-verification-section" aria-labelledby="real-verification-title">
      <div className="real-verification-heading">
        <span className="eyebrow">VERIFICACIÓN DE ARCHIVOS REALES</span>
        <h2 id="real-verification-title">Comparar una nueva versión</h2>
        <p>Modificá un archivo fuera de la aplicación, elegí esa versión y seguí cómo se propaga el cambio en un árbol independiente.</p>
      </div>
      <div className="dashboard-top-grid">
        {filePanel}
        <IntegrityDashboard tree={tree} currentTree={currentTree} changedCount={compared ? changedIds.size : 0} simulationReady={compared} hasComparison={compared} />
      </div>
      <MerkleTreeGraph
        title="Árbol de la verificación real"
        description="Este gráfico muestra solo la comparación de la nueva versión seleccionada."
        tree={currentTree}
        originalTree={tree}
        selectedId={selectedNodeId}
        selectedNode={selectedNode}
        changedIds={changedIds}
        revealedIds={revealedIds}
        fileNames={entries.map((entry) => entry.file.name)}
        onSelect={setSelectedNodeId}
      >
        <section className="panel lab-panel">
          <div className="panel-heading"><div><span className="eyebrow">LABORATORIO · ARCHIVO REAL</span><h2>Verificar nueva versión</h2></div><div className="panel-heading-icon"><FileUp size={18} /></div></div>
          <p className="panel-intro">Elegí qué hoja representa al archivo original y seleccioná su versión modificada. Se comparan los bytes, aunque el nombre del archivo sea diferente.</p>
          <div className="real-verification-fields">
            <label className="field-label">Archivo de referencia
              <select value={selectedId ?? ''} onChange={(event) => chooseReference(event.target.value)} disabled={busy || entries.length === 0}>
                {entries.length === 0 && <option value="">Cargá archivos primero</option>}
                {entries.map((entry, index) => <option value={entry.id} key={entry.id}>Hoja {index + 1} · {entry.file.name}</option>)}
              </select>
            </label>
            <label className="field-label">Nueva versión del archivo
              <input ref={inputRef} type="file" disabled={!selected || busy} onChange={(event) => chooseReplacement(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          {selected && <p className="real-reference-note">Referencia: «{selected.file.name}» · {formatBytes(selected.file.size)} · hoja {entries.findIndex((entry) => entry.id === selectedId) + 1}</p>}
          {replacement && <p className="real-reference-note">Nueva versión: «{replacement.name}» · {formatBytes(replacement.size)}</p>}
          {error && <div className="inline-note warning-note" role="alert"><AlertCircle size={15} /> {error}</div>}
          {activeFrame && <div className="simulation-progress"><div className="progress-top"><span>PASO {frameIndex + 1} DE {frames.length}</span><span>{Math.round(((frameIndex + 1) / frames.length) * 100)}%</span></div><div className="progress-track"><span style={{ width: `${((frameIndex + 1) / frames.length) * 100}%` }} /></div><strong>{activeFrame.label}</strong><p>{activeFrame.description}</p></div>}
          <div className="lab-actions">
            <button className="button button-primary" disabled={!selected || !replacement || busy} onClick={() => void verify()}><FileUp size={15} /> {busy ? 'Procesando…' : 'Verificar archivo'}</button>
            <div className="step-actions">
              <button className="icon-button" title="Paso anterior" aria-label="Paso anterior" disabled={frameIndex <= 0 || busy} onClick={() => { setPlaying(false); setFrameIndex((value) => value - 1) }}><ChevronLeft size={17} /></button>
              <button className="button button-secondary button-compact" disabled={frames.length === 0 || busy} onClick={() => { if (frameIndex >= frames.length - 1) setFrameIndex(0); setPlaying((value) => !value) }}>{playing ? <Square size={14} /> : <Play size={14} />} {playing ? 'Pausar' : 'Reproducir'}</button>
              <button className="icon-button" title="Siguiente paso" aria-label="Siguiente paso" disabled={frameIndex >= frames.length - 1 || busy} onClick={() => { setPlaying(false); setFrameIndex((value) => value + 1) }}><ChevronRight size={17} /></button>
              <button className="icon-button" title="Reiniciar pasos" aria-label="Reiniciar pasos" disabled={frames.length === 0 || busy} onClick={() => { setPlaying(false); setFrameIndex(0) }}><RotateCcw size={15} /></button>
              <button className="icon-button" title="Restaurar referencia" aria-label="Restaurar referencia" disabled={busy} onClick={() => { setReplacement(null); if (inputRef.current) inputRef.current.value = ''; clearResult() }}><RefreshCw size={15} /></button>
            </div>
          </div>
          <div className="lab-disclaimer">La aplicación no modifica archivos. Para volver a verificar un cambio posterior, seleccioná el archivo otra vez. La raíz inicial del conjunto es la referencia durante esta sesión.</div>
        </section>
        {compared && <div className={`mutation-result ${changedIds.size === 0 ? 'real-result-ok' : ''}`}><span>{changedIds.size === 0 ? 'VERIFICACIÓN EXITOSA' : 'ALTERACIÓN DETECTADA'}</span><strong>{changedIds.size === 0 ? 'El contenido coincide con la referencia.' : `${revealedIds.size} / ${affectedPath.length} nodos propagados`}</strong><code>Hoja {entries.findIndex((entry) => entry.id === selectedId) + 1} → raíz</code></div>}
      </MerkleTreeGraph>
    </section>
  )
}
