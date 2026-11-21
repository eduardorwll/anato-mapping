#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const target = (process.argv[2] || "host").toLowerCase();
const isLinuxHost = process.platform === "linux";
const isWindowsHost = process.platform === "win32";

function hasCommand(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [cmd], { stdio: "ignore" }).status === 0;
}

function run(cmd, args, extraEnv = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  process.exit(res.status ?? 1);
}

if (target === "linux" || (target === "host" && isLinuxHost)) {
  if (!isLinuxHost) {
    console.error(
      "Compilação Linux local requer host Linux (ou dispare via GitHub Actions: gh workflow run release.yml).",
    );
    process.exit(1);
  }
  const bundles = ["appimage"];
  if (hasCommand("dpkg-deb")) bundles.push("deb");
  if (hasCommand("rpmbuild")) bundles.push("rpm");

  console.log(`→ Building Linux bundles: ${bundles.join(", ")}`);
  run("npx", ["tauri", "build", "--bundles", bundles.join(",")], {
    NO_STRIP: "true",
    APPIMAGE_EXTRACT_AND_RUN: "1",
  });
} else if (target === "windows" || (target === "host" && isWindowsHost)) {
  if (isWindowsHost) {
    console.log("→ Building Windows NSIS per-user installer (.exe)");
    run("npx", ["tauri", "build", "--bundles", "nsis"]);
  } else {
    const missing = [];
    if (!hasCommand("cargo-xwin")) missing.push("cargo-xwin");
    if (!hasCommand("makensis")) missing.push("nsis (makensis)");
    if (!hasCommand("lld") && !hasCommand("lld-link")) missing.push("lld");

    if (missing.length > 0) {
      console.error(
        `Cross-compilação Windows no Linux requer: ${missing.join(", ")} + target Rust x86_64-pc-windows-msvc.`,
      );
      console.error("\nOpções:");
      console.error("  1. Cloud CI (recomendado, sem instalar SDK local):");
      console.error("     gh workflow run release.yml");
      console.error("  2. Setup local no Arch/Ryoku Linux:");
      console.error("     sudo pacman -S nsis lld llvm");
      console.error("     rustup target add x86_64-pc-windows-msvc");
      console.error("     cargo install --locked cargo-xwin");
      process.exit(1);
    }

    console.log(
      "→ Cross-compiling Windows NSIS (.exe) via cargo-xwin (x86_64-pc-windows-msvc)",
    );
    run("npx", [
      "tauri",
      "build",
      "--runner",
      "cargo-xwin",
      "--target",
      "x86_64-pc-windows-msvc",
      "--bundles",
      "nsis",
    ]);
  }
} else {
  console.error("Uso: node scripts/build-desktop.mjs <linux|windows|host>");
  process.exit(1);
}
