import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const port = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).send("Prompt required");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a viral faceless reel script about: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    res.send(script);
  } catch (error) {
    console.error("Generate route error:", error);
    res.status(500).send("Script generation failed");
  }
});

app.post("/generate-voice", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "script required" });
    }

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = "/app/voiceover.mp3";

    fs.writeFileSync(audioPath, audioBuffer);

    res.json({ success: true, audioPath });
  } catch (error) {
    console.error("Voice route error:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const audioPath = "/app/voiceover.mp3";
    const templatePath = "/app/template.mp4";
    const outputPath = "/app/viral-reel.mp4";

    // 1-second tiny black vertical MP4 template (base64)
    const tinyMp4Base64 =
      "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAGMbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAA5F0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAQAAAAEAAAAAAACQZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAEAAABAAAAAAJpbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAAMgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACQW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAgFzdGJsAAAAxXN0c2QAAAAAAAAAAQAAAKVhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAQABAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAADNhdmNDAWQACv/hABlnZAAKrNlA8D0A8A8AAAMAAQAAAwAyDxgxlgEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAAxYnRydAAAAAAAABOIAAAAE4gAAAAYc3R0cwAAAAAAAAABAAAAAQAAAgAAAAAUc3RzcwAAAAAAAAABAAAAAQAAABRzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAAAAAAAAQAAABRzdGNvAAAAAAAAAAEAAAAoAAAAIHN0c3MAAAAAAAAAAQAAAAE=";

    fs.writeFileSync(templatePath, Buffer.from(tinyMp4Base64, "base64"));

    ffmpeg()
      .input(templatePath)
      .input(audioPath)
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        "-shortest",
        "-movflags +faststart",
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ ZERO-ENCODE MP4 READY");
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("MUX ERROR:", err);
        res.status(500).send("Video generation failed");
      });
  } catch (error) {
    console.error("Video route crash:", error);
    res.status(500).send("Video generation failed");
  }
});
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
