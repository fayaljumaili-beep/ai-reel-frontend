const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate", (req, res) => {
  const { topic, voice, template } = req.body;

  const script = `Hook: Want to know ${topic}?

Main:
Here are 3 mindset shifts used by highly successful people.
1. Stay disciplined
2. Think long term
3. Execute daily

CTA:
Follow for more ${template} content.`;

  res.json({
    success: true,
    script,
    topic,
    voice,
    template,
  });
});

app.post("/generate-video", async (req, res) => {
  try {
    const outputPath = "/tmp/viral-reel.mp4";

    const cmd = `ffmpeg -y -f lavfi -i color=c=black:s=1080x1920:d=8 -pix_fmt yuv420p ${outputPath}`;

    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error("FFMPEG STDERR:", stderr);
          reject(error);
        } else {
          resolve();
        }
      });
    });

    return res.download(outputPath, "viral-reel.mp4");
  } catch (error) {
    console.error("VIDEO ROUTE ERROR:", error);
    return res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

    const cmd = `ffmpeg -y -loop 1 -i ${imagePath} -t 8 -vf "scale=1080:1920" -pix_fmt yuv420p ${outputPath}`;

    await new Promise((resolve, reject) => {
      exec(cmd, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.download(outputPath, "viral-reel.mp4");
  } catch (error) {
    console.error("VIDEO ERROR:", error);
    res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});