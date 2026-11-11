import type { HashBytes } from '../types/merkle'

const LEAF_PREFIX = 0x00
const PARENT_PREFIX = 0x01

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer
}

async function digest(bytes: Uint8Array): Promise<HashBytes> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API no está disponible en este navegador.')
  }
  const isExactArrayBuffer = bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
  const input = isExactArrayBuffer ? bytes.buffer as ArrayBuffer : exactBuffer(bytes)
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', input))
}

export async function hashLeaf(fileBytes: Uint8Array): Promise<HashBytes> {
  const input = new Uint8Array(fileBytes.byteLength + 1)
  input[0] = LEAF_PREFIX
  input.set(fileBytes, 1)
  return digest(input)
}

export async function hashParent(left: HashBytes, right: HashBytes): Promise<HashBytes> {
  if (left.byteLength !== 32 || right.byteLength !== 32) {
    throw new Error('Los hashes de los nodos deben tener 32 bytes.')
  }
  const input = new Uint8Array(1 + left.byteLength + right.byteLength)
  input[0] = PARENT_PREFIX
  input.set(left, 1)
  input.set(right, 1 + left.byteLength)
  return digest(input)
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function equalHashes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false
  let difference = 0
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!
  return difference === 0
}
