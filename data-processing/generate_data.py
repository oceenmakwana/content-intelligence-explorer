import pandas as pd
import numpy as np
from pathlib import Path

RAW_PATH = Path("data-processing/raw/netflix_titles.csv")
OUT_PATH = Path("data-processing/output/cleaned_data.csv")

REGIONS = [
    ("US", 1.00),
    ("IN", 1.15),
    ("EU", 0.95),
    ("LATAM", 0.90),
]

np.random.seed(42)

def pick_primary_genre(listed_in: str) -> str:
    if pd.isna(listed_in) or not str(listed_in).strip():
        return "Unknown"
    return str(listed_in).split(",")[0].strip()

def genre_multiplier(genre: str) -> float:
    genre = genre.lower()
    if "action" in genre:
        return 1.10
    if "drama" in genre:
        return 1.05
    if "comedy" in genre:
        return 0.95
    if "document" in genre:
        return 0.85
    if "crime" in genre:
        return 1.00
    if "romance" in genre:
        return 0.92
    if "sci-fi" in genre:
        return 1.08
    return 1.00

def simulate_metrics(row, region_mult: float):
    year = int(row["release_year"])
    genre = row["primary_genre"]
    g_mult = genre_multiplier(genre)

    recency = max(0, year - 2018)
    base = 50000 + recency * 7000

    views_7d = base * g_mult * region_mult * np.random.uniform(0.7, 1.3)
    views_28d = views_7d * np.random.uniform(1.4, 2.2)
    engagement_score = np.clip((views_7d / 1500) + np.random.normal(20, 8), 5, 95)
    retention_28d = np.clip(np.random.normal(0.35, 0.10) * g_mult, 0.05, 0.70)

    return int(views_7d), int(views_28d), round(float(engagement_score), 1), round(float(retention_28d), 2)

def main():
    df = pd.read_csv(RAW_PATH)

    required_cols = {"title", "type", "release_year", "listed_in"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in raw CSV: {missing}")

    df["primary_genre"] = df["listed_in"].apply(pick_primary_genre)
    df["title_id"] = (
        df["title"].astype(str) + "_" + df["release_year"].astype(str)
    ).str.replace(" ", "_", regex=False)

    rows = []
    for _, r in df.iterrows():
        for region_code, r_mult in REGIONS:
            v7, v28, score, ret = simulate_metrics(r, r_mult)
            rows.append({
                "title_id": r["title_id"],
                "title": r["title"],
                "type": r["type"],
                "release_year": int(r["release_year"]),
                "primary_genre": r["primary_genre"],
                "region": region_code,
                "views_7d": v7,
                "views_28d": v28,
                "engagement_score": score,
                "retention_28d": ret,
            })

    out = pd.DataFrame(rows)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT_PATH, index=False)
    print(f"Created {OUT_PATH} with {len(out)} rows")

if __name__ == "__main__":
    main()
