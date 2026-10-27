"""Builds the main Pokémon DataFrame from PokeAPI data."""
import pandas as pd
from fetch import fetch_pokemon, fetch_species, fetch_evo_chain, fetch_species_list

# Known pseudo-legendaries for validation (BST 600, 3-stage line, not legendary/mythical).
KNOWN_PSEUDO_LEGENDARIES = {
    "dragonite", "tyranitar", "salamence", "metagross", "garchomp",   # gen 1–4
    "hydreigon", "goodra", "kommo-o", "dragapult",                    # gen 5–8
    "baxcalibur",                                                      # gen 9 — BST 600 confirmed via PokeAPI
}

# Expected values for key test cases. Validated in validate_dataset().
TEST_CASES = {
    "eevee":     {"stage": 1, "line_stages": 2, "branched": True,  "evolves": True,  "species_in_line": 9,  "category": "normal"},
    "dratini":   {"stage": 1, "line_stages": 3, "branched": False, "evolves": True,  "species_in_line": 3,  "category": "normal"},
    "dragonite": {"stage": 3, "line_stages": 3, "branched": False, "evolves": False, "species_in_line": 3,  "category": "pseudo_legendary"},
    "magikarp":  {"stage": 1, "line_stages": 2, "branched": False, "evolves": True,  "species_in_line": 2,  "category": "normal"},
    "mewtwo":    {"stage": 1, "line_stages": 1, "branched": False, "evolves": False, "species_in_line": 1,  "category": "legendary"},
    "pikachu":   {"stage": 2, "line_stages": 3, "branched": False, "evolves": True,  "species_in_line": 3,  "category": "normal"},
    "pichu":     {"stage": 1, "line_stages": 3, "branched": False, "evolves": True,  "species_in_line": 3,  "is_baby": True},
}

# ─── type chart (Gen 6+) ─────────────────────────────────────────────────────
# _TYPE_CHART[attacking_type][defending_type] = damage_multiplier
# Only non-1.0 values stored; missing entries default to 1.0.
_ALL_TYPES = [
    'normal','fire','water','electric','grass','ice',
    'fighting','poison','ground','flying','psychic','bug',
    'rock','ghost','dragon','dark','steel','fairy',
]

