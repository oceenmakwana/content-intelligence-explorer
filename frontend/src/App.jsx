import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const API = "http://localhost:4000";

function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: "180px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "18px",
        background: "#fff",
        marginBottom: "20px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "14px" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function App() {
  const [region, setRegion] = useState("US");
  const [activeTab, setActiveTab] = useState("overview");

  const [overviewData, setOverviewData] = useState(null);
  const [genreData, setGenreData] = useState([]);
  const [titleData, setTitleData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/api/overview`, { params: { region } })
      .then((res) => setOverviewData(res.data))
      .catch((err) => console.error("Overview error:", err));

    axios
      .get(`${API}/api/genres`, { params: { region } })
      .then((res) => setGenreData(res.data.rows))
      .catch((err) => console.error("Genres error:", err));

    axios
      .get(`${API}/api/titles`, { params: { region } })
      .then((res) => setTitleData(res.data.rows))
      .catch((err) => console.error("Titles error:", err));
  }, [region]);

  const trend = useMemo(() => overviewData?.trend || [], [overviewData]);

  const filteredTitles = useMemo(() => {
    return titleData.filter((title) =>
      title.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [titleData, searchTerm]);

  const selectedTitle = filteredTitles[0] || null;

  const navButtonStyle = (tab) => ({
    padding: "10px 16px",
    borderRadius: "999px",
    border: activeTab === tab ? "1px solid #111827" : "1px solid #d1d5db",
    background: activeTab === tab ? "#111827" : "#fff",
    color: activeTab === tab ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 600,
  });

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "8px", fontWeight: 800, color: "#111827" }}>Content Intelligence Explorer</h1>
        <p style={{ color: "#6b7280",
          fontSize: "14px", marginTop: 0 }}>
          Full-stack interactive dashboard for exploring simulated content
          engagement trends across regions, genres, and titles.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button style={navButtonStyle("overview")} onClick={() => setActiveTab("overview")}>
            Overview
          </button>
          <button style={navButtonStyle("genres")} onClick={() => setActiveTab("genres")}>
            Genres
          </button>
          <button style={navButtonStyle("titles")} onClick={() => setActiveTab("titles")}>
            Titles
          </button>
        </div>

        <div>
          <label>
            <strong>Region: </strong>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                marginLeft: "8px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            >
              <option value="US">US</option>
              <option value="IN">IN</option>
              <option value="EU">EU</option>
              <option value="LATAM">LATAM</option>
            </select>
          </label>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {overviewData && (
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <StatCard label="Total Titles" value={overviewData.kpis.total_titles} />
              <StatCard label="Avg Engagement" value={overviewData.kpis.avg_engagement} />
              <StatCard label="Top Genre" value={overviewData.kpis.top_genre} />
            </div>
          )}

          <SectionCard title="Engagement Trend by Release Year">
            {!overviewData ? (
              <p>Loading...</p>
            ) : (
              <div style={{ width: "100%", height: "360px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#111827"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Insight">
            <p style={{ margin: 0, color: "#4b5563" }}>
              This view summarizes how modeled engagement changes across release years
              for the selected region. It is designed to help users quickly identify
              periods of stronger content performance and broad shifts in audience interest.
            </p>
          </SectionCard>
        </>
      )}

      {activeTab === "genres" && (
        <>
          <SectionCard title="Average Engagement by Genre">
            {genreData.length === 0 ? (
              <p>Loading...</p>
            ) : (
              <div style={{ width: "100%", height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="genre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="engagement" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Design Rationale">
            <p style={{ margin: 0, color: "#4b5563" }}>
              A bar chart was used here because genre comparison is a ranking task.
              This makes it easier to compare engagement levels across categories at a glance.
            </p>
          </SectionCard>
        </>
      )}

      {activeTab === "titles" && (
        <>
          <SectionCard title="Title Explorer">
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="Search for a title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "420px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            {selectedTitle ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <StatCard label="Title" value={selectedTitle.title} />
                <StatCard label="Type" value={selectedTitle.type} />
                <StatCard label="Release Year" value={selectedTitle.release_year} />
                <StatCard label="Genre" value={selectedTitle.primary_genre} />
                <StatCard label="Engagement Score" value={selectedTitle.engagement_score} />
                <StatCard label="Retention 28d" value={selectedTitle.retention_28d} />
              </div>
            ) : (
              <p>No matching titles found.</p>
            )}
          </SectionCard>

          <SectionCard title="Explorer Purpose">
            <p style={{ margin: 0, color: "#4b5563" }}>
              This section helps users inspect a title-level view of performance.
              It prioritizes direct lookup and clear summary metrics over visual complexity.
            </p>
          </SectionCard>
        </>
      )}

      <p style={{ marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
        Note: All engagement and retention metrics are simulated for demonstration purposes.
      </p>
    </div>
  );
}