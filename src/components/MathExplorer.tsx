import { CheckCircle2, CircleHelp, CopyCheck, Fingerprint, KeyRound, Layers3, ListTree, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { generateMerkleProof, reconstructMerkleRoot, verifyMerkleProof } from '../core/merkleProof'
import type { MerkleProof, MerkleTree } from '../types/merkle'
import { shortHash } from '../utils/format'

interface MathExplorerProps {
  tree: MerkleTree | null
  selectedLeafIndex: number
  onProofNodes: (ids: Set<string>) => void
}

export function MathExplorer({ tree, selectedLeafIndex, onProofNodes }: MathExplorerProps) {
  const [proof, setProof] = useState<MerkleProof | null>(null)
  const [proofResult, setProofResult] = useState<{ valid: boolean; reconstructed: Uint8Array } | null>(null)

  useEffect(() => {
    setProof(null)
    setProofResult(null)
    onProofNodes(new Set())
  }, [tree, selectedLeafIndex, onProofNodes])

  useEffect(() => {
    let cancelled = false
    if (!proof) return
    void (async () => {
      const reconstructed = await reconstructMerkleRoot(proof.leafHash, proof)
      if (!reconstructed || cancelled) return
      const valid = await verifyMerkleProof(proof.leafHash, proof)
      if (!cancelled) setProofResult({ valid, reconstructed })
    })()
    return () => { cancelled = true }
  }, [proof])

  const nodesInProof = useMemo(() => {
    if (!tree || !proof) return new Set<string>()
    const ids = new Set<string>([`nivel-0-pos-${proof.leafIndex}`])
    let position = proof.leafIndex
    proof.steps.forEach((step, level) => {
      ids.add(step.siblingId)
      position = Math.floor(position / 2)
      ids.add(`nivel-${level + 1}-pos-${position}`)
    })
    return ids
  }, [tree, proof])

  useEffect(() => { onProofNodes(nodesInProof) }, [nodesInProof, onProofNodes])

  const makeProof = () => {
    if (!tree) return
    try { setProof(generateMerkleProof(tree, selectedLeafIndex)) } catch { setProof(null) }
  }

  return (
    <section className="panel math-panel">
      <div className="panel-heading"><div><span className="eyebrow">EXPLORADOR MATEMÁTICO</span><h2>De los bytes a la raíz</h2></div><div className="panel-heading-icon math-icon"><ListTree size={18} /></div></div>
      <div className="math-steps">
        <MathStep number="01" icon={<Layers3 size={15} />} title="Contenido binario" text="El archivo se lee como una secuencia de bytes, sin convertirlo a texto." formula="m = b₀, b₁, …, bₙ₋₁" />
        <MathStep number="02" icon={<KeyRound size={15} />} title="Hash de hoja" text="Se antepone 0x00 y se calcula SHA-256 para separar las hojas de los nodos." formula="Hₗ = SHA-256(0x00 || m)" />
        <MathStep number="03" icon={<Fingerprint size={15} />} title="Hash de padres" text="Los hashes hijos se concatenan como bytes. Si sobra uno, se duplica el último." formula="Hₚ = SHA-256(0x01 || Hᵢ || Hᵈ)" />
        <MathStep number="04" icon={<ShieldCheck size={15} />} title="Merkle Root" text="La raíz resume el contenido y el orden del conjunto de archivos cargado." formula="R = Hₚ(… Hₚ(Hₗ₀, Hₗ₁) …)" />
      </div>
      <div className="concept-note"><CircleHelp size={16} /><p>Un hash de archivo resume un contenido; un hash interno combina dos nodos; la Merkle Root resume el árbol. Una raíz confiable debe obtenerse de una fuente de confianza para ofrecer garantías de integridad.</p></div>
      <div className="proof-section">
        <div className="proof-title"><div><span className="eyebrow">PRUEBA DE INCLUSIÓN</span><h3>Verificá una hoja del árbol principal</h3></div><button className="button button-secondary button-compact" disabled={!tree} onClick={makeProof}><CopyCheck size={14} /> Generar prueba</button></div>
        <p className="proof-empty">La prueba utiliza el archivo seleccionado en el Laboratorio de Integridad y resalta su ruta de verificación en el gráfico principal.</p>
        {proof && (
          <div className="proof-result">
            <div className="proof-summary"><strong>Hoja #{proof.leafIndex + 1}</strong><span>{proof.steps.length} hash{proof.steps.length === 1 ? '' : 'es'} hermano{proof.steps.length === 1 ? '' : 's'} · crecimiento O(log n)</span>{proofResult && <span className={proofResult.valid ? 'proof-valid' : 'proof-invalid'}>{proofResult.valid ? <><CheckCircle2 size={14} /> Verificada</> : <><XCircle size={14} /> Rechazada</>}</span>}</div>
            <div className="proof-hash-line"><span>Hash de hoja</span><code>{shortHash(proof.leafHash, 18)}</code></div>
            {proof.steps.map((step, index) => <div className="proof-hash-line" key={`${step.siblingId}-${index}`}><span>{step.siblingPosition === 'left' ? 'Hermano izquierdo' : 'Hermano derecho'}{step.duplicated ? ' · duplicado' : ''}</span><code>{shortHash(step.siblingHash, 18)}</code></div>)}
            <div className="proof-hash-line"><span>Raíz reconstruida</span><code>{proofResult ? shortHash(proofResult.reconstructed, 18) : 'Calculando…'}</code></div>
            <div className="proof-hash-line"><span>Raíz esperada</span><code>{shortHash(proof.expectedRoot, 18)}</code></div>
          </div>
        )}
      </div>
    </section>
  )
}

function MathStep({ number, icon, title, text, formula }: { number: string; icon: ReactNode; title: string; text: string; formula: string }) {
  return <div className="math-step"><span className="math-number">{number}</span><span className="math-step-icon">{icon}</span><div className="math-step-copy"><strong>{title}</strong><p>{text}</p></div><code>{formula}</code></div>
}
