import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashLeaf, toHex } from '../src/core/hash'
import { buildMerkleTree } from '../src/core/merkle'
import { generateMerkleProof, verifyMerkleProof } from '../src/core/merkleProof'

function externalLeaf(text: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(new Uint8Array([0, ...new TextEncoder().encode(text)])).digest())
}

describe('pruebas de inclusión', () => {
  it.each([0, 1, 2, 4])('genera y verifica la prueba para la hoja %i en un árbol impar', async (leafIndex) => {
    const contents = ['alfa', 'beta', 'gamma', 'delta', 'épsilon']
    const hashes = await Promise.all(contents.map((content) => hashLeaf(new TextEncoder().encode(content))))
    const tree = await buildMerkleTree(hashes)
    const proof = generateMerkleProof(tree, leafIndex)
    expect(await verifyMerkleProof(hashes[leafIndex]!, proof)).toBe(true)
    expect(toHex(proof.expectedRoot)).toBe(toHex(tree.root.hash))
    expect(proof.steps.length).toBe(tree.height)
  })

  it('reconstruye correctamente el árbol de una sola hoja sin hermanos', async () => {
    const content = new TextEncoder().encode('archivo único')
    const leaf = await hashLeaf(content)
    const tree = await buildMerkleTree([leaf])
    const proof = generateMerkleProof(tree, 0)
    expect(proof.steps).toHaveLength(0)
    expect(await verifyMerkleProof(leaf, proof)).toBe(true)
  })

  it('rechaza una prueba con un hash hermano modificado', async () => {
    const contents = ['uno', 'dos', 'tres'].map((value) => new TextEncoder().encode(value))
    const leaves = await Promise.all(contents.map(hashLeaf))
    const proof = generateMerkleProof(await buildMerkleTree(leaves), 0)
    proof.steps[0]!.siblingHash[0] ^= 0xff
    expect(await verifyMerkleProof(leaves[0]!, proof)).toBe(false)
  })

  it('compara hashes de hojas con vectores SHA-256 independientes', async () => {
    for (const value of ['abc', 'MerkleViz', '']) {
      expect(toHex(await hashLeaf(new TextEncoder().encode(value)))).toBe(toHex(externalLeaf(value)))
    }
  })

  it('rechaza índices de hojas inválidos', async () => {
    const tree = await buildMerkleTree([await hashLeaf(new Uint8Array([1]))])
    expect(() => generateMerkleProof(tree, -1)).toThrow(RangeError)
    expect(() => generateMerkleProof(tree, 1)).toThrow(RangeError)
  })
})
