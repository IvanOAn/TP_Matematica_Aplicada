import { equalHashes, hashParent } from './hash'
import type { HashBytes, MerkleProof, MerkleTree } from '../types/merkle'

export function generateMerkleProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= tree.leafCount) {
    throw new RangeError('Seleccioná un archivo válido para generar la prueba.')
  }
  const steps: MerkleProof['steps'] = []
  let position = leafIndex
  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex += 1) {
    const level = tree.levels[levelIndex]!
    const siblingPosition = position % 2 === 0 ? position + 1 : position - 1
    const duplicated = siblingPosition >= level.length
    const sibling = duplicated ? level[position]! : level[siblingPosition]!
    steps.push({
      siblingHash: sibling.hash.slice(),
      siblingPosition: position % 2 === 0 ? 'right' : 'left',
      siblingId: sibling.id,
      duplicated,
    })
    position = Math.floor(position / 2)
  }
  return {
    leafIndex,
    leafHash: tree.levels[0]![leafIndex]!.hash.slice(),
    steps,
    expectedRoot: tree.root.hash.slice(),
  }
}

export async function reconstructMerkleRoot(leafHash: HashBytes, proof: MerkleProof): Promise<HashBytes | null> {
  if (leafHash.byteLength !== 32) return null
  let computed: HashBytes = leafHash.slice()
  for (const step of proof.steps) {
    if (step.siblingHash.byteLength !== 32) return null
    computed = step.siblingPosition === 'left'
      ? await hashParent(step.siblingHash, computed)
      : await hashParent(computed, step.siblingHash)
  }
  return computed
}

export async function verifyMerkleProof(leafHash: HashBytes, proof: MerkleProof): Promise<boolean> {
  const computed = await reconstructMerkleRoot(leafHash, proof)
  if (!computed) return false
  return equalHashes(computed, proof.expectedRoot)
}
