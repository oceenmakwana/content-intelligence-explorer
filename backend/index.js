const express = require("express");
const cors = require("cors");
const path = require("path");
const csv = require("csvtojson");

const app = express();
app.use(cors());

const DATA_PATH = path.join(__dirname, "..", "data-processing", "output", "kaggle_cleaned.csv");

let DATA = [];

async function loadData() {
  DATA = await csv().fromFile(DATA_PATH);
  DATA = DATA.map((d) => ({
    ...d,
    release_year: Number(d.release_year),
    views_7d: Number(d.views_7d),
    views_28d: Number(d.views_28d),
    engagement_score: Number(d.engagement_score),
    retention_28d: Number(d.retention_28d),
  }));
  console.log(`Loaded ${DATA.length} rows`);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/overview", (req, res) => {
  const region = req.query.region || "US";
  const filtered = DATA.filter((d) => d.region === region);

  const totalTitles = new Set(filtered.map((d) => d.title_id)).size;

  const genreAgg = {};
  filtered.forEach((d) => {
    genreAgg[d.primary_genre] = genreAgg[d.primary_genre] || { sum: 0, n: 0 };
    genreAgg[d.primary_genre].sum += d.engagement_score;
    genreAgg[d.primary_genre].n += 1;
  });

  let topGenre = "Unknown";
  let best = -1;
  Object.entries(genreAgg).forEach(([genre, value]) => {
    const avg = value.sum / value.n;
    if (avg > best) {
      best = avg;
      topGenre = genre;
    }
  });

  const yearAgg = {};
  filtered.forEach((d) => {
    yearAgg[d.release_year] = yearAgg[d.release_year] || { sum: 0, n: 0 };
    yearAgg[d.release_year].sum += d.engagement_score;
    yearAgg[d.release_year].n += 1;
  });

  const trend = Object.entries(yearAgg)
    .map(([year, value]) => ({
      year: Number(year),
      engagement: Number((value.sum / value.n).toFixed(1)),
    }))
    .sort((a, b) => a.year - b.year);

  const avgEngagement =
    filtered.reduce((acc, d) => acc + d.engagement_score, 0) / (filtered.length || 1);

  res.json({
    region,
    kpis: {
      total_titles: totalTitles,
      avg_engagement: Number(avgEngagement.toFixed(1)),
      top_genre: topGenre,
    },
    trend,
  });
});

app.get("/api/genres", (req, res) => {
  const region = req.query.region || "US";
  const filtered = DATA.filter((d) => d.region === region);

  const agg = {};
  filtered.forEach((d) => {
    agg[d.primary_genre] = agg[d.primary_genre] || { sum: 0, n: 0 };
    agg[d.primary_genre].sum += d.engagement_score;
    agg[d.primary_genre].n += 1;
  });

  const rows = Object.entries(agg)
    .map(([genre, value]) => ({
      genre,
      engagement: Number((value.sum / value.n).toFixed(1)),
    }))
    .sort((a, b) => b.engagement - a.engagement);

  res.json({ region, rows });
});

app.get("/api/titles", (req, res) => {
  const region = req.query.region || "US";
  const filtered = DATA.filter((d) => d.region === region);

  const map = new Map();
  filtered.forEach((d) => {
    if (!map.has(d.title_id)) {
      map.set(d.title_id, {
        title_id: d.title_id,
        title: d.title,
        type: d.type,
        release_year: d.release_year,
        primary_genre: d.primary_genre,
        engagement_score: d.engagement_score,
        retention_28d: d.retention_28d,
      });
    }
  });

  res.json({ region, rows: Array.from(map.values()) });
});

const PORT = 4000;

loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
  });
});
