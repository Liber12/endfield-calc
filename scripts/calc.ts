#!/usr/bin/env bun

import { executeCli } from "../src/interfaces/cli/runner";

executeCli(process.argv.slice(2))
  .then(({ stdout }) => {
    process.stdout.write(stdout);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write("endfield-calc: " + message + "\n");
    process.exitCode = 1;
  });
