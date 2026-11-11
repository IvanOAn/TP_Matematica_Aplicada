import { Check, CircleAlert, ChevronDown, ChevronUp, Moon, Shield, Sun, Trash2, TreePine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileUploader, MAX_FILE_BYTES } from './components/FileUploader'
import { FileList } from './components/FileList'
import { IntegrityDashboard } from './components/IntegrityDashboard'
import { MathExplorer } from './components/MathExplorer'
import { MerkleTreeGraph } from './components/MerkleTreeGraph'
import { SimulationControls, type SimulationFrame } from './components/SimulationControls'
import { mutateByte } from './core/byteMutation'
import { hashLeaf, toHex } from './core/hash'
import { buildMerkleTree, compareTrees, updateTreeForLeaf } from './core/merkle'
import { formatBytes } from './utils/format'
import type { FileEntry, MerkleNode, MerkleTree } from './types/merkle'

let fileSequence = 0

function makeFileId(): string {
  fileSequence += 1
  return `archivo-${Date.now()}-${fileSequence}`
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('merkle-viz-theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [tree, setTree] = useState<MerkleTree | null>(null)
  const [currentTree, setCurrentTree] = useState<MerkleTree | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [byteIndex, setByteIndex] = useState('0')
  const [bitIndex, setBitIndex] = useState(0)
  const [frames, setFrames] = useState<SimulationFrame[]>([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [affectedPath, setAffectedPath] = useState<string[]>([])
  const [affectedIds, setAffectedIds] = useState<Set<string>>(new Set())
  const [proofIds, setProofIds] = useState<Set<string>>(new Set())
  const [filesExpanded, setFilesExpanded] = useState(true)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('merkle-viz-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    const timer = window.setTimeout(() => {
      if (frameIndex >= frames.length - 1) setPlaying(false)
      else setFrameIndex((index) => index + 1)
    }, 950)
    return () => window.clearTimeout(timer)
  }, [playing, frameIndex, frames.length])

  useEffect(() => {
    if (frames.length === 0) return
    const nodeId = frames[frameIndex]?.nodeId
    if (nodeId) setSelectedNodeId(nodeId)
    else if (frameIndex === 0 && affectedPath[0]) setSelectedNodeId(affectedPath[0])
  }, [frames, frameIndex, affectedPath])

  const resetSimulation = useCallback(() => {
    setCurrentTree(tree)
    setFrames([])
    setFrameIndex(0)
    setPlaying(false)
    setAffectedPath([])
    setAffectedIds(new Set())
    setMessage(null)
  }, [tree])

  const commitEntries = useCallback(async (next: FileEntry[]) => {
    setBusy(true)
    setMessage(null)
    setEntries(next)
    setSelectedId((current) => next.some((entry) => entry.id === current) ? current : next[0]?.id ?? null)
    setFrames([])
    setFrameIndex(0)
    setPlaying(false)
    setAffectedPath([])
    setAffectedIds(new Set())
    setProofIds(new Set())
    setByteIndex('0')
    try {
      if (next.length === 0) {
        setTree(null)
        setCurrentTree(null)
        setSelectedNodeId(null)
      } else {
        const built = await buildMerkleTree(next.map((entry) => entry.leafHash))
        setTree(built)
        setCurrentTree(built)
        setSelectedNodeId(null)
      }
    } catch {
      setTree(null)
      setCurrentTree(null)
      setMessage({ type: 'error', text: 'No se pudo construir el árbol. Revisá los archivos e intentá nuevamente.' })
    } finally {
      setBusy(false)
    }
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    if (busy) return
    setBusy(true)
    setMessage(null)
    const accepted: FileEntry[] = []
    const rejected: string[] = []
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`«${file.name}» supera el máximo de 100 MiB.`)
          continue
        }
        try {
          const data = new Uint8Array(await file.arrayBuffer())
          accepted.push({ id: makeFileId(), file, leafHash: await hashLeaf(data) })
        } catch {
          rejected.push(`No se pudo leer «${file.name}».`)
        }
      }
      const next = [...entries, ...accepted]
      setEntries(next)
      setSelectedId((current) => current ?? accepted[0]?.id ?? null)
      setFrames([])
      setFrameIndex(0)
      setPlaying(false)
      setAffectedPath([])
      setAffectedIds(new Set())
      setProofIds(new Set())
      setByteIndex('0')
      if (next.length > 0) {
        const built = await buildMerkleTree(next.map((entry) => entry.leafHash))
        setTree(built)
        setCurrentTree(built)
        setSelectedNodeId(null)
      }
      setMessage(rejected.length > 0
        ? { type: 'error', text: rejected.join(' ') }
        : { type: 'success', text: accepted.length === 1 ? 'Archivo agregado y verificado localmente.' : `${accepted.length} archivos agregados y procesados localmente.` })
    } catch {
      setMessage({ type: 'error', text: 'Falló el cálculo criptográfico. El navegador debe permitir Web Crypto API.' })
    } finally {
      setBusy(false)
    }
  }, [busy, entries])

  const handleRemove = useCallback((id: string) => {
    if (busy) return
    void commitEntries(entries.filter((entry) => entry.id !== id))
  }, [busy, commitEntries, entries])

  const handleClear = useCallback(() => {
    if (busy) return
    void commitEntries([])
  }, [busy, commitEntries])

  const startSimulation = useCallback(async () => {
    if (!tree || !selectedId || busy) return
    const entry = entries.find((item) => item.id === selectedId)
    const leafIndex = entries.findIndex((item) => item.id === selectedId)
    if (!entry || leafIndex < 0) return
    const parsedIndex = Number(byteIndex)
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= entry.file.size) {
      setMessage({ type: 'error', text: 'Ingresá una posición de byte válida dentro del archivo seleccionado.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const originalBytes = new Uint8Array(await entry.file.arrayBuffer())
      const changedByte = originalBytes[parsedIndex]!
      const mutatedBytes = mutateByte(originalBytes, parsedIndex, bitIndex)
      const alteredHash = await hashLeaf(mutatedBytes)
      const alteredTree = await updateTreeForLeaf(tree, leafIndex, alteredHash)
      const changed = compareTrees(tree, alteredTree)
      const path = tree.levels.map((level, levelIndex) => level[Math.floor(leafIndex / 2 ** levelIndex)]?.id).filter((id): id is string => Boolean(id) && changed.has(id))
      const nextFrames: SimulationFrame[] = [
        { label: 'Byte modificado', description: `En el byte ${parsedIndex}, el valor pasó de 0x${changedByte.toString(16).padStart(2, '0')} a 0x${mutatedBytes[parsedIndex]!.toString(16).padStart(2, '0')} al invertir el bit ${bitIndex}.` },
      ]
      path.forEach((id, index) => {
        const node = alteredTree.levels.flat().find((item) => item.id === id)!
        const name = node.kind === 'root' ? 'Merkle Root recalculada' : node.kind === 'leaf' ? 'Hash de hoja recalculado' : `Hash del nodo padre · nivel ${node.level}`
        nextFrames.push({ label: name, description: `El SHA-256 del nodo ${node.position} cambió. El hash resultante es ${toHex(node.hash)}.`, nodeId: id })
        if (index === 0 && node.kind === 'leaf') nextFrames[0] = { ...nextFrames[0]!, description: `${nextFrames[0]!.description} Ahora se calcula SHA-256(0x00 || bytes modificados).` }
      })
      nextFrames.push({
        label: toHex(tree.root.hash) === toHex(alteredTree.root.hash) ? 'Verificación completada' : 'Alteración detectada',
        description: toHex(tree.root.hash) === toHex(alteredTree.root.hash)
          ? 'Las raíces coinciden con la referencia inicial.'
          : `La raíz actual no coincide con la raíz original. Se afectaron ${changed.size} nodos del árbol.`,
      })
      setCurrentTree(alteredTree)
      setAffectedPath(path)
      setAffectedIds(changed)
      setFrames(nextFrames)
      setFrameIndex(0)
      setPlaying(false)
      setSelectedNodeId(tree.levels[0]![leafIndex]!.id)
    } catch {
      setMessage({ type: 'error', text: 'No se pudo completar la simulación. El archivo original permanece sin cambios.' })
    } finally {
      setBusy(false)
    }
  }, [tree, selectedId, busy, entries, byteIndex, bitIndex])

  const revealedIds = useMemo(() => new Set(affectedPath.slice(0, Math.min(affectedPath.length, frameIndex))), [affectedPath, frameIndex])
  const selectedLeafIndex = Math.max(0, entries.findIndex((entry) => entry.id === selectedId))
  const selectedNode = useMemo<MerkleNode | null>(() => {
    if (!selectedNodeId || !currentTree) return null
    return currentTree.levels.flat().find((node) => node.id === selectedNodeId) ?? null
  }, [selectedNodeId, currentTree])
  const names = useMemo(() => entries.map((entry) => entry.file.name), [entries])
  const setProofNodeIds = useCallback((ids: Set<string>) => setProofIds(ids), [])
  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><TreePine size={20} strokeWidth={2.2} /><span /></div>
          <div><span className="brand-name">Merkle<span>Viz</span></span><span className="brand-caption">LABORATORIO DE INTEGRIDAD</span></div>
        </div>
        <div className="topbar-right"><div className="algorithm-chip"><span className="algorithm-dot" /> Web Crypto <b>SHA-256</b></div><button className="theme-toggle" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span></button></div>
      </header>

      <main className="page-content">
        <section className="hero-row">
          <div><div className="hero-kicker"><span /> CRIPTOGRAFÍA VISUAL · SHA-256</div><h1>Verificación de integridad<br /><em>mediante árboles de Merkle</em></h1><p>Explorá cómo los hashes conectan archivos, forman una raíz única y revelan cualquier alteración.</p></div>
          <div className="hero-illustration" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-hub"><Shield size={27} /></div><i className="hero-node node-a" /><i className="hero-node node-b" /><i className="hero-node node-c" /><i className="hero-line line-a" /><i className="hero-line line-b" /><i className="hero-line line-c" /><i className="hero-line line-d" /></div>
        </section>

        {message && <div className={`notice notice-${message.type}`} role="status">{message.type === 'error' ? <CircleAlert size={17} /> : <Check size={17} />}<span>{message.text}</span><button className="notice-close" aria-label="Cerrar aviso" onClick={() => setMessage(null)}>×</button></div>}

        <div className="dashboard-stack">
          <div className="dashboard-top-grid">
            <section className="panel files-panel">
              <div className="panel-heading"><div><span className="eyebrow">CONJUNTO DE DATOS</span><h2>Archivos de entrada <span className="count-pill">{entries.length}</span></h2></div><div className="files-toolbar">{busy && <span className="processing-indicator"><span /> Procesando</span>}{entries.length > 0 && <button className="text-button" disabled={busy} onClick={handleClear}><Trash2 size={14} /> Limpiar</button>}<button className="icon-button collapse-button" aria-expanded={filesExpanded} aria-controls="files-panel-content" aria-label={filesExpanded ? 'Ocultar sección de archivos' : 'Mostrar sección de archivos'} title={filesExpanded ? 'Ocultar archivos' : 'Mostrar archivos'} onClick={() => setFilesExpanded((expanded) => !expanded)}>{filesExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button></div></div>
              {filesExpanded ? (
                <div id="files-panel-content" className="files-panel-content">
                  <FileUploader disabled={busy} onFiles={(files) => void handleFiles(files)} />
                  <FileList entries={entries} selectedId={selectedId} disabled={busy} onSelect={(id) => { setSelectedId(id); setByteIndex('0') }} onRemove={handleRemove} />
                  <div className="files-footer"><span>{entries.length === 0 ? 'El orden de carga define la posición de cada hoja.' : `${entries.length} ${entries.length === 1 ? 'archivo' : 'archivos'} · ${formatBytes(entries.reduce((sum, entry) => sum + entry.file.size, 0))} en total`}</span><span><Shield size={12} /> Máximo 100 MiB por archivo</span></div>
                </div>
              ) : (
                <div className="files-collapsed-summary">{entries.length === 0 ? 'Sección de carga oculta.' : `${entries.length} ${entries.length === 1 ? 'archivo cargado' : 'archivos cargados'} · ${formatBytes(entries.reduce((sum, entry) => sum + entry.file.size, 0))}`}</div>
              )}
            </section>

            <IntegrityDashboard tree={tree} currentTree={currentTree} changedCount={affectedIds.size} simulationReady={frames.length > 0} />
          </div>

          <MerkleTreeGraph tree={currentTree} originalTree={tree} selectedId={selectedNodeId} selectedNode={selectedNode} changedIds={affectedIds} proofIds={proofIds} revealedIds={revealedIds} fileNames={names} onSelect={setSelectedNodeId}>
            <SimulationControls
              entries={entries}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setByteIndex('0') }}
              byteIndex={byteIndex}
              onByteIndex={setByteIndex}
              bitIndex={bitIndex}
              onBitIndex={setBitIndex}
              frames={frames}
              frameIndex={frameIndex}
              playing={playing}
              disabled={busy}
              onStart={() => void startSimulation()}
              onPrevious={() => { setPlaying(false); setFrameIndex((value) => Math.max(0, value - 1)) }}
              onNext={() => { setPlaying(false); setFrameIndex((value) => Math.min(frames.length - 1, value + 1)) }}
              onPlay={() => { if (frameIndex >= frames.length - 1) setFrameIndex(0); setPlaying((value) => !value) }}
              onRestart={() => { setPlaying(false); setFrameIndex(0) }}
              onReset={resetSimulation}
            />
            {affectedPath.length > 0 && <div className="mutation-result"><span>SIMULACIÓN ACTIVA</span><strong>{revealedIds.size} / {affectedPath.length} nodos propagados</strong><code>Hoja #{selectedLeafIndex + 1} → raíz</code></div>}
          </MerkleTreeGraph>
        </div>

        <MathExplorer tree={tree} selectedLeafIndex={selectedLeafIndex} onProofNodes={setProofNodeIds} />
        <footer className="page-footer"><span><TreePine size={14} /> MerkleViz <i /> Matemática Aplicada</span><span>Los datos no salen de tu dispositivo</span></footer>
      </main>
    </div>
  )
}
