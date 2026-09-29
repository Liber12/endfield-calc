export type CliCommand = "plan" | "max" | "fit";

export interface CliConfig {
  targets?: Array<{ itemId: string; rate: number; locked?: boolean }>;
  settings?: {
    domains?: { current?: string; inactive?: string[] };
    aic?: {
      unresearched?: string[];
      capOverrides?: Array<{
        facilityId: string;
        domainId: string;
        value: number;
      }>;
    };
    rawLimits?: {
      overrides?: Array<{ itemId: string; domainId: string; value: number }>;
    };
    structures?: {
      disabled?: Array<{ domainId: string; structureId: string }>;
    };
    metastorage?: {
      routes?: Array<{ source: string; mode: string }>;
    };
  };
  plan?: {
    recipeOverrides?: Array<{ itemId: string; recipeId: string }>;
    manualRawMaterials?: string[];
    powerSustain?: boolean;
    machinesPerVaporizer?: number;
  };
}

export interface ParsedCliArgs {
  command: CliCommand;
  configPath?: string;
  domain?: string;
  targets: string[];
  maxItem?: string;
  powerSustain?: boolean;
  machinesPerVaporizer?: number;
  pretty: boolean;
  help: boolean;
}