_TYPE_CHART: dict[str, dict[str, float]] = {
    'normal':   {'rock': 0.5, 'ghost': 0.0, 'steel': 0.5},
    'fire':     {'fire': 0.5, 'water': 0.5, 'rock': 0.5, 'dragon': 0.5,
                 'grass': 2.0, 'ice': 2.0, 'bug': 2.0, 'steel': 2.0},
    'water':    {'water': 0.5, 'grass': 0.5, 'dragon': 0.5,
                 'fire': 2.0, 'ground': 2.0, 'rock': 2.0},
    'electric': {'electric': 0.5, 'grass': 0.5, 'dragon': 0.5, 'ground': 0.0,
                 'water': 2.0, 'flying': 2.0},
    'grass':    {'fire': 0.5, 'grass': 0.5, 'poison': 0.5, 'flying': 0.5,
                 'bug': 0.5, 'dragon': 0.5, 'steel': 0.5,
                 'water': 2.0, 'ground': 2.0, 'rock': 2.0},
    'ice':      {'water': 0.5, 'ice': 0.5, 'steel': 0.5,
                 'grass': 2.0, 'ground': 2.0, 'flying': 2.0, 'dragon': 2.0},
    'fighting': {'poison': 0.5, 'flying': 0.5, 'psychic': 0.5, 'bug': 0.5,
                 'fairy': 0.5, 'ghost': 0.0,
                 'normal': 2.0, 'ice': 2.0, 'rock': 2.0, 'dark': 2.0, 'steel': 2.0},
    'poison':   {'poison': 0.5, 'ground': 0.5, 'rock': 0.5, 'ghost': 0.5,
                 'steel': 0.0,
                 'grass': 2.0, 'fairy': 2.0},
    'ground':   {'grass': 0.5, 'bug': 0.5, 'flying': 0.0,
                 'fire': 2.0, 'electric': 2.0, 'poison': 2.0, 'rock': 2.0, 'steel': 2.0},
    'flying':   {'electric': 0.5, 'rock': 0.5, 'steel': 0.5,
                 'grass': 2.0, 'fighting': 2.0, 'bug': 2.0},
    'psychic':  {'psychic': 0.5, 'steel': 0.5, 'dark': 0.0,
                 'fighting': 2.0, 'poison': 2.0},
    'bug':      {'fire': 0.5, 'fighting': 0.5, 'flying': 0.5, 'ghost': 0.5,
                 'steel': 0.5, 'fairy': 0.5,
                 'grass': 2.0, 'psychic': 2.0, 'dark': 2.0},
    'rock':     {'fighting': 0.5, 'ground': 0.5, 'steel': 0.5,
                 'fire': 2.0, 'ice': 2.0, 'flying': 2.0, 'bug': 2.0},
    'ghost':    {'normal': 0.0, 'dark': 0.5,
                 'psychic': 2.0, 'ghost': 2.0},
    'dragon':   {'steel': 0.5, 'fairy': 0.0,
                 'dragon': 2.0},
    'dark':     {'fighting': 0.5, 'dark': 0.5, 'fairy': 0.5,
                 'psychic': 2.0, 'ghost': 2.0},
    'steel':    {'fire': 0.5, 'water': 0.5, 'electric': 0.5, 'steel': 0.5,
                 'ice': 2.0, 'rock': 2.0, 'fairy': 2.0},
    'fairy':    {'fire': 0.5, 'poison': 0.5, 'steel': 0.5,
                 'fighting': 2.0, 'dragon': 2.0, 'dark': 2.0},
}


def _compute_matchups(types: list[str]) -> tuple[list[str], list[str], list[str]]:
    """Returns (weaknesses, resistances, immunities) for a pokemon with the given type(s).

    Weaknesses: attacking types that deal >1x damage (2x or 4x).
    Resistances: attacking types that deal <1x but >0x (0.5x or 0.25x).
    Immunities: attacking types that deal 0x.

    Note: ability-based immunities (e.g., Levitate vs Ground) are not included;
    only the pure type matchup is considered.
    """
    weaknesses: list[str] = []
    resistances: list[str] = []
    immunities: list[str] = []
    for atk in _ALL_TYPES:
        mult = 1.0
        for def_type in types:
            mult *= _TYPE_CHART.get(atk, {}).get(def_type, 1.0)
        if mult == 0.0:
            immunities.append(atk)
        elif mult < 1.0:
            resistances.append(atk)
        elif mult > 1.0:
            weaknesses.append(atk)
    return weaknesses, resistances, immunities


# ─── evolution helpers ────────────────────────────────────────────────────────

def _classify_evo_trigger(details: list[dict]) -> str:
    """Map evolution_details to a simplified trigger category."""
    if not details:
        return "other"
    raw = details[0]["trigger"]["name"]
    min_happiness = details[0].get("min_happiness")
    if raw == "level-up" and min_happiness:
        return "friendship"
    if raw == "level-up":
        return "level"
    if raw == "use-item":
        return "item"
    if raw == "trade":
        return "trade"
    return "other"


def _id_from_url(url: str) -> int:
    return int(url.rstrip("/").split("/")[-1])


