import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeTypes, type ReactFlowInstance } from '@xyflow/react'
import { Eye, EyeOff, Fingerprint, Focus, Maximize2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toHex } from '../core/hash'
import { NodeDetails } from './NodeDetails'
import type { MerkleNode, MerkleTree } from '../types/merkle'

interface MerkleNodeData extends Record<string, unknown> {
  node: MerkleNode
  fullHash: string
  shortHash: string
  status: 'normal' | 'changed' | 'proof' | 'selected'
  fileName?: string
}
type MerkleFlowNode = Node<MerkleNodeData, 'merkle'>

interface MerkleTreeGraphProps {
  tree: MerkleTree | null
  originalTree: MerkleTree | null
  selectedId: string | null
  selectedNode: MerkleNode | null
  changedIds?: Set<string>
  proofIds?: Set<string>
  revealedIds?: Set<string>
  fileNames: string[]
  onSelect: (id: string | null) => void
  children?: ReactNode
}

function MerkleNodeCard({ data }: { data: MerkleNodeData }) {
  const label = data.node.kind === 'root' ? 'Raíz' : data.node.kind === 'leaf' ? 'Hoja' : 'Nodo intermedio'
  return (
    <div className={`tree-node tree-node-${data.status}`} title={data.fullHash}>
      <div className="tree-node-top"><span className={`node-kind-badge badge-${data.node.kind}`}>{label}</span><span className="node-position">L{data.node.level} · #{data.node.position}</span></div>
      <strong>{data.node.kind === 'leaf' ? (data.fileName ?? `Archivo ${data.node.position + 1}`) : data.node.kind === 'root' ? 'Merkle Root' : `Nodo ${data.node.position + 1}`}</strong>
      <code>{data.shortHash}</code>
      <span className="node-state-dot" />
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}

const nodeTypes: NodeTypes = { merkle: MerkleNodeCard }

export function MerkleTreeGraph({ tree, originalTree, selectedId, selectedNode, changedIds = new Set(), proofIds = new Set(), revealedIds = new Set(), fileNames, onSelect, children }: MerkleTreeGraphProps) {
  const [flow, setFlow] = useState<ReactFlowInstance<MerkleFlowNode, Edge> | null>(null)
  const [showNodeDetails, setShowNodeDetails] = useState(true)
  const [showSimulation, setShowSimulation] = useState(true)
  const { nodes, edges, minWidth } = useMemo(() => {
    if (!tree) return { nodes: [] as MerkleFlowNode[], edges: [] as Edge[], minWidth: 0 }
    const count = tree.leafCount
    const maxLevel = tree.levels.length - 1
    const graphNodes: MerkleFlowNode[] = []
    const graphEdges: Edge[] = []
    for (const level of tree.levels) {
      for (const node of level) {
        const spread = 2 ** node.level
        const start = node.position * spread
        const end = Math.min((node.position + 1) * spread, count) - 1
        const center = (start + end) / 2
        const isShownChanged = changedIds.has(node.id) && revealedIds.has(node.id)
        const status = selectedId === node.id ? 'selected' : isShownChanged ? 'changed' : proofIds.has(node.id) ? 'proof' : 'normal'
        const displayNode = originalTree && !revealedIds.has(node.id) && changedIds.has(node.id)
          ? { ...node, hash: originalTree.levels[node.level]?.[node.position]?.hash ?? node.hash }
          : node
        const fullHash = toHex(displayNode.hash)
        graphNodes.push({
          id: node.id,
          type: 'merkle',
          position: { x: center * 240, y: (maxLevel - node.level) * 144 },
          data: { node, fullHash, shortHash: `${fullHash.slice(0, 10)}…${fullHash.slice(-6)}`, status, fileName: fileNames[node.leafIndex ?? -1] },
          draggable: false,
          selectable: true,
        })
        for (let childIndex = 0; childIndex < node.childIds.length; childIndex += 1) {
          const childId = node.childIds[childIndex]!
          graphEdges.push({
            id: `${node.id}-${childId}-${childIndex}`,
            source: node.id,
            target: childId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'smoothstep',
            animated: revealedIds.has(node.id) && changedIds.has(node.id),
            label: childIndex === 0 ? 'izq.' : 'der.',
            labelStyle: { fill: 'var(--muted)', fontSize: 12, fontWeight: 700 },
            labelBgStyle: { fill: 'var(--panel)', fillOpacity: 0.9 },
            style: { stroke: proofIds.has(node.id) && proofIds.has(childId) ? 'var(--green)' : revealedIds.has(node.id) && changedIds.has(node.id) ? 'var(--red)' : 'var(--edge)', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge)' },
          })
        }
      }
    }
    return { nodes: graphNodes, edges: graphEdges, minWidth: Math.max(900, count * 240) }
  }, [tree, originalTree, selectedId, changedIds, proofIds, revealedIds, fileNames])

  useEffect(() => {
    if (tree && flow) requestAnimationFrame(() => void flow.fitView({ padding: 0.2, duration: 260 }))
  }, [tree?.root.id, flow, nodes.length, showNodeDetails, showSimulation])

  const detailsVisible = Boolean(tree && showNodeDetails)
  const simulationVisible = Boolean(showSimulation)

  return (
    <section className="panel graph-panel">
      <div className="graph-heading">
        <div><span className="eyebrow">ESTRUCTURA DEL CONJUNTO</span><h2>Árbol de Merkle</h2><p>Seleccioná cualquier nodo para explorar su cálculo.</p></div>
        <div className="graph-actions">
          <button className="panel-toggle-button" aria-pressed={showNodeDetails} title={showNodeDetails ? 'Ocultar detalle del nodo' : 'Mostrar detalle del nodo'} onClick={() => setShowNodeDetails((visible) => !visible)}>{showNodeDetails ? <EyeOff size={14} /> : <Eye size={14} />}<span>Detalle</span></button>
          <button className="panel-toggle-button" aria-pressed={showSimulation} title={showSimulation ? 'Ocultar laboratorio' : 'Mostrar laboratorio'} onClick={() => setShowSimulation((visible) => !visible)}>{showSimulation ? <EyeOff size={14} /> : <Eye size={14} />}<span>Laboratorio</span></button>
          <button className="icon-button" title="Ajustar a la vista" onClick={() => void flow?.fitView({ padding: 0.2, duration: 250 })}><Maximize2 size={15} /></button>
          <button className="icon-button" title="Reiniciar visualización" onClick={() => void flow?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 250 })}><Focus size={15} /></button>
        </div>
      </div>
      <div className={`graph-content ${detailsVisible ? 'details-visible' : 'details-hidden'} ${simulationVisible ? 'simulation-visible' : 'simulation-hidden'} ${tree ? 'graph-content-ready' : ''}`}>
        {tree && showNodeDetails && <NodeDetails node={selectedNode} originalTree={originalTree} currentTree={tree} fileNames={fileNames} onClearSelection={() => onSelect(null)} />}
        {tree ? (
          <div className="flow-viewport" style={{ minWidth: Math.min(minWidth, 900) }}>
            <ReactFlow<MerkleFlowNode, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => onSelect(node.id === selectedId ? null : node.id)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              onInit={(instance) => setFlow(instance)}
              minZoom={0.12}
              maxZoom={1.8}
              nodesConnectable={false}
              nodesDraggable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--grid)" gap={24} size={1} />
              <Controls position="bottom-right" showInteractive={false} />
            </ReactFlow>
            <div className="graph-legend"><span><i className="legend-dot legend-blue" /> Sin cambios</span><span><i className="legend-dot legend-red" /> Alterado</span><span><i className="legend-dot legend-green" /> Prueba</span><span><i className="legend-dot legend-yellow" /> Seleccionado</span></div>
          </div>
        ) : (
          <div className="graph-empty"><div><Fingerprint size={28} /></div><strong>Tu árbol va a aparecer acá</strong><span>Agregá uno o más archivos para empezar a visualizar sus relaciones criptográficas.</span></div>
        )}
        {showSimulation && <div className="graph-simulation-panel">{children}</div>}
      </div>
    </section>
  )
}
