"""Entry point: fetch → build dataset → PCA → export JSON."""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')  # type: ignore[attr-defined]  # prevents charmap errors on Windows

# Ensure sibling modules are importable regardless of where this script is called from.
sys.path.insert(0, str(Path(__file__).parent))

from build_dataset import build_dataset, validate_dataset
from project import fit_and_project
from export_json import export


def main() -> None:
    print("=== Pokémon Space Explorer — Phase 1: Data Pipeline ===\n")

    print("[1/3] Building dataset from PokeAPI...")
    df = build_dataset()
    print(f"\nDataset built: {len(df)} Pokémon (default forms only)\n")

    ok = validate_dataset(df)
    if not ok:
        print("\nValidation failed — JSON will still be exported so you can inspect the data.")

    print("\n[2/3] Computing PCA...")
    pca_meta, df = fit_and_project(df)

    print("\n[3/3] Exporting JSON...")
    export(pca_meta, df)

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
