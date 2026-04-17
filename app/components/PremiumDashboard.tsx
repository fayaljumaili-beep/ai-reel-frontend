"use client";

import { useState } from "react";

export default function PremiumDashboard() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateScript = async () => {
    try {
      setLoading(true);
      setScript("");

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
      setScript("❌ Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

 const handleVoiceover = async () => {
  try {
    if (!script) {
      alert("Generate a script first");
      return;
    }

    const res = await fetch("/api/generate-voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.play();

  } catch (err) {
    console.error(err);
    alert("❌ Voice generation failed");
  }
};

  const handleDownload = () => {
    alert("⬇️ Download coming next (we'll wire this next)");
  };

  return (
    <section className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold mb-2">AI Reel Studio</h1>
        <p className="text-zinc-400 mb-6">
          Generate viral short-form scripts instantly
        </p>

        {/* INPUT */}
        <input
          type="text"
          placeholder="Enter topic (e.g. how to become successful)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 mb-4"
        />

        {/* BUTTON ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">

          <button
            onClick={handleGenerateScript}
            className="bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition"
          >
            {loading ? "Generating..." : "Generate Script"}
          </button>

          <button
            onClick={handleVoiceover}
            className="bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-500 transition"
          >
            Generate Voiceover
          </button>

          <button
            onClick={handleDownload}
            className="bg-emerald-500 text-black font-semibold py-3 rounded-xl hover:bg-emerald-400 transition"
          >
            Download Reel
          </button>

        </div>

        {/* OUTPUT */}
        {script && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl whitespace-pre-wrap">
            {script}
          </div>
        )}

      </div>
    </section>
  );
}