def _parse_evo_chain(chain_data: dict) -> dict[str, dict]:
    """
    DFS traversal of the evolution tree.
    Returns: species_name -> {chain_id, stage, line_stages, branched, evolves,
                               species_in_line, evo_trigger}

    evo_trigger: how this species evolved FROM its pre-evo (None for base forms).
    """
    chain_id = chain_data["id"]
    entries: list[dict] = []

    def dfs(node: dict, depth: int, trigger: str | None, parent_name: str | None) -> None:
        children = node["evolves_to"]
        entries.append({
            "name":        node["species"]["name"],
            "depth":       depth,
            "n_children":  len(children),
            "evo_trigger": trigger,
            "parent_name": parent_name,
        })
        for child in children:
            child_trigger = _classify_evo_trigger(child.get("evolution_details", []))
            dfs(child, depth + 1, child_trigger, node["species"]["name"])

    dfs(chain_data["chain"], 1, None, None)

    line_stages = max(e["depth"] for e in entries)
    species_in_line = len(entries)
    branched = any(e["n_children"] > 1 for e in entries)

    return {
        e["name"]: {
            "chain_id":        chain_id,
            "stage":           e["depth"],
            "line_stages":     line_stages,
            "branched":        branched,
            "evolves":         e["n_children"] > 0,
            "species_in_line": species_in_line,
            "evo_trigger":     e["evo_trigger"],
            "parent_name":     e["parent_name"],
        }
        for e in entries
    }


def _classify_gender(gender_rate: int | None) -> str:
    if gender_rate is None or gender_rate == -1:
        return "genderless"
    if gender_rate == 0:
        return "male_only"
    if gender_rate == 8:
        return "female_only"
    return "mixed"


def _assign_category(row: pd.Series) -> str:
    """Priority: legendary > mythical > baby > pseudo_legendary > normal."""
    if row["is_legendary"]:
        return "legendary"
    if row["is_mythical"]:
        return "mythical"
    if row["is_baby"]:
        return "baby"
    if row["bst"] == 600 and row["line_stages"] == 3:
        return "pseudo_legendary"
    return "normal"


