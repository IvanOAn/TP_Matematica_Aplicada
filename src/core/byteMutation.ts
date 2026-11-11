export function mutateByte(source: Uint8Array, byteIndex: number, bitIndex: number): Uint8Array {
  if (!Number.isInteger(byteIndex) || byteIndex < 0 || byteIndex >= source.byteLength) {
    throw new RangeError('La posición del byte debe estar dentro del archivo.')
  }
  if (!Number.isInteger(bitIndex) || bitIndex < 0 || bitIndex > 7) {
    throw new RangeError('El bit debe ser un número entre 0 y 7.')
  }
  const mutated = source.slice()
  mutated[byteIndex] = mutated[byteIndex]! ^ (1 << bitIndex)
  return mutated
}
