import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const apiDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(apiDirectory, "tmp", "test");
const outputFile = path.join(outputDirectory, "sos.test.cjs");

await rm(outputFile, { force: true });
await mkdir(outputDirectory, { recursive: true });

// The workspace exports TypeScript source with extensionless internal imports.
// Bundle this isolated test so Node's built-in test runner executes the same
// source graph without requiring a new workspace package manager install.
await build({
  entryPoints: [path.join(apiDirectory, "test", "sos.test.ts")],
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "cjs",
  logLevel: "info",
  external: ["argon2", "pino", "pino-pretty", "thread-stream"],
});

const child = spawn(process.execPath, ["--env-file=.env", "--test", outputFile], {
  cwd: apiDirectory,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "test" },
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
});

process.exitCode = exitCode;
