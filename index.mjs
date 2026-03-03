import { genkit } from "genkit";
import { googleAI, gemini25FlashLite } from "@genkit-ai/googleai";
import { z } from "zod";

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: gemini25FlashLite,
});

export const odinScan = ai.defineFlow(
  {
    name: "odinScan",
    inputSchema: z.object({
      imageBase64: z.string(), // base64 only (no data: prefix)
    }),
    outputSchema: z.object({
      title: z.string(),
      brand: z.string().optional(),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
    }),
  },
  async ({ imageBase64 }) => {
    const prompt = `
Identify the product in the image.
Return ONLY valid JSON:
{"title":"...","brand":"...","confidence":0.0,"keywords":["..."]}
If unsure about brand, use empty string.
`.trim();

    const res = await ai.generate({
      prompt,
      media: [
        {
          contentType: "image/png",
          url: `data:image/png;base64,${imageBase64}`,
        },
      ],
      output: { format: "json" },
    });

    return res.output;
  }
);

console.log("odinScan flow loaded ✅");