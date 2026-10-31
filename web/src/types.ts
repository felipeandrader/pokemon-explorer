export interface PokemonStats {
  hp: number
  attack: number
  defense: number
  sp_attack: number
  sp_defense: number
  speed: number
}

export interface PokemonEvo {
  chain_id: number | null
  line_stages: number
  stage: number
  branched: boolean
  evolves: boolean
  is_baby: boolean
  species_in_line: number
  /** How this pokemon evolved FROM its pre-evolution. null = base form. */
  evo_trigger: 'level' | 'friendship' | 'item' | 'trade' | 'other' | null
  /** Name of the direct pre-evolution species, or null for base forms. */
  parent_name: string | null
}

export type PokemonCategory =
  | 'legendary'
  | 'mythical'
  | 'pseudo_legendary'
  | 'baby'
  | 'normal'

export type PokemonGender = 'mixed' | 'male_only' | 'female_only' | 'genderless'

export interface Pokemon {
  id: number
  name: string
  types: string[]
  generation: number
  stats: PokemonStats
  bst: number
  height: number | null
  weight: number | null
  capture_rate: number | null
  base_experience: number | null
  base_happiness: number | null
  gender: PokemonGender
  has_hidden_ability: boolean
  hidden_ability: string | null
  category: PokemonCategory
  evo: PokemonEvo
  /** Attack types that deal ≥2x damage (type chart only, no ability overrides). */
  weaknesses: string[]
  /** Attack types that deal >0x and <1x damage. */
  resistances: string[]
  /** Attack types that deal 0x damage. */
  immunities: string[]
  egg_groups: string[]
  abilities: string[]
  color: string | null
  shape: string | null
  habitat: string | null
  growth_rate: string | null
  pca: [number, number]
  umap?: [number, number] | null
}

export interface PcaMeta {
  components: number[][]
  explained_variance_ratio: number[]
  mean: number[]
  scale: number[]
  coord_min: number[]
  coord_range: number[]
}

export interface PokemonData {
  meta: {
    version: number
    features: string[]
    pca: PcaMeta
    include_alt_forms_in_fit: boolean
  }
  pokemon: Pokemon[]
}
