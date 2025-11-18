import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("WARNING: ANTHROPIC_API_KEY not set. /api/analyze-plans will fail until you add it to .env");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = "claude-3-5-sonnet-2024-10-22";

const SYSTEM_PROMPT = `You are an expert architectural plan reader. You will receive up to several architectural plan images (ground, first floor, civils, specification).
Task: Extract measurements and produce STRICT JSON only (no prose, no markdown).
Rules:
- Output ONLY valid JSON matching the schema provided.
- Units: convert mm or cm to meters (divide by 1000 or 100 respectively).
- Prefer dimension annotations over scale inference.
- If scale (e.g. 1:100) is visible, you may use it, but do NOT invent dimensions.
- If no scale and few/no annotations: list assumptions and reduce confidence.
- Windows & doors: include dimensions if annotated; otherwise set null and add assumption.
- Orientations: Front/Back/Left/Right if determinable; else "Unknown".
- Glazing types: choose among Double Glazed, Low E Double Glazed, Triple Glazed if explicitly indicated; else "Unknown".
- Use null for missing numeric data.
- Confidence fields are numbers 0..1.

Schema:
{
  "scale": {"text": string, "confidence": number},
  "metrics": {
    "floor_area_m2": number|null,
    "wall_area_m2": number|null,
    "roof_area_m2": number|null,
    "ceiling_height_m": number|null
  },
  "rooms": [
    {
      "name": string,
      "level": "ground"|"first"|"second"|"unknown",
      "length_m": number|null,
      "width_m": number|null,
      "area_m2": number|null
    }
  ],
  "windows": [
    {
      "orientation": "Front"|"Back"|"Left"|"Right"|"Unknown",
      "width_m": number|null,
      "height_m": number|null,
      "type": "Double Glazed"|"Low E Double Glazed"|"Triple Glazed"|"Unknown"
    }
  ],
  "doors": [
    {
      "location": string,
      "type": string,
      "width_m": number|null,
      "height_m": number|null
    }
  ],
  "assumptions": string[],
  "confidence": number
}
Return ONLY that JSON. Do not wrap in markdown fences.`.trim();

app.post("/api/analyze-plans", async (req, res) => {
  try {
    const { images = [], projectType = "" } = req.body || {};
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ ok: false, error: "No images provided" });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ ok: false, error: "Server misconfiguration: missing ANTHROPIC_API_KEY" });
    }

    const imageBlocks = images.slice(0, 6).map(img => ({
      type: "input_image",
      source: {
        type: "base64",
        media_type: img.media_type || "image/png",
        data: img.data
      }
    }));

    const userInstruction = [
      "Extract metrics and objects from these architectural plan images.",
      projectType ? `Project type: ${projectType}` : "",
      "Return STRICT JSON only."
    ].filter(Boolean).join("\n");

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userInstruction },
            ...imageBlocks
          ]
        }
      ]
    });

    const textBlock = response.content.find(c => c.type === "text");
    if (!textBlock || !textBlock.text) {
      return res.status(502).json({ ok: false, error: "Empty response from Claude" });
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (e) {
      const match = textBlock.text.match(/\{[\s\S]*\}$/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse JSON from Claude response");
      }
    }

    return res.json({ ok: true, result: parsed });
  } catch (err) {
    console.error("Error in /api/analyze-plans:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Plan analyzer backend running at http://localhost:${PORT}`);
});
