export type HashBytes = Uint8Array
export type NodeKind = 'leaf' | 'internal' | 'root'

export interface MerkleNode {
  id: string
  kind: NodeKind
  level: number
  position: number
  hash: HashBytes
  childIds: [string, string] | []
  leafIndex?: number
  duplicatedRight?: boolean
}

export interface MerkleTree {
  levels: MerkleNode[][]
  root: MerkleNode
  leafCount: number
  height: number
  nodeCount: number
}

export interface ProofStep {
  siblingHash: HashBytes
  siblingPosition: 'left' | 'right'
  siblingId: string
  duplicated: boolean
}

export interface MerkleProof {
  leafIndex: number
  leafHash: HashBytes
  steps: ProofStep[]
  expectedRoot: HashBytes
}

export interface FileEntry {
  id: string
  file: File
  leafHash: HashBytes
}
