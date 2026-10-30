const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export function spriteUrl(id: number): string {
  return `${BASE}/${id}.png`
}
