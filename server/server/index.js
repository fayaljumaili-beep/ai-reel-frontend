process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED PROMISE:", err);
});

import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Server works");
});

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 route hit");

    res.json({
  videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
});

  } catch (err) {
    console.error("🔥 ROUTE ERROR:", err);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Running on port", PORT);
});