"""HTTP client with local JSON cache. Each resource maps to data/raw/<type>/<id>.json."""
import json
import time
import requests
from pathlib import Path

RAW_DIR = Path(__file__).parent / "data" / "raw"
BASE = "https://pokeapi.co/api/v2"
DELAY = 0.1  # seconds between uncached requests


def _get(url: str, cache_path: Path) -> dict:
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    cache_path.write_text(json.dumps(data), encoding="utf-8")
    time.sleep(DELAY)
    return data


def fetch_pokemon(poke_id: int) -> dict:
    return _get(f"{BASE}/pokemon/{poke_id}", RAW_DIR / "pokemon" / f"{poke_id}.json")


def fetch_species(species_id: int) -> dict:
    return _get(
        f"{BASE}/pokemon-species/{species_id}",
        RAW_DIR / "pokemon-species" / f"{species_id}.json",
    )


def fetch_evo_chain(chain_id: int) -> dict:
    return _get(
        f"{BASE}/evolution-chain/{chain_id}",
        RAW_DIR / "evolution-chain" / f"{chain_id}.json",
    )


def fetch_species_list() -> list[dict]:
    """Returns [{name, url}, ...] for all species, sorted by species id."""
    data = _get(
        f"{BASE}/pokemon-species?limit=10000&offset=0",
        RAW_DIR / "pokemon-species" / "__list.json",
    )
    results = data["results"]
    results.sort(key=lambda r: int(r["url"].rstrip("/").split("/")[-1]))
    return results
