import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ✅ FIXED CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🎬 Request:", prompt);

    // -------------------------
    // 1. FAKE CLIP DOWNLOAD (replace later with real API)
    // -------------------------
    console.log("📥 Preparing clips...");

    const clips = [
      "assets/video1.mp4",
      "assets/video2.mp4",
      "assets/video3.mp4",
    ];

    // -------------------------
    // 2. GENERATE VOICE (mock for now)
    // -------------------------
    console.log("🎤 Generating voice...");

    fs.writeFileSync("voice.mp3", ""); // placeholder

    // -------------------------
    // 3. GENERATE PRO CAPTIONS
    // -------------------------
    console.log("🧠 Generating captions...");

    generateCaptions(prompt);

    // -------------------------
    // 4. CREATE FILE LIST
    // -------------------------
    const fileList = clips.map((c) => `file '${c}'`).join("\n");
    fs.writeFileSync("list.txt", fileList);

    // -------------------------
    // 5. STITCH VIDEO (SAFE)
    // -------------------------
    console.log("🎞️ Stitching clips...");

    await runCommand(
      `ffmpeg -y -f concat -safe 0 -i list.txt -c copy temp.mp4`
    );

    // -------------------------
    // 6. ADD AUDIO + CAPTIONS
    // -------------------------
    console.log("🎬 Final render...");

    await runCommand(`
      ffmpeg -y -i temp.mp4 -i voice.mp3 
      -vf "subtitles=captions.srt:force_style='Fontsize=36,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Shadow=1,Alignment=2'" 
      -c:v libx264 -c:a aac -shortest output.mp4
    `);

    console.log("✅ DONE");

    const video = fs.readFileSync("output.mp4");
    res.setHeader("Content-Type", "video/mp4");
    res.send(video);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send("Video generation failed");
  }
});

// -------------------------
// PRO CAPTIONS (WORD HIGHLIGHT)
// -------------------------
function generateCaptions(text) {
  const words = text.split(" ");

  let srt = "";
  let time = 0;

  words.forEach((word, i) => {
    const start = time;
    const end = time + 0.5;

    const format = (t) =>
      `00:00:${String(t.toFixed(2)).padStart(5, "0").replace(".", ",")}`;

    const line = words
      .map((w, idx) =>
        idx === i ? `{\\b1\\c&H00FFFF&}${w}{\\b0}` : w
      )
      .join(" ");

    srt += `${i + 1}\n${format(start)} --> ${format(end)}\n${line}\n\n`;

    time += 0.5;
  });

  fs.writeFileSync("captions.srt", srt);
}

// -------------------------
// SAFE COMMAND RUNNER
// -------------------------
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// -------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});