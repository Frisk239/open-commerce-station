import { access, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const [appName, defaultPort] = process.argv.slice(2);

if (!appName || !defaultPort) {
  throw new Error("Usage: node scripts/start-standalone.mjs <app-name> <default-port>");
}

const appRoot = process.cwd();
const standaloneRoot = join(appRoot, ".next", "standalone", "apps", appName);
const standaloneNext = join(standaloneRoot, ".next");

await mkdir(standaloneNext, { recursive: true });
await cp(join(appRoot, ".next", "static"), join(standaloneNext, "static"), { recursive: true, force: true });

try {
  await access(join(appRoot, "public"));
  await cp(join(appRoot, "public"), join(standaloneRoot, "public"), { recursive: true, force: true });
} catch {
  // A blank station does not need public assets yet.
}

const child = spawn(process.execPath, [join(standaloneRoot, "server.js")], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
    PORT: process.env.PORT || defaultPort,
  },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
