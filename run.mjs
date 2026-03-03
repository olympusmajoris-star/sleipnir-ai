import fs from "node:fs";
import { odinScan } from "./index.mjs";

function toBase64(path) {
  const buf = fs.readFileSync(path);
  return buf.toString("base64");
}

const imgPath = process.argv[2] || "test.jpg.png";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  while (true) {
    try {
      console.log("Using image:", imgPath);
      const imageBase64 = toBase64(imgPath);
      const result = await odinScan({ imageBase64 });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (e) {
      const msg = String(e?.message || e);
      const retry = msg.match(/retryDelay['"]:\s*['"](\d+)s['"]/i);
      if (retry) {
        const seconds = Number(retry[1]);
        console.log(`RATE LIMITED — waiting ${seconds}s then retrying...`);
        await sleep((seconds + 1) * 1000);
        continue;
      }
      console.log("ERROR:", msg);
      process.exit(1);
    }
  }
}

main();