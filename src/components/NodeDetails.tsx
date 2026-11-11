import { ArrowDownLeft, ArrowDownRight, BookOpenText, Fingerprint, X } from 'lucide-react'
import { toHex } from '../core/hash'
import type { MerkleNode, MerkleTree } from '../types/merkle'

interface NodeDetailsProps {
  node: MerkleNode | null
  originalTree: MerkleTree | null
  currentTree: MerkleTree | null
  fileNames: string[]
  onClearSelection: () => void
}

export function NodeDetails({ node, originalTree, currentTree, fileNames, onClearSelection }: NodeDetailsProps) {
  if (!node) return <section className="panel detail-panel detail-empty"><div className="detail-icon"><BookOpenText size={19} /></div><div><h3>Detalle del cálculo</h3><p>Seleccioná un nodo del grafo para ver su operación y hashes asociados.</p></div></section>

  const currentNode = currentTree?.levels[node.level]?.[node.position] ?? node
  const originalNode = originalTree?.levels[node.level]?.[node.position] ?? node
  const isChanged = toHex(currentNode.hash) !== toHex(originalNode.hash)
  const children = node.childIds.map((id) => {
    const [, levelPart, positionPart] = id.match(/nivel-(\d+)-pos-(\d+)/) ?? []
    const childLevel = Number(levelPart)
    const childPosition = Number(positionPart)
    return currentTree?.levels[childLevel]?.[childPosition]
  }).filter((child): child is MerkleNode => Boolean(child))

  const operation = node.kind === 'leaf' || (node.kind === 'root' && node.childIds.length === 0)
    ? 'H_hoja = SHA-256(0x00 || bytes del archivo)'
    : 'H_padre = SHA-256(0x01 || H_izquierdo || H_derecho)'

  return (
    <section className="panel detail-panel">
      <div className="detail-heading"><div className="detail-icon"><Fingerprint size={19} /></div><div><span className="eyebrow">NODO SELECCIONADO</span><h3>{node.kind === 'root' ? 'Raíz de Merkle' : node.kind === 'leaf' ? 'Hoja' : 'Nodo intermedio'} · #{node.position}</h3></div><span className={`node-state-label ${isChanged ? 'label-danger' : ''}`}>{isChanged ? 'ALTERADO' : 'ÍNTEGRO'}</span><button className="icon-button detail-clear" aria-label="Deseleccionar nodo" title="Deseleccionar nodo" onClick={onClearSelection}><X size={15} /></button></div>
      <div className="detail-meta"><span>Nivel <strong>{node.level}</strong></span><span>Posición <strong>{node.position}</strong></span>{node.kind === 'leaf' && <span>Archivo <strong>{fileNames[node.leafIndex ?? -1] ?? '—'}</strong></span>}</div>
      <div className="detail-hash-block"><span>Hash actual</span><code>{toHex(currentNode.hash)}</code></div>
      {isChanged && <div className="detail-hash-block old-hash"><span>Hash original</span><code>{toHex(originalNode.hash)}</code></div>}
      <div className="formula-box"><span>OPERACIÓN APLICADA</span><code>{operation}</code></div>
      {children.length > 0 && <div className="children-box"><span>HASHES HIJOS</span>{children.map((child, index) => <div className="child-hash" key={`${child.id}-${index}`}>{index === 0 ? <ArrowDownLeft size={14} /> : <ArrowDownRight size={14} />}<span>{index === 0 ? 'Izquierdo' : 'Derecho'}{node.duplicatedRight && index === 1 ? ' · duplicado' : ''}</span><code>{toHex(child.hash).slice(0, 22)}…</code></div>)}</div>}
      {node.kind === 'leaf' && <p className="detail-explainer">Esta hoja representa el contenido binario de «{fileNames[node.leafIndex ?? -1] ?? 'un archivo'}». El prefijo 0x00 separa este tipo de hash del usado para nodos internos.</p>}
    </section>
  )
}
