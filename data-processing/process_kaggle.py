import pandas as pd
import numpy as np
from pathlib import Path

RAW_DIR = Path("data-processing/raw/netflix_kaggle")
MOVIES_PATH = RAW_DIR / "netflix_movies_detailed_up_to_2025.csv"
TV_PATH = RAW_DIR / "netflix_tv_shows_detailed_up_to_2025.csv"
OUT_PATH = Path("data-processing/output/kaggle_cleaned.csv")

np.random.seed(42)

REGIONS = [
    ("US", 1.00),
    ("IN", 1.15),
    ("EU", 0.95),
    ("LATAM", 0.90),
]

def find_col(df, candidates):
    lower_map = {c.lower(): c for c in df.columns}
    for cand in candidates:
        for col_lower, original in lower_map.items():
            if cand in col_lower:
                return original
    return None

def clean_one_file(path, content_type):
    df = pd.read_csv(path)

    title_col = find_col(df, ["title", "name"])
    year_col = find_col(df, ["release_year", "year", "release date", "release_date"])
    genre_col = find_col(df, ["genre", "listed_in", "categories"])
    rating_col = find_col(df, ["vote_average", "imdb", "rating", "score"])
    popularity_col = find_col(df, ["popularity", "views", "watch", "votes"])

    if not title_col:
        raise ValueError(f"Could not find title column in {path.name}")

    df = df.dropna(subset=[title_col]).copy()
    df["title"] = df[title_col].astype(str).str.strip()
    df["type"] = content_type

    if year_col:
        # handle both numeric year and full date strings
        year_series = pd.to_numeric(df[year_col], errors="coerce")
        if year_series.notna().sum() > 0:
            df["release_year"] = year_series
        else:
            df["release_year"] = pd.to_datetime(df[year_col], errors="coerce").dt.year
    else:
        df["release_year"] = np.random.randint(2018, 2025, len(df))

    if genre_col:
        df["primary_genre"] = (
            df[genre_col]
            .astype(str)
            .str.split(",")
            .str[0]
            .str.strip()
            .replace("", "Unknown")
        )
    else:
        df["primary_genre"] = "Unknown"

    # Base metrics from available columns when possible
    if popularity_col:
        base_views = pd.to_numeric(df[popularity_col], errors="coerce").fillna(0)
        # scale to a more presentation-friendly range
        base_views = (base_views - base_views.min()) / (base_views.max() - base_views.min() + 1e-9)
        df["views_7d_base"] = (20000 + base_views * 130000).astype(int)
    else:
        df["views_7d_base"] = np.random.randint(20000, 150000, len(df))

    if rating_col:
        rating_vals = pd.to_numeric(df[rating_col], errors="coerce").fillna(np.nan)
        # normalize ratings to 0-100 style engagement if possible
        if rating_vals.notna().sum() > 0:
            max_rating = rating_vals.max()
            if max_rating <= 10:
                df["engagement_score_base"] = (rating_vals * 10).clip(20, 95)
            else:
                df["engagement_score_base"] = rating_vals.clip(20, 95)
        else:
            df["engagement_score_base"] = np.random.uniform(40, 90, len(df))
    else:
        df["engagement_score_base"] = np.random.uniform(40, 90, len(df))

    df["release_year"] = pd.to_numeric(df["release_year"], errors="coerce")
    df = df.dropna(subset=["release_year"])
    df["release_year"] = df["release_year"].astype(int)

    df = df[["title", "type", "release_year", "primary_genre", "views_7d_base", "engagement_score_base"]]
    return df

def expand_regions(df):
    rows = []
    for _, r in df.iterrows():
        for region, multiplier in REGIONS:
            views_7d = int(r["views_7d_base"] * multiplier * np.random.uniform(0.85, 1.20))
            views_28d = int(views_7d * np.random.uniform(1.4, 2.3))
            engagement_score = float(np.clip(r["engagement_score_base"] * multiplier * np.random.uniform(0.9, 1.1), 20, 95))
            retention_28d = float(np.clip(np.random.uniform(0.22, 0.68), 0.1, 0.75))

            rows.append({
                "title_id": f'{r["title"].replace(" ", "_")}_{r["release_year"]}_{region}',
                "title": r["title"],
                "type": r["type"],
                "release_year": r["release_year"],
                "primary_genre": r["primary_genre"],
                "region": region,
                "views_7d": views_7d,
                "views_28d": views_28d,
                "engagement_score": round(engagement_score, 1),
                "retention_28d": round(retention_28d, 2),
            })
    return pd.DataFrame(rows)

def main():
    if not MOVIES_PATH.exists():
        raise FileNotFoundError(f"Missing file: {MOVIES_PATH}")
    if not TV_PATH.exists():
        raise FileNotFoundError(f"Missing file: {TV_PATH}")

    movies = clean_one_file(MOVIES_PATH, "Movie")
    tv = clean_one_file(TV_PATH, "TV Show")

    combined = pd.concat([movies, tv], ignore_index=True)
    final_df = expand_regions(combined)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(OUT_PATH, index=False)

    print(f"Saved cleaned Kaggle dataset to {OUT_PATH}")
    print(f"Rows: {len(final_df)}")
    print(final_df.head())

if __name__ == "__main__":
    main()