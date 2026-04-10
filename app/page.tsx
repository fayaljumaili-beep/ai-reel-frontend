"use client";

import { useState } from "react";

const API_URL = "https://ai-reel-studio-frontend-production.up.railway.app";

type ReelResult = {
  success?: boolean;
  script: string;
  topic?: string;
  voice?: string;
  template?: string;
};

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("Motivational");
  const [template, setTemplate] = useState("Rich Mindset");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReelResult | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          voice,
          template,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!result?.script) {
      alert("Generate a script first");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: result.script,
        }),
      });

      if (!response.ok) {
        throw new Error("Video generation failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Video generation failed");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 60%, #000000 100%)",
        color: "white",
        padding: "60px 24px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <h1
            style={{
              fontSize: "clamp(3rem, 8vw, 6rem)",
              lineHeight: 1,
              fontWeight: 800,
              marginBottom: "20px",
            }}
          >
            Create Viral Faceless Reel Scripts in 5 Seconds
          </h1>
          <p
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              fontSize: "1.5rem",
              opacity: 0.9,
            }}
          >
            Generate scroll-stopping hooks, engaging body scripts, and now export
            them as downloadable MP4 reels.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "30px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: "30px",
              backdropFilter: "blur(12px)",
            }}
          >
            <h2 style={{ fontSize: "2rem", marginBottom: "24px" }}>
              🎬 Generate Your Next Viral Script
            </h2>

            <label>Reel topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="How does discipline create wealth?"
              style={{
                width: "100%",
                marginTop: "10px",
                marginBottom: "20px",
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
              }}
            />

            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div style={{ flex: 1 }}>
                <label>Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option>Motivational</option>
                  <option>Luxury</option>
                  <option>Storytelling</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label>Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option>Rich Mindset</option>
                  <option>Faceless Story</option>
                  <option>Hard Truth</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background: "linear-gradient(135deg, #9333ea, #2563eb)",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              {loading ? "Generating..." : "✨ Generate Premium Reel Script"}
            </button>

            {result?.script && (
              <button
                onClick={handleGenerateVideo}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "18px",
                  borderRadius: "16px",
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  cursor: "pointer",
                }}
              >
                🎥 Download Reel Video
              </button>
            )}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: "30px",
              minHeight: "420px",
            }}
          >
            <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>
              🏆 Why creators will pay
            </h2>
            <ul style={{ lineHeight: 2, fontSize: "1.2rem", opacity: 0.95 }}>
              <li>✅ Viral hooks optimized for retention</li>
              <li>✅ CTA engineered for follows + sales</li>
              <li>✅ Instant script + video workflow</li>
              <li>✅ Perfect for TikTok, Reels, Shorts</li>
            </ul>
          </div>
        </div>

        {result?.script && (
          <div
            style={{
              marginTop: "40px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: "32px",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: "1.15rem",
            }}
          >
            <h2 style={{ fontSize: "2rem", marginBottom: "18px" }}>
              🎬 Generated Reel Script
            </h2>
            {result.script}
          </div>
        )}
      </div>
    </main>
  );
}
