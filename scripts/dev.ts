import { spawn } from "node:child_process";

const nextDev = spawn("pnpm.cmd", ["dev:next"], { stdio: "inherit", shell: true });
const seedWatch = spawn("pnpm.cmd", ["seed:watch"], { stdio: "inherit", shell: true });

function shutdown(code = 0) {
  nextDev.kill();
  seedWatch.kill();
  process.exit(code);
}

nextDev.on("exit", (code) => shutdown(code ?? 0));
seedWatch.on("exit", (code) => shutdown(code ?? 0));

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));
