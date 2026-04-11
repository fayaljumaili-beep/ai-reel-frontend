"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const API = "https://ai-reel-studio-frontend-production.up.railway.app/";

  async function generateScript() {
    const res = await fetch(`${API}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic }),
    });

    const data = await res.json();

    setScript(data.script || "");
  }

  async function generateVoice() {
    const textToSpeak =
      script ||
      "This is your AI generated faceless reel about success and mindset.";

    const res = await fetch(`${API}/generate-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: textToSpeak,
      }),
    });

    const data = await res.json();

    if (data.audioUrl) {
      setAudioUrl(data.audioUrl);
    }
  }

  async function downloadVideo() {
    const res = await fetch(`${API}/generate-video`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Video generation failed");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "viral-reel.mp4";
    a.click();
  }

  return (
    <main style={{ padding: "40px", fontFamily: "serif" }}>
      <h1>Faceless Reel Scripts in 5 Seconds</h1>
      <p>LIVE SAAS MODE 🚀</p>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="type topic"
      />

      <br />
      <br />

      <button onClick={generateScript}>
        ✨ Generate Premium Reel Script
      </button>

      <button onClick={generateVoice} style={{ marginLeft: 10 }}>
        🎙 Generate AI Voiceover
      </button>

      <button onClick={downloadVideo} style={{ marginLeft: 10 }}>
        🎬 Download Narrated Reel Video
      </button>

      <h2 style={{ marginTop: 40 }}>Generated Output</h2>

      <pre style={{ whiteSpace: "pre-wrap" }}>{script}</pre>

      {audioUrl && (
        <>
          <audio controls src={audioUrl} />
          <br />
          <a href={audioUrl} download="voiceover.mp3">
            ⬇ Download Voiceover
          </a>
        </>
      )}
    </main>
  );
}