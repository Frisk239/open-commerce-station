import { spawn } from "node:child_process";

const pnpmCli = process.env.npm_execpath;

if (!pnpmCli) {
  throw new Error("This helper must be launched from a pnpm script.");
}

const child = spawn(process.execPath, [pnpmCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
