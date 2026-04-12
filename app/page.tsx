"use client";

import { useState } from "react";

const BACKEND_URL =
  "https://ai-reel-studio-frontend-production.up.railway.app";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");

  const generateScript = async () => {
    const res = await fetch(`${BACKEND_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setScript(data.script || "");
  };

  const generateVoice = async () => {
    const res = await fetch(`${BACKEND_URL}/voiceover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
      }),
    });

    const data = await res.json();
    setVoiceUrl(data.audioUrl || "");
  };

  const downloadReel = async () => {
    console.log("SENDING:", {
      prompt,
      audioUrl: voiceUrl,
    });

    const res = await fetch(`${BACKEND_URL}/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        audioUrl: voiceUrl,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("VIDEO ERROR:", text);
      alert(text);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-reel.mp4";
    a.click();
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Faceless Reel Scripts in 5 Seconds</h1>

      <p>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={generateScript}>
          ✨ Generate Premium Reel Script
        </button>

        <button onClick={generateVoice}>
          🎙 Generate AI Voiceover
        </button>

        <button onClick={downloadReel}>
          🎬 Download Narrated Reel
        </button>
      </div>

      <h2 style={{ marginTop: 30 }}>Generated Output</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{script}</pre>

      {voiceUrl && (
        <div style={{ marginTop: 20 }}>
          <audio controls src={voiceUrl} />
        </div>
      )}
    </main>
  );
}