import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
const python = path.resolve(
  "backend/.venv/" +
    (process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
);
if (!existsSync(python)) {
  console.error(
    "Önce backend içinde uv sync çalıştırın. README kurulum adımlarına bakın.",
  );
  process.exit(1);
}
const children = [];
const start = (cmd, args, cwd = process.cwd()) => {
  const child = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, EMA_NODE_BINARY: process.execPath },
  });
  children.push(child);
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`Servis kapandı (${code}).`);
      stop(code || 1);
    }
  });
};
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 3000);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
start(
  python,
  [
    "-m",
    "uvicorn",
    "app:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8010",
    "--no-access-log",
  ],
  path.resolve("backend"),
);
start(process.execPath, [
  "node_modules/next/dist/bin/next",
  "dev",
  "--hostname",
  "127.0.0.1",
  "--port",
  "3000",
]);
