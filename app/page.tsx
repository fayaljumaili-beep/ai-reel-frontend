"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const BASE_URL = "https://ai-reel-studio-frontend-production.up.railway.app/";

  // 1️⃣ GENERATE SCRIPT
  const handleScript = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      setScript(data.script);
    } catch (err) {
      console.error(err);
      alert("Script failed");
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ GENERATE VOICE
 const handleVoice = async () => {
  try {
    setLoading(true);

    const res = await fetch("/api/generate-voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script }),
    });

    const url = URL.createObjectURL(await res.blob());
setAudioUrl(url);

    if (!res.ok) throw new Error("Request failed");

    const blob = await res.blob();

    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
audio.play();

const link = document.createElement("a");
link.href = url;
link.download = "voice.mp3";
link.click();

  } catch (err) {
    console.error(err);
    alert("Voice failed");
  } finally {
    setLoading(false);
  }
};

  // 3️⃣ GENERATE VIDEO
  const handleVideo = async () => {
  try {
    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audioUrl }),
    });

    const data = await res.json();

    if (!data.videoUrl) throw new Error("No video");

    window.open(data.videoUrl);
  } catch (err) {
    console.error(err);
    alert("Video failed");
  }
};

  return (
    <main style={{ padding: 40, maxWidth: 600, margin: "auto" }}>
      <h1>🎬 AI Reel Generator</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic..."
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleScript}>
        {loading ? "Loading..." : "✨ Generate Script"}
      </button>

     <button onClick={handleVideo}>
  🎬 Generate Video
</button>

      <button onClick={handleVideo} style={{ marginLeft: 10 }}>
        🎬 Download Video
      </button>

      <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        {script}
      </pre>
    </main>
  );
}