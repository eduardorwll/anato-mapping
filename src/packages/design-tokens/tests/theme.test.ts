import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  cssVarForToken,
  getInitialTheme,
  toggleTheme,
} from "../index";

describe("design-tokens theme controller", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies and persists dark graphite and light off-white themes", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(getInitialTheme()).toBe("light");

    const next = toggleTheme("light");
    expect(next).toBe("dark");
    applyTheme(next);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(getInitialTheme()).toBe("dark");
  });

  it("formats semantic tokens into CSS var references", () => {
    expect(cssVarForToken("--pin-cat-skeletal")).toBe("var(--pin-cat-skeletal)");
  });
});
