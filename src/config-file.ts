import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ConfigCorruptionError, ConfigParseError } from "./errors.js";

export interface Format {
  indent: number;
  finalNewline: boolean;
}

/** Detect indent size and trailing newline from existing JSON text. */
export function detectFormat(raw: string): Format {
  const indentMatch = raw.match(/\n( +)"/);
  const indent = indentMatch && indentMatch[1] ? indentMatch[1].length : 2;
  const finalNewline = /\n$/.test(raw);
  return { indent, finalNewline };
}

export interface ReadResult {
  raw: string;
  exists: boolean;
}

export function readRaw(configPath: string): ReadResult {
  if (!existsSync(configPath)) return { raw: "", exists: false };
  return { raw: readFileSync(configPath, "utf8"), exists: true };
}

/** Parse config text. Empty/whitespace → {}. Throws ConfigParseError on bad JSON. */
export function parseConfig(raw: string, configPath: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return {};
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    throw new ConfigParseError(configPath, e);
  }
}

/** Stringify with a detected format. */
export function stringifyConfig(root: unknown, format: Format): string {
  const text = JSON.stringify(root, null, format.indent);
  return format.finalNewline ? text + "\n" : text;
}

/**
 * Write config atomically. Verifies output parses first, backs up the prior
 * file, writes to a temp path, then renames. Never partially overwrites.
 */
export function writeConfigAtomic(configPath: string, output: string): void {
  try {
    JSON.parse(output);
  } catch {
    throw new ConfigCorruptionError(configPath, "generated output is not valid JSON");
  }
  mkdirSync(dirname(configPath), { recursive: true });
  if (existsSync(configPath)) {
    copyFileSync(configPath, `${configPath}.agenthooks.bak`);
  }
  const tmp = `${configPath}.agenthooks-tmp-${process.pid}`;
  writeFileSync(tmp, output, "utf8");
  renameSync(tmp, configPath);
}
