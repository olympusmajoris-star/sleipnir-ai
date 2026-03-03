import express from "express";
import multer from "multer";
import { odinScan } from "./index.mjs";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.type("text").send("OdinScan server running ✅");
});

app.post("/scan", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name: image" });
    }

    const imageBase64 = req.file.buffer.toString("base64");
    const result = await odinScan({ imageBase64 });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OdinScan server listening on http://localhost:${PORT}`);
});