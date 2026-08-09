import { describe, expect, it } from "vitest";
import { templateCommand } from "../src/templating.js";

const ctx = { scriptsDir: "/srv/scripts", pkgDir: "/srv/pkg" };

describe("templateCommand", () => {
  it("expands $HOOK_DIR with a path suffix and exports it as env var", () => {
    expect(templateCommand("node $HOOK_DIR/x.mjs", ctx)).toBe(
      "HOOK_DIR='/srv/scripts' node '/srv/scripts/x.mjs'",
    );
  });

  it("expands ${HOOK_DIR} brace form and exports env var", () => {
    expect(templateCommand("node ${HOOK_DIR}/x.mjs", ctx)).toBe(
      "HOOK_DIR='/srv/scripts' node '/srv/scripts/x.mjs'",
    );
  });

  it("expands $PKG_DIR and exports it as env var", () => {
    expect(templateCommand("cat $PKG_DIR/README", ctx)).toBe(
      "PKG_DIR='/srv/pkg' cat '/srv/pkg/README'",
    );
  });

  it("exports both HOOK_DIR and PKG_DIR when both are referenced", () => {
    expect(templateCommand("node $HOOK_DIR/x.mjs && cat $PKG_DIR/README", ctx)).toBe(
      "HOOK_DIR='/srv/scripts' PKG_DIR='/srv/pkg' node '/srv/scripts/x.mjs' && cat '/srv/pkg/README'",
    );
  });

  it("does not export env vars when command doesn't reference them", () => {
    expect(templateCommand("echo stopped", ctx)).toBe("echo stopped");
  });

  it("quotes paths containing spaces as a single token (both in token and env var)", () => {
    const spacey = { scriptsDir: "/home/ja red/scripts", pkgDir: "/p" };
    expect(templateCommand("node $HOOK_DIR/onstart.mjs", spacey)).toBe(
      "HOOK_DIR='/home/ja red/scripts' node '/home/ja red/scripts/onstart.mjs'",
    );
  });

  it("handles bare $HOOK_DIR with no suffix and still exports env var", () => {
    expect(templateCommand("cd $HOOK_DIR", ctx)).toBe("HOOK_DIR='/srv/scripts' cd '/srv/scripts'");
  });
});
