export class ConfigParseError extends Error {
  constructor(
    public configPath: string,
    public override cause?: unknown,
  ) {
    super(`Failed to parse JSON config at ${configPath}`);
    this.name = "ConfigParseError";
  }
}

export class ConfigCorruptionError extends Error {
  constructor(public configPath: string, message: string) {
    super(`Refusing to write corrupt config at ${configPath}: ${message}`);
    this.name = "ConfigCorruptionError";
  }
}

export class ManifestValidationError extends Error {
  constructor(
    public manifestPath: string,
    message: string,
  ) {
    super(`Invalid hook manifest at ${manifestPath}: ${message}`);
    this.name = "ManifestValidationError";
  }
}