def build_dataset() -> pd.DataFrame:
    print("Fetching species list...")
    species_list = fetch_species_list()
    total = len(species_list)
    print(f"  Found {total} species\n")

    evo_cache: dict[int, dict] = {}  # chain_id -> parsed evo map
    rows: list[dict] = []

    for i, sp_ref in enumerate(species_list):
        species_id = _id_from_url(sp_ref["url"])
        if i % 100 == 0:
            print(f"  [{i + 1}/{total}] {sp_ref['name']} (species {species_id})")

        sp = fetch_species(species_id)

        # Evolution chain
        chain_url = (sp.get("evolution_chain") or {}).get("url")
        chain_id = _id_from_url(chain_url) if chain_url else None
        if chain_id is not None and chain_id not in evo_cache:
            chain_data = fetch_evo_chain(chain_id)
            evo_cache[chain_id] = _parse_evo_chain(chain_data)

        evo = (evo_cache.get(chain_id) or {}).get(sp_ref["name"])
        if evo is None:
            print(f"  WARN: {sp_ref['name']} not found in chain {chain_id}, using defaults")
            evo = {"chain_id": chain_id, "stage": 1, "line_stages": 1,
                   "branched": False, "evolves": False, "species_in_line": 1,
                   "evo_trigger": None, "parent_name": None}

        # Default form pokemon
        default_variety = next(
            (v for v in sp["varieties"] if v["is_default"]),
            sp["varieties"][0],
        )
        poke_id = _id_from_url(default_variety["pokemon"]["url"])
        pk = fetch_pokemon(poke_id)

        # Stats
        stats = {s["stat"]["name"]: s["base_stat"] for s in pk["stats"]}
        hp         = stats.get("hp", 0)
        attack     = stats.get("attack", 0)
        defense    = stats.get("defense", 0)
        sp_attack  = stats.get("special-attack", 0)
        sp_defense = stats.get("special-defense", 0)
        speed      = stats.get("speed", 0)
        bst = hp + attack + defense + sp_attack + sp_defense + speed

        # Types
        types_sorted = sorted(pk["types"], key=lambda t: t["slot"])
        primary_type   = types_sorted[0]["type"]["name"]
        secondary_type = types_sorted[1]["type"]["name"] if len(types_sorted) > 1 else None

        poke_types = [primary_type] + ([secondary_type] if secondary_type else [])

        # Type matchups (from type chart only — ability overrides excluded)
        weaknesses, resistances, immunities = _compute_matchups(poke_types)

        # Hidden ability
        hidden_ability = next(
            (a["ability"]["name"] for a in pk.get("abilities", []) if a["is_hidden"]),
            None,
        )

        rows.append({
            "id":            poke_id,
            "species_id":    species_id,
            "name":          sp_ref["name"],
            "form":          None,
            "is_default_form": True,
            "primary_type":  primary_type,
            "secondary_type": secondary_type,
            "generation":    _id_from_url(sp["generation"]["url"]),
            "hp": hp, "attack": attack, "defense": defense,
            "sp_attack": sp_attack, "sp_defense": sp_defense, "speed": speed,
            "bst": bst,
            "height":          pk.get("height"),
            "weight":          pk.get("weight"),
            "capture_rate":    sp.get("capture_rate"),
            "base_experience": pk.get("base_experience"),
            "base_happiness":  sp.get("base_happiness"),
            "gender":          _classify_gender(sp.get("gender_rate")),
            "egg_groups": [eg["name"] for eg in sp.get("egg_groups", [])],
            "abilities":  [a["ability"]["name"] for a in pk.get("abilities", [])],
            "has_hidden_ability": hidden_ability is not None,
            "hidden_ability":     hidden_ability,
            "color":       (sp.get("color")       or {}).get("name"),
            "shape":       (sp.get("shape")       or {}).get("name"),
            "habitat":     (sp.get("habitat")     or {}).get("name"),
            "growth_rate": (sp.get("growth_rate") or {}).get("name"),
            "is_legendary": sp.get("is_legendary", False),
            "is_mythical":  sp.get("is_mythical",  False),
            "is_baby":      sp.get("is_baby",      False),
            "chain_id":        evo["chain_id"],
            "line_stages":     evo["line_stages"],
            "stage":           evo["stage"],
            "branched":        evo["branched"],
            "evolves":         evo["evolves"],
            "species_in_line": evo["species_in_line"],
            "evo_trigger":     evo["evo_trigger"],
            "parent_name":     evo["parent_name"],
            "weaknesses":  weaknesses,
            "resistances": resistances,
            "immunities":  immunities,
            "sprite": ((pk.get("sprites") or {}).get("front_default") or ""),
        })

    df = pd.DataFrame(rows)
    df["category"] = df.apply(_assign_category, axis=1)
    return df


def validate_dataset(df: pd.DataFrame) -> bool:
    print("\n=== Validation: Test Cases ===")
    all_pass = True

    for name, expected in TEST_CASES.items():
        found = df[df["name"] == name]
        if found.empty:
            print(f"  MISS  {name}: not found in dataset")
            all_pass = False
            continue
        row = found.iloc[0]
        for field, exp in expected.items():
            actual = row[field]
            ok = bool(actual == exp)
            if not ok:
                all_pass = False
            print(f"  {'OK  ' if ok else 'FAIL'} {name}.{field}: expected={exp!r}  got={actual!r}")

    print("\n=== Validation: Pseudo-Legendaries ===")
    detected = set(df[df["category"] == "pseudo_legendary"]["name"])
    unexpected = detected - KNOWN_PSEUDO_LEGENDARIES
    missed     = KNOWN_PSEUDO_LEGENDARIES - detected

    if not unexpected and not missed:
        print(f"  OK   {sorted(detected)}")
    else:
        if unexpected:
            print(f"  WARN unexpected pseudo-legendaries: {unexpected}")
            all_pass = False
        if missed:
            print(f"  WARN missed pseudo-legendaries:     {missed}")
            all_pass = False

    status = "ALL PASS" if all_pass else "SOME FAILURES — review output above"
    print(f"\nResult: {status}")
    return all_pass
