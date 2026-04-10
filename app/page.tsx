"use client";

import { useState } from "react";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("Motivational");
  const [template, setTemplate] = useState("Rich Mindset");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            voice,
            template,
          }),
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Frontend error:", error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px", maxWidth: "700px" }}>
      <h1>🎬 AI Reel Studio</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter your topic"
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      />

      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        style={{ padding: "10px", marginBottom: "20px", display: "block" }}
      >
        <option>Motivational</option>
        <option>Luxury</option>
        <option>Storytelling</option>
      </select>

      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        style={{ padding: "10px", marginBottom: "20px", display: "block" }}
      >
        <option>Rich Mindset</option>
        <option>Success Story</option>
        <option>Faceless CTA</option>
      </select>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: "12px 20px",
          cursor: "pointer",
        }}
      >
        {loading ? "Generating..." : "✨ Generate Reel"}
      </button>

      {result && (
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            whiteSpace: "pre-wrap",
          }}
        >
          <h2>🎬 Generated Reel Script</h2>
          <p>{result.script}</p>
        </div>
      )}
    </main>
  );
}
