import type { ParsedCliArgs } from "@/interfaces/cli/types";

export const CLI_HELP = [
  "Endfield Calc CLI",
  "",
  "Usage:",
  "  pnpm calc -- plan --target item_iron_powder:60 [options]",
  "  pnpm calc -- max --config plan.json --item item_iron_powder",
  "  pnpm calc -- fit --config plan.json",
  "",
  "Options:",
  "  --config <path|->        JSON config file, or - for stdin",
  "  --domain <domain_id>     Override the current factory region",
  "  --target <item:rate[l]>  Add/replace targets; repeatable. l locks it",
  "  --item <item_id>         Target to maximize for max",
  "  --power-sustain          Enable self-sustaining power",
  "  --no-power-sustain       Disable self-sustaining power",
  "  --mpv <1..16>            Machines per gas vaporizer",
  "  --pretty                 Pretty-print JSON",
  "  --help                   Show this help",
  "",
  "The JSON config mirrors the web app: settings contains persisted region",
  "settings (domains/aic/rawLimits/structures/metastorage), while plan contains",
  "recipe overrides, manual raws, self-power, and gas coverage.",
].join("\n");

export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  let command: ParsedCliArgs["command"] = "plan";
  let i = 0;
  if (argv[0] === "plan" || argv[0] === "max" || argv[0] === "fit") {
    command = argv[0];
    i = 1;
  }

  const out: ParsedCliArgs = {
    command,
    targets: [],
    pretty: false,
    help: false,
  };

  for (; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error("Missing value for " + arg);
      return value;
    };

    switch (arg) {
      case "--config":
        out.configPath = next();
        break;
      case "--domain":
        out.domain = next();
        break;
      case "--target":
        out.targets.push(next());
        break;
      case "--item":
        out.maxItem = next();
        break;
      case "--power-sustain":
        out.powerSustain = true;
        break;
      case "--no-power-sustain":
        out.powerSustain = false;
        break;
      case "--mpv":
        out.machinesPerVaporizer = Number(next());
        break;
      case "--pretty":
        out.pretty = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error("Unknown argument: " + arg);
    }
  }

  return out;
}
