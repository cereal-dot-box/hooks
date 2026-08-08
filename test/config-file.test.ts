import { describe, expect, it } from "vitest";
import { detectFormat, stringifyConfig } from "../src/config-file.js";

describe("detectFormat", () => {
  it("defaults to 2-space + no-final-newline for empty/minimal input", () => {
    expect(detectFormat("")).toEqual({ indent: 2, finalNewline: false });
    expect(detectFormat("{}")).toEqual({ indent: 2, finalNewline: false });
  });

  it("detects 2-space indent and final newline", () => {
    expect(detectFormat('{\n  "a": 1\n}\n')).toEqual({ indent: 2, finalNewline: true });
  });

  it("detects 4-space indent and no final newline", () => {
    expect(detectFormat('{\n    "a": 1\n}')).toEqual({ indent: 4, finalNewline: false });
  });
});

describe("stringifyConfig", () => {
  it("respects indent and final newline", () => {
    expect(stringifyConfig({ a: 1 }, { indent: 4, finalNewline: true })).toBe('{\n    "a": 1\n}\n');
  });

  it("omits final newline when format says so", () => {
    expect(stringifyConfig({ a: 1 }, { indent: 2, finalNewline: false })).toBe('{\n  "a": 1\n}');
  });
});
