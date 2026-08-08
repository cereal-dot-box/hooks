import { describe, expect, it } from "vitest";
import { templateCommand } from "../src/templating.js";

const ctx = { scriptsDir: "/srv/scripts", pkgDir: "/srv/pkg" };

describe("templateCommand", () => {
  it("expands $HOOK_DIR with a path suffix", () => {
    expect(templateCommand("node $HOOK_DIR/x.mjs", ctx)).toBe("node '/srv/scripts/x.mjs'");
  });

  it("expands ${HOOK_DIR} brace form", () => {
    expect(templateCommand("node ${HOOK_DIR}/x.mjs", ctx)).toBe("node '/srv/scripts/x.mjs'");
  });

  it("expands $PKG_DIR", () => {
    expect(templateCommand("cat $PKG_DIR/README", ctx)).toBe("cat '/srv/pkg/README'");
  });

  it("quotes paths containing spaces as a single token", () => {
    const spacey = { scriptsDir: "/home/ja red/scripts", pkgDir: "/p" };
    expect(templateCommand("node $HOOK_DIR/onstart.mjs", spacey)).toBe(
      "node '/home/ja red/scripts/onstart.mjs'",
    );
  });

  it("handles bare $HOOK_DIR with no suffix", () => {
    expect(templateCommand("cd $HOOK_DIR", ctx)).toBe("cd '/srv/scripts'");
  });
});
