"use client";
  };

  const generateVoice = async () => {
    const res = await fetch("/api/voiceover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: script || prompt }),
    });
    const data = await res.json();
    const url = data.audioUrl || data.voiceUrl || data.url || "";
    setVoiceUrl(url);
  };

  const downloadReel = async () => {
    try {
      setLoading(true);

      const payload = {
        prompt,
        audioUrl: voiceUrl,
        voiceUrl,
        audio: voiceUrl,
        url: voiceUrl,
      };

      console.log("generate-video payload", payload);

      const res = await fetch("https://ai-reel-studio-frontend-production.up.railway.app/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`Video failed: ${text}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-10 max-w-4xl">
      <h1 className="text-5xl font-bold mb-6">Faceless Reel Scripts in 5 Seconds</h1>
      <p className="mb-4">LIVE SAAS MODE 🚀</p>

      <input
        className="border p-3 w-full mb-4"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="how to become successful"
      />

      <div className="flex gap-3 mb-6">
        <button onClick={generateScript} className="border px-4 py-2">✨ Generate Premium Reel Script</button>
        <button onClick={generateVoice} className="border px-4 py-2">🎙️ Generate AI Voiceover</button>
        <button onClick={downloadReel} disabled={loading} className="border px-4 py-2">
          🎬 {loading ? "Creating..." : "Download Narrated Reel"}
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-3">Generated Output</h2>
      <pre className="whitespace-pre-wrap text-sm">{script}</pre>
    </main>
  );
}
