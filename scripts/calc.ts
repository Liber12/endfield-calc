#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { executeCalcCli } from "./cli/calc-cli";

function loadConfig(path: string): string {
  return path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
}

executeCalcCli(process.argv.slice(2), loadConfig)
  .then((result) => {
    process.stdout.write(result.text + "\n");
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write("endfield-calc: " + message + "\n");
    process.exitCode = 1;
  });
