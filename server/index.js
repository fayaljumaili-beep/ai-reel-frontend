import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
// --------------------------------------------------
// ✅ VOICEOVER ROUTE (FULL SAFE WRITE VERSION)
// --------------------------------------------------
// Replace your existing /voiceover route body with this pattern
app.post("/voiceover", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    // Replace this with your real TTS provider request
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: script }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // ✅ CRITICAL FIX: fully await disk write
    await fsp.writeFile("voice.mp3", audioBuffer);

    const stats = await fsp.stat("voice.mp3");
    console.log("VOICE SIZE:", stats.size);

    if (stats.size === 0) {
      throw new Error("voice.mp3 was saved empty");
    }

    res.json({ success: true, size: stats.size });
  } catch (error) {
    console.error("VOICEOVER ERROR:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

// --------------------------------------------------
// ✅ GENERATE VIDEO ROUTE (FULL VALIDATION VERSION)
// --------------------------------------------------
// Replace your existing /generate-video route with this safer version
app.post("/generate-video", async (req, res) => {
  try {
    const videoPath = path.resolve("sample.mp4");
    const voicePath = path.resolve("voice.mp3");
    const outputPath = path.resolve("final-reel.mp4");

    // ✅ Validate required files exist
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Missing sample video: ${videoPath}`);
    }

    if (!fs.existsSync(voicePath)) {
      throw new Error(`Missing voice file: ${voicePath}`);
    }

    const voiceStats = await fsp.stat(voicePath);
    console.log("MP3 SIZE:", voiceStats.size);

    // ✅ FINAL RUNTIME FIX: catch empty MP3s before ffmpeg
    if (voiceStats.size === 0) {
      throw new Error("voice.mp3 is empty");
    }

    ffmpeg(videoPath)
      .input(voicePath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-c:v copy",
        "-c:a aac",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", async () => {
        const videoBuffer = await fsp.readFile(outputPath);

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="viral-reel.mp4"'
        );

        res.end(videoBuffer);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err.message);
        res.status(500).send("Video generation failed");
      });
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    res.status(500).send("Video generation failed");
  }
});