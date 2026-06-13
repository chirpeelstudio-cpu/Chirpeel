import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../public/demos");
fs.mkdirSync(OUT_DIR, { recursive: true });

const IDS = ["pipeline", "quotation", "projects", "vendors", "finance", "clientportal"];

console.log("Bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});
console.log("Bundle ready");

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const id of IDS) {
  console.log(`→ ${id}`);
  const composition = await selectComposition({ serveUrl: bundled, id, puppeteerInstance: browser });

  // Poster (frame 60 — mid-action)
  await renderStill({
    composition, serveUrl: bundled, puppeteerInstance: browser,
    output: path.join(OUT_DIR, `${id}.jpg`),
    frame: 60, imageFormat: "jpeg", jpegQuality: 80,
  });

  // MP4
  await renderMedia({
    composition, serveUrl: bundled, codec: "h264",
    outputLocation: path.join(OUT_DIR, `${id}.mp4`),
    puppeteerInstance: browser, muted: true, concurrency: 1,
    crf: 28,
  });
  console.log(`✓ ${id}`);
}

await browser.close({ silent: false });
console.log("All demos rendered to", OUT_DIR);
