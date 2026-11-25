// Runs the `output: "standalone"` server the same way the Docker image does:
// copies .next/static and public next to server.js, then starts it.
// Usage: node tools/start-standalone.mjs [--hostname 127.0.0.1] [--port 3000]
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend");
const app = path.join(frontend, ".next/standalone/frontend");
const server = path.join(app, "server.js");
if (!existsSync(server)) {
  console.error(`Missing ${server}. Run \`npm run build\` first.`);
  process.exit(1);
}
cpSync(path.join(frontend, ".next/static"), path.join(app, ".next/static"), { recursive: true });
cpSync(path.join(frontend, "public"), path.join(app, "public"), { recursive: true });

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const env = { ...process.env, NODE_ENV: "production" };
if (flag("--hostname")) env.HOSTNAME = flag("--hostname");
if (flag("--port")) env.PORT = flag("--port");

const child = spawn(process.execPath, [server], { cwd: app, env, stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
