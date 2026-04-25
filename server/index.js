import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    // 🎬 FETCH VIDEOS
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=10`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    const videos = (data.videos || [])
      .map(v => {
        const file = v.video_files.find(f => f.quality === "sd");
        return file?.link;
      })
      .filter(Boolean)
      .slice(0, 3);

    console.log("VIDEOS:", videos);

    // 🧠 AI CAPTIONS
    let captions = [];

    try {
      const captionRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `
Create a viral short-form video script about "${prompt}".

It must have:
1. A strong hook
2. A surprising insight
3. A powerful ending

Return ONLY a JSON array of ${videos.length} short captions.
            },
          ],
        }),
      });

      const captionData = await captionRes.json();
      const raw = captionData.choices?.[0]?.message?.content;

      try {
        captions = JSON.parse(raw);
      } catch {
        captions = videos.map((_, i) => `${prompt} clip ${i + 1} 🔥`);
      }

    } catch (err) {
      console.error("AI error:", err);
      captions = videos.map((_, i) => `${prompt} clip ${i + 1} 🔥`);
    }

    res.json({ videos, captions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🎬 EXPORT (basic placeholder)
app.post("/export-reel", async (req, res) => {
  try {
    const { videos } = req.body;

    if (!videos || !videos.length) {
      return res.status(400).json({ error: "No videos" });
    }

    res.json({
      downloadUrl: videos[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});