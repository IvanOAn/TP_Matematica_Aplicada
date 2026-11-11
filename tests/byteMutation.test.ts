import { describe, expect, it } from 'vitest'
import { mutateByte } from '../src/core/byteMutation'

describe('alteración controlada de bytes', () => {
  it('invierte un bit y conserva intactos los bytes originales', () => {
    const original = new Uint8Array([0b00001111, 0b10101010])
    const changed = mutateByte(original, 0, 3)
    expect(Array.from(changed)).toEqual([0b00000111, 0b10101010])
    expect(Array.from(original)).toEqual([0b00001111, 0b10101010])
  })

  it('permite modificar extremos válidos y bits 0 a 7', () => {
    const data = new Uint8Array([0, 0])
    expect(mutateByte(data, 0, 0)[0]).toBe(1)
    expect(mutateByte(data, 1, 7)[1]).toBe(128)
  })

  it('rechaza posiciones de byte o bits fuera de rango', () => {
    const data = new Uint8Array([42])
    for (const index of [-1, 1, 0.5]) expect(() => mutateByte(data, index, 0)).toThrow(RangeError)
    for (const bit of [-1, 8, 1.5]) expect(() => mutateByte(data, 0, bit)).toThrow(RangeError)
  })
})
