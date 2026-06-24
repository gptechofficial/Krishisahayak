const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3001;
app.get("/", (req, res) => {
  res.json({ status: "KrishiSahayak API running" });
});
app.post("/api/chat", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }
  const { messages, system, max_tokens = 1000 } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens,
        system,
        messages,
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to reach Anthropic API" });
  }
});
app.listen(PORT, () => {
  console.log("KrishiSahayak proxy running on port " + PORT);
});
