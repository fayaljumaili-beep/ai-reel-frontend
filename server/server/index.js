process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED PROMISE:", err);
});

import express from "express";
import cors from "cors";

const app = express();

// 🔥 IMPORTANT: allow all origins properly
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ handle preflight explicitly
app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  console.log("🔥 route hit");

  res.json({
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port", PORT);
});