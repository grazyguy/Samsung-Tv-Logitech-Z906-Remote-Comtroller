import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "300kb" }));
app.use(express.static(__dirname));

/* =========================
   STATUS
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: !!process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || "gpt-5.6"
  });
});

/* =========================
   AI DJ
========================= */

app.post("/api/ai-dj", async (req, res) => {

  try {

    const data = req.body;

    const systemPrompt = `
Du bist der AI-DJ einer privaten DJ-App.

Deine Aufgabe:
Plane professionelle DJ-Übergänge.

Du entscheidest über:

- BPM
- Tempo
- Pitch
- Key
- EQ
- Bass-Swap
- Gain
- Filter
- FX
- Loops
- Build-ups
- Drops
- Übergangslänge
- Energie
- nächsten Song

Wichtig:

Du verarbeitest NICHT selbst das Audiosignal.
Du erstellst einen präzisen Plan für die DJ-Engine.

Regeln:

1. Keine extremen BPM-Änderungen ohne guten Grund.
2. Gain so wählen, dass Clipping vermieden wird.
3. Beim Bass-Swap zuerst Bass des alten Decks reduzieren.
4. Danach Bass des neuen Decks übernehmen lassen.
5. Bei Vocal Protection Vocals möglichst sauber lassen.
6. Key Shift nur durchführen, wenn Key Auto aktiviert ist.
7. Übergänge können 4, 8, 16 oder 32 Beats lang sein.
8. Energie soll sich sinnvoll entwickeln.
9. Bei Auto-DJ den nächsten passenden Song aus der Queue auswählen.
10. Antworte ausschließlich mit gültigem JSON.
`;

    const response = await openai.responses.create({

      model: process.env.AI_MODEL || "gpt-5.6",

      store: false,

      input: [
        {
          role: "developer",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(data)
        }
      ]

    });

    const text = response.output_text;

    let plan;

    try {
      plan = JSON.parse(text);
    } catch {
      plan = {
        explanation: text
      };
    }

    res.json({
      ok: true,
      plan
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: error.message
    });

  }

});

/* =========================
   START
========================= */

app.listen(PORT, () => {

  console.log(
    `Smart Remote AI DJ läuft auf http://localhost:${PORT}`
  );

});