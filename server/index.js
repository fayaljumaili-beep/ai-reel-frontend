import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 🚨 THIS MUST BE BEFORE ANY ROUTES
app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
     console.log("API KEY:", process.env.PEXELS_API_KEY);

    if (!process.env.PEXELS_API_KEY) {
      console.log("❌ NO API KEY");
      return res.status(500).json({ error: "Missing API key" });
    }

    const { prompt } = req.body;

    console.log("Prompt:", prompt);

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Pexels API failed:", response.status);
      return res.status(500).json({
        error: "Pexels API failed",
      });
    }

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      return res.json({
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      });
    }

    const videoFiles = data.videos[0].video_files;

    const videoUrl = videoFiles[0].link;

    return res.json({ videoUrl });

  } catch (err) {
    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server crashed",
    });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});