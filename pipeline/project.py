"""StandardScaler + PCA(2) on the 6 stats. Normalizes coordinates to [-1, 1]."""
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

FEATURES = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"]


def fit_and_project(df: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    """
    Fits scaler and PCA on default forms only (decided in Phase 1).
    Transforms all rows and normalizes coords to [-1, 1] based on default-form range.

    Why fit on default forms only: alternate forms (Mega, Gigantamax, regional) have
    inflated stats that would shift the axes and compress the main Pokémon space.

    Why normalize coords: gives the front-end a stable [-1, 1] canvas regardless of
    how explained variance changes if we ever refit with a different dataset.
    The normalization transform is stored in meta so the browser can invert it if needed.
    """
    mask = df["is_default_form"].values.astype(bool)
    X_fit = df.loc[mask, FEATURES].values.astype(float)

    scaler = StandardScaler()
    X_fit_scaled = scaler.fit_transform(X_fit)

    pca = PCA(n_components=2)
    pca.fit(X_fit_scaled)

    # Transform all rows (default + alt forms, when present)
    X_all_scaled = scaler.transform(df[FEATURES].values.astype(float))
    coords = pca.transform(X_all_scaled)

    # Normalize to [-1, 1] using the range observed in default forms
    coords_fit = coords[mask]
    mins   = coords_fit.min(axis=0)
    ranges = coords_fit.max(axis=0) - mins
    coords_norm = 2.0 * (coords - mins) / ranges - 1.0

    df = df.copy()
    df["pca_x"] = coords_norm[:, 0]
    df["pca_y"] = coords_norm[:, 1]

    df["umap_x"] = None
    df["umap_y"] = None
    try:
        from umap import UMAP
        umap_model = UMAP(n_components=2, random_state=42, n_neighbors=15, min_dist=0.1)
        umap_coords = umap_model.fit_transform(X_fit_scaled)
        umap_mins   = umap_coords.min(axis=0)
        umap_ranges = umap_coords.max(axis=0) - umap_mins
        umap_norm   = 2.0 * (umap_coords - umap_mins) / umap_ranges - 1.0
        umap_all    = np.full((len(df), 2), np.nan)
        umap_all[mask] = umap_norm
        df["umap_x"] = umap_all[:, 0]
        df["umap_y"] = umap_all[:, 1]
        print(f"UMAP computed for {mask.sum()} default forms.")
    except ImportError:
        print("umap-learn not installed — skipping UMAP. Run: pip install umap-learn")

    _report_loadings(pca)

    meta = {
        "components":              pca.components_.tolist(),
        "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
        "mean":  scaler.mean_.tolist(),   # StandardScaler mean (for browser inversion)
        "scale": scaler.scale_.tolist(),  # StandardScaler std
        "coord_min":   mins.tolist(),     # normalization params
        "coord_range": ranges.tolist(),
    }
    return meta, df


def _report_loadings(pca: PCA) -> None:
    """
    Prints PCA loadings so we can verify the axis interpretation from the reference video:
      PC1 (x-axis) ≈ overall power (legendaries high, Magikarp low)
      PC2 (y-axis) ≈ specialization (tanky left vs speed/special right)
    If the actual loadings contradict this, we report it here.
    """
    ev = pca.explained_variance_ratio_
    print(f"\n=== PCA Loadings ===")
    print(f"Explained variance:  PC1={ev[0]:.1%}  PC2={ev[1]:.1%}  total={sum(ev):.1%}")
    print(f"(Remaining {1 - sum(ev):.1%} is spread across PC3–PC6 and lost in 2D projection)\n")

    for pc_idx, pc_label in enumerate(["PC1 (horizontal axis)", "PC2 (vertical axis)"]):
        loadings = list(zip(FEATURES, pca.components_[pc_idx]))
        loadings_sorted = sorted(loadings, key=lambda x: -abs(x[1]))
        print(f"{pc_label}:")
        for feat, load in loadings_sorted:
            bar = "█" * round(abs(load) * 25)
            sign = "+" if load >= 0 else "-"
            print(f"  {feat:12s} {sign}{abs(load):.4f}  {bar}")
        print()
