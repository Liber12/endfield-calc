#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { executeCli } from "../src/interfaces/cli/runner";

const configLoader = {
  read(path: string): string {
    return path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  },
};

executeCli(process.argv.slice(2), configLoader)
  .then(({ stdout }) => {
    process.stdout.write(stdout);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write("endfield-calc: " + message + "\n");
    process.exitCode = 1;
  });
