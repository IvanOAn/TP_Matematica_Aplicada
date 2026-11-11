import { Activity, Check, Fingerprint, Layers3, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MerkleTree } from '../types/merkle'
import { toHex } from '../core/hash'

interface IntegrityDashboardProps {
  tree: MerkleTree | null
  currentTree: MerkleTree | null
  changedCount: number
  simulationReady: boolean
}

export function IntegrityDashboard({ tree, currentTree, changedCount, simulationReady }: IntegrityDashboardProps) {
  if (!tree || !currentTree) {
    return <section className="panel integrity-panel"><PanelHeading /><div className="integrity-empty">Cargá al menos un archivo para calcular la raíz de Merkle.</div></section>
  }
  const verified = toHex(tree.root.hash) === toHex(currentTree.root.hash)
  return (
    <section className="panel integrity-panel">
      <PanelHeading />
      <div className={`verification-banner ${verified ? 'verification-ok' : 'verification-failed'}`}>
        <div className="verification-icon">{verified ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</div>
        <div><span>Estado de integridad</span><strong>{verified ? 'Contenido verificado' : 'Alteración detectada'}</strong></div>
        <span className="verification-tag">{verified ? <><Check size={13} /> ÍNTEGRO</> : 'CAMBIÓ'}</span>
      </div>
      <div className="root-comparison">
        <div className="root-line"><span>Raíz de referencia</span><code>{toHex(tree.root.hash)}</code></div>
        <div className="root-line"><span>Raíz actual</span><code className={!verified ? 'text-danger' : ''}>{toHex(currentTree.root.hash)}</code></div>
      </div>
      <div className="integrity-stats">
        <Stat icon={<Layers3 size={15} />} value={String(tree.leafCount)} label="archivos" />
        <Stat icon={<Activity size={15} />} value={String(tree.nodeCount)} label="nodos" />
        <Stat icon={<Fingerprint size={15} />} value={String(tree.height)} label="altura" />
        <Stat icon={<ShieldAlert size={15} />} value={String(changedCount)} label="hashes modificados" alert={changedCount > 0} />
      </div>
      <p className="integrity-footnote">{simulationReady ? 'La raíz de referencia se fijó al procesar el conjunto actual.' : 'La raíz inicial se usa como referencia durante esta sesión.'}</p>
    </section>
  )
}

function PanelHeading() {
  return <div className="panel-heading"><div><span className="eyebrow">COMPROBACIÓN</span><h2>Estado de integridad</h2></div><div className="panel-heading-icon"><Fingerprint size={18} /></div></div>
}

function Stat({ icon, value, label, alert = false }: { icon: ReactNode; value: string; label: string; alert?: boolean }) {
  return <div className={`stat ${alert ? 'stat-alert' : ''}`}><span className="stat-icon">{icon}</span><strong>{value}</strong><span>{label}</span></div>
}
