"""Serializes the dataset and PCA metadata to web/public/data/pokemon.json."""
import json
import math
from pathlib import Path

import pandas as pd

OUT_PATH = Path(__file__).parent.parent / "web" / "public" / "data" / "pokemon.json"
FEATURES = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"]


def _int_or_none(v) -> int | None:
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    return int(v)


def _float_round(v, ndigits: int = 6) -> float | None:
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    return round(float(v), ndigits)


def _str_or_none(v) -> str | None:
    """Pandas stores missing strings as float NaN in object columns."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    return str(v)


def export(pca_meta: dict, df: pd.DataFrame) -> None:
    pokemon_list = []

    for _, row in df.iterrows():
        types = [row["primary_type"]]
        sec = row["secondary_type"]
        if sec and not (isinstance(sec, float) and math.isnan(sec)):
            types.append(sec)

        pokemon_list.append({
            "id":              int(row["id"]),
            "species_id":      int(row["species_id"]),
            "name":            row["name"],
            "form":            row["form"],
            "is_default_form": bool(row["is_default_form"]),
            "types":           types,
            "generation":      int(row["generation"]),
            "stats": {
                "hp":         int(row["hp"]),
                "attack":     int(row["attack"]),
                "defense":    int(row["defense"]),
                "sp_attack":  int(row["sp_attack"]),
                "sp_defense": int(row["sp_defense"]),
                "speed":      int(row["speed"]),
            },
            "bst":             int(row["bst"]),
            "height":          _int_or_none(row.get("height")),
            "weight":          _int_or_none(row.get("weight")),
            "capture_rate":    _int_or_none(row.get("capture_rate")),
            "base_experience": _int_or_none(row.get("base_experience")),
            "base_happiness":  _int_or_none(row.get("base_happiness")),
            "gender":          row.get("gender", "genderless"),
            "has_hidden_ability": bool(row.get("has_hidden_ability", False)),
            "hidden_ability":     _str_or_none(row.get("hidden_ability")),
            "category":        row["category"],
            "evo": {
                "chain_id":        _int_or_none(row["chain_id"]),
                "line_stages":     int(row["line_stages"]),
                "stage":           int(row["stage"]),
                "branched":        bool(row["branched"]),
                "evolves":         bool(row["evolves"]),
                "is_baby":         bool(row["is_baby"]),
                "species_in_line": int(row["species_in_line"]),
                "evo_trigger":     _str_or_none(row.get("evo_trigger")),
                "parent_name":     _str_or_none(row.get("parent_name")),
            },
            "weaknesses":  row["weaknesses"]  if isinstance(row["weaknesses"],  list) else [],
            "resistances": row["resistances"] if isinstance(row["resistances"], list) else [],
            "immunities":  row["immunities"]  if isinstance(row["immunities"],  list) else [],
            "egg_groups":  row["egg_groups"]  if isinstance(row["egg_groups"],  list) else [],
            "abilities":   row["abilities"]   if isinstance(row["abilities"],   list) else [],
            "color":       _str_or_none(row.get("color")),
            "shape":       _str_or_none(row.get("shape")),
            "habitat":     _str_or_none(row.get("habitat")),
            "growth_rate": _str_or_none(row.get("growth_rate")),
            "sprite":      _str_or_none(row.get("sprite")) or "",
            "pca":  [_float_round(row["pca_x"]), _float_round(row["pca_y"])],
            "umap": None,
        })

    output = {
        "meta": {
            "version": 2,
            "features": FEATURES,
            "pca": pca_meta,
            "include_alt_forms_in_fit": False,
        },
        "pokemon": pokemon_list,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, allow_nan=False)

    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"Exported {len(pokemon_list)} Pokémon → {OUT_PATH}")
    print(f"File size: {size_mb:.2f} MB")
