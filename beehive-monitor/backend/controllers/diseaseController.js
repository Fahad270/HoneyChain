// Disease detection via Claude's vision API. This is intentionally an
// API-based approach (not a custom-trained CNN) — the honest, fast path
// for a hackathon: no labeled dataset needed, works from day one.
// Swap the model string / provider here later if you train your own model.

const DIAGNOSIS_PROMPT = `You are assisting a beekeeper in India with a photo of their bee hive, frame, or bees.
Look for visible signs of common hive diseases and pests: varroa mites, chalkbrood,
American/European foulbrood, wax moth damage, nosema, or sacbrood.

Respond ONLY as compact JSON, no markdown fences, in this exact shape:
{
  "likelyCondition": "string, e.g. 'Possible chalkbrood' or 'No visible disease signs'",
  "confidence": "low" | "medium" | "high",
  "visualEvidence": "one or two sentences describing what in the image supports this",
  "recommendedAction": "one or two sentences of practical next steps for the beekeeper"
}
If the image is unclear or not a hive/bee photo, say so honestly in likelyCondition with confidence "low".`;

async function detectDisease(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image uploaded" });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "ANTHROPIC_API_KEY is not set in backend/.env",
      });
    }

    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype || "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
              { type: "text", text: DIAGNOSIS_PROMPT },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ success: false, error: data?.error?.message || "Claude API error" });
    }

    const textBlock = data.content?.find((b) => b.type === "text")?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(textBlock.replace(/```json|```/g, "").trim());
    } catch {
      parsed = {
        likelyCondition: "Could not parse model response",
        confidence: "low",
        visualEvidence: textBlock,
        recommendedAction: "Try again with a clearer, well-lit photo.",
      };
    }

    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { detectDisease };
