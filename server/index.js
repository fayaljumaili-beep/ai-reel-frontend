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
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 🎬 1. Fetch videos from Pexels
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=10`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      return res.json({
        videos: [],
        captions: [],
      });
    }

    // 🎥 2. Extract clean playable videos
    const videos = data.videos
      .map(v => {
        const file = v.video_files.find(f => f.quality === "sd");
        return file?.link;
      })
      .filter(Boolean)
      .slice(0, 3);

    console.log("VIDEOS:", videos);

    // 🧠 3. Generate AI captions
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
              content: `Write ${videos.length} short cinematic captions for videos about: "${prompt}". Return ONLY a JSON array of strings.`,
            },
          ],
        }),
      });

      const captionData = await captionRes.json();

      const raw = captionData.choices?.[0]?.message?.content;

      try {
        captions = JSON.parse(raw);
      } catch {
        console.warn("Caption parse failed, using fallback");
        captions = videos.map((_, i) => `${prompt} clip ${i + 1} 🔥`);
      }

    } catch (err) {
      console.error("OpenAI error:", err);
      captions = videos.map((_, i) => `${prompt} clip ${i + 1} 🔥`);
    }

    // ✅ Final response
    res.json({
      videos,
      captions,
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server crashed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});