import { toHex } from '../core/hash'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 bytes'
  const units = ['bytes', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function shortHash(bytes: Uint8Array, digits = 12): string {
  const hash = toHex(bytes)
  return `${hash.slice(0, digits)}…${hash.slice(-6)}`
}
