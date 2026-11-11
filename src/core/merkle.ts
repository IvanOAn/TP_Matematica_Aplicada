import { equalHashes, hashParent } from './hash'
import type { HashBytes, MerkleNode, MerkleTree } from '../types/merkle'

function nodeId(level: number, position: number): string {
  return `nivel-${level}-pos-${position}`
}

export async function buildMerkleTree(leafHashes: readonly HashBytes[]): Promise<MerkleTree> {
  if (leafHashes.length === 0) throw new Error('No se puede construir un árbol sin archivos.')

  const levels: MerkleNode[][] = [leafHashes.map((hash, position) => ({
    id: nodeId(0, position),
    kind: 'leaf',
    level: 0,
    position,
    hash: hash.slice(),
    childIds: [],
    leafIndex: position,
  }))]

  while (levels[levels.length - 1]!.length > 1) {
    const children = levels[levels.length - 1]!
    const nextLevel: MerkleNode[] = []
    for (let index = 0; index < children.length; index += 2) {
      const left = children[index]!
      const right = children[index + 1] ?? left
      const parentPosition = index / 2
      nextLevel.push({
        id: nodeId(levels.length, parentPosition),
        kind: levels.length === 1 ? 'root' : 'internal',
        level: levels.length,
        position: parentPosition,
        hash: await hashParent(left.hash, right.hash),
        childIds: [left.id, right.id],
        duplicatedRight: right === left,
      })
    }
    levels.push(nextLevel)
  }

  const root = levels[levels.length - 1]![0]!
  root.kind = 'root'
  return {
    levels,
    root,
    leafCount: leafHashes.length,
    height: levels.length - 1,
    nodeCount: levels.reduce((total, level) => total + level.length, 0),
  }
}

export function compareTrees(original: MerkleTree, current: MerkleTree): Set<string> {
  const originalById = new Map(original.levels.flat().map((node) => [node.id, node]))
  const changed = new Set<string>()
  for (const node of current.levels.flat()) {
    const previous = originalById.get(node.id)
    if (!previous || !equalHashes(previous.hash, node.hash)) changed.add(node.id)
  }
  return changed
}

export async function updateTreeForLeaf(tree: MerkleTree, leafIndex: number, leafHash: HashBytes): Promise<MerkleTree> {
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= tree.leafCount) {
    throw new RangeError('El índice de la hoja está fuera del árbol.')
  }
  const levels: MerkleNode[][] = tree.levels.map((level) => level.map((node) => ({
    ...node,
    hash: node.hash.slice(),
    childIds: [...node.childIds] as MerkleNode['childIds'],
  })))
  levels[0]![leafIndex]!.hash = leafHash.slice()

  for (let levelIndex = 1; levelIndex < levels.length; levelIndex += 1) {
    const children = levels[levelIndex - 1]!
    for (const parent of levels[levelIndex]!) {
      const left = children[parent.position * 2]!
      const right = children[parent.position * 2 + 1] ?? left
      parent.hash = await hashParent(left.hash, right.hash)
    }
  }

  const root = levels[levels.length - 1]![0]!
  return { ...tree, levels, root }
}
