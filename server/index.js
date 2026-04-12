import express from "express";

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = "/app/voiceover.mp3";
    fs.writeFileSync(audioPath, audioBuffer);

    res.json({
      success: true,
      audioUrl: "/voiceover.mp3",
      audioPath,
      bytes: audioBuffer.length,
    });
  } catch (error) {
    console.error("Voice route error:", error);
    res.status(500).json({ error: "Voice generation failed", details: error.message });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const { script = "", captionText } = req.body;

    const audioPath = "/app/voiceover.mp3";
    const outputPath = "/app/final-reel.mp4";
    const safeCaption = escapeDrawtext(captionText || script.split("\n")[0] || "Success starts now");

    console.log("🎵 audio path:", audioPath);
    console.log("📦 output path:", outputPath);

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ error: "Voice file missing. Generate voice first." });
    }

    ffmpeg()
      .input("color=c=black:s=1080x1920:d=6")
      .inputFormat("lavfi")
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-shortest",
        `-vf drawtext=fontcolor=white:fontsize=42:text='${safeCaption}':x=(w-text_w)/2:y=h-220`,
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ video generated");
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("❌ FFMPEG ERROR:", err.message);
        res.status(500).json({ error: "Video generation failed", details: err.message });
      });
  } catch (error) {
    console.error("Video route crash:", error);
    res.status(500).json({ error: "Video generation failed", details: error.message });
  }
});

app.get("/voiceover.mp3", (req, res) => {
  const audioPath = "/app/voiceover.mp3";
  if (!fs.existsSync(audioPath)) {
    return res.status(404).send("Missing voice file");
  }
  res.sendFile(audioPath);
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});