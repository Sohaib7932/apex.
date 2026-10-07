// Starts the FastAPI backend (port 8000) and the Next.js frontend (port 3000) together.
// Usage, from the repo root:  npm run dev        Stop both with Ctrl+C.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const backend = join(root, "backend");
const frontend = join(root, "frontend");
const win = process.platform === "win32";
const python = join(backend, ".venv", win ? "Scripts" : "bin", win ? "python.exe" : "python");

if (!existsSync(python)) {
  console.error(
    "Backend virtualenv not found. Set it up once:\n" +
      "  cd backend && python -m venv .venv && .venv\\Scripts\\activate && pip install -r requirements-dev.txt",
  );
  process.exit(1);
}
if (!existsSync(join(backend, ".env"))) {
  console.error("backend/.env is missing. Copy backend/.env.example to backend/.env and fill it in.");
  process.exit(1);
}

const children = [];
function run(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, shell: win && cmd === "npm", env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (buf) => {
      for (const line of buf.toString().split(/\r?\n/)) if (line.trim()) process.stdout.write(prefix + line + "\n");
    });
  }
  child.on("exit", (code) => {
    console.log(`${prefix}exited with code ${code}`);
    // Keep the other one running (e.g. the frontend is already open in another terminal);
    // quit once both have stopped. Ctrl+C stops everything.
    if (children.every((c) => c.exitCode !== null || c.signalCode !== null)) shutdown(code ?? 0);
  });
  children.push(child);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (c.exitCode !== null) continue;
    // On Windows, kill the whole tree (npm -> next dev, uvicorn -> reloader workers).
    if (win) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else c.kill("SIGINT");
  }
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", "36", python, ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"], backend);
run("web", "33", "npm", ["run", "dev"], frontend);
