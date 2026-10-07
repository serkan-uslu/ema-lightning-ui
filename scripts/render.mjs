import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  selectComposition,
  renderMedia,
  makeCancelSignal,
} from "@remotion/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [manifest, output] = process.argv.slice(2);
const inputProps = JSON.parse(await readFile(manifest, "utf8"));
const { cancel, cancelSignal } = makeCancelSignal();
let browser;
const shutdown = async () => {
  cancel();
  await browser?.close({ silent: true });
  process.exit(1);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
try {
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/remotion/index.ts"),
    outDir: path.resolve(".render-bundle"),
  });
  const chromiumOptions = { gl: "swangle" };
  browser = await openBrowser("chrome", {
    chromeMode: "chrome-for-testing",
    chromiumOptions,
  });
  const composition = await selectComposition({
    serveUrl,
    id: "Montage",
    inputProps,
    puppeteerInstance: browser,
  });
  let lastProgress = -1;
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    puppeteerInstance: browser,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: output,
    concurrency: 1,
    disableSharedMemoryCapture: true,
    cancelSignal,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100);
      if (percent !== lastProgress) {
        lastProgress = percent;
        console.log(JSON.stringify({ progress }));
      }
    },
  });
} finally {
  await browser?.close({ silent: true });
}
