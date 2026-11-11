import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashLeaf, hashParent, toHex } from '../src/core/hash'
import { buildMerkleTree, compareTrees, updateTreeForLeaf } from '../src/core/merkle'

function independentDigest(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(bytes).digest())
}

function independentLeaf(bytes: Uint8Array): Uint8Array {
  return independentDigest(new Uint8Array([0x00, ...bytes]))
}

function independentParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return independentDigest(new Uint8Array([0x01, ...left, ...right]))
}

function independentRoot(leaves: Uint8Array[]): Uint8Array {
  let level = leaves.map((leaf) => leaf.slice())
  if (level.length === 0) throw new Error('empty')
  while (level.length > 1) {
    const next: Uint8Array[] = []
    for (let index = 0; index < level.length; index += 2) {
      next.push(independentParent(level[index]!, level[index + 1] ?? level[index]!))
    }
    level = next
  }
  return level[0]!
}

describe('motor SHA-256 y Merkle', () => {
  it('calcula SHA-256 con separación de dominio para hojas conocidas', async () => {
    const values = [new Uint8Array(), new TextEncoder().encode('abc'), new Uint8Array([0, 1, 2, 255])]
    for (const value of values) {
      expect(toHex(await hashLeaf(value))).toBe(toHex(independentLeaf(value)))
    }
  })

  it('calcula hashes internos concatenando bytes con prefijo 0x01', async () => {
    const left = new Uint8Array(32).fill(0x11)
    const right = new Uint8Array(32).fill(0x22)
    expect(toHex(await hashParent(left, right))).toBe(toHex(independentParent(left, right)))
  })

  it.each([1, 2, 3, 4, 5])('construye el árbol de %i hojas con raíz independiente', async (count) => {
    const contents = Array.from({ length: count }, (_, index) => new TextEncoder().encode(`archivo-${index}`))
    const leaves = await Promise.all(contents.map(hashLeaf))
    const tree = await buildMerkleTree(leaves)
    expect(toHex(tree.root.hash)).toBe(toHex(independentRoot(contents.map(independentLeaf))))
    expect(tree.leafCount).toBe(count)
    expect(tree.levels[0]!.map((node) => node.leafIndex)).toEqual(Array.from({ length: count }, (_, index) => index))
  })

  it('rechaza construir un árbol sin hojas', async () => {
    await expect(buildMerkleTree([])).rejects.toThrow('sin archivos')
  })

  it('maneja archivos vacíos e idénticos como hojas distintas', async () => {
    const empty = await hashLeaf(new Uint8Array())
    const tree = await buildMerkleTree([empty, empty, empty])
    expect(tree.levels[0]!.map((node) => node.id)).toEqual(['nivel-0-pos-0', 'nivel-0-pos-1', 'nivel-0-pos-2'])
    expect(tree.levels[0]![0]!.id).not.toBe(tree.levels[0]![1]!.id)
    expect(toHex(tree.root.hash)).toBe(toHex(independentRoot([independentLeaf(new Uint8Array()), independentLeaf(new Uint8Array()), independentLeaf(new Uint8Array())])))
  })

  it('duplica el último hash al emparejar una cantidad impar', async () => {
    const leaves = await Promise.all(['a', 'b', 'c'].map((value) => hashLeaf(new TextEncoder().encode(value))))
    const tree = await buildMerkleTree(leaves)
    expect(tree.levels[1]![1]!.duplicatedRight).toBe(true)
    expect(tree.levels[1]![1]!.childIds[0]).toBe(tree.levels[1]![1]!.childIds[1])
  })

  it('respeta el orden de las hojas', async () => {
    const a = await hashLeaf(new TextEncoder().encode('A'))
    const b = await hashLeaf(new TextEncoder().encode('B'))
    const [ab, ba] = await Promise.all([buildMerkleTree([a, b]), buildMerkleTree([b, a])])
    expect(toHex(ab.root.hash)).not.toBe(toHex(ba.root.hash))
  })

  it('actualiza solo la hoja modificada y sus ancestros, y restaura la raíz', async () => {
    const contents = ['uno', 'dos', 'tres', 'cuatro', 'cinco'].map((value) => new TextEncoder().encode(value))
    const hashes = await Promise.all(contents.map(hashLeaf))
    const original = await buildMerkleTree(hashes)
    const alteredBytes = contents[3]!.slice()
    alteredBytes[0] = alteredBytes[0]! ^ 1
    const altered = await updateTreeForLeaf(original, 3, await hashLeaf(alteredBytes))
    expect(toHex(altered.root.hash)).not.toBe(toHex(original.root.hash))
    expect(compareTrees(original, altered)).toEqual(new Set(['nivel-0-pos-3', 'nivel-1-pos-1', 'nivel-2-pos-0', 'nivel-3-pos-0']))
    const restored = await updateTreeForLeaf(altered, 3, hashes[3]!)
    expect(toHex(restored.root.hash)).toBe(toHex(original.root.hash))
    expect(compareTrees(original, restored).size).toBe(0)
  })

  it('rechaza índices de hojas fuera de rango', async () => {
    const tree = await buildMerkleTree([await hashLeaf(new Uint8Array([1]))])
    await expect(updateTreeForLeaf(tree, -1, new Uint8Array(32))).rejects.toThrow(RangeError)
    await expect(updateTreeForLeaf(tree, 1, new Uint8Array(32))).rejects.toThrow(RangeError)
  })
})
