#!/usr/bin/env node

/**
 * Install script for opencode-sidebar-extras.
 *
 * Adds the plugin to ~/.config/opencode/tui.jsonc (creating it if needed).
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises"
import { constants } from "node:fs"
import { homedir, platform } from "node:os"
import { join } from "node:path"

const PLUGIN_SPEC = "opencode-sidebar-extras"

function configDir() {
  if (platform() === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "opencode")
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode")
}

async function exists(p) {
  try { await access(p, constants.F_OK); return true }
  catch { return false }
}

async function readJSONC(p) {
  const raw = await readFile(p, "utf-8")
  const stripped = raw.replace(/^\s*\/\/.*$/gm, "")
  return JSON.parse(stripped)
}

function formatJSONC(obj) {
  return JSON.stringify(obj, null, 2) + "\n"
}

function mergePlugin(existing, spec) {
  const plugins = existing.plugin ?? []
  if (plugins.some((p) => (typeof p === "string" ? p : p[0]) === spec)) {
    return false
  }
  existing.plugin = [...plugins, spec]
  return true
}

async function main() {
  const dir = configDir()
  await mkdir(dir, { recursive: true })

  const tuiPath = join(dir, "tui.jsonc")
  let changed = false

  if (await exists(tuiPath)) {
    const cfg = await readJSONC(tuiPath)
    changed = mergePlugin(cfg, PLUGIN_SPEC)
    if (changed) {
      await writeFile(tuiPath, formatJSONC(cfg))
      console.log(`[opencode-sidebar-extras] Added to ${tuiPath}`)
    } else {
      console.log(`[opencode-sidebar-extras] Already in ${tuiPath}`)
    }
  } else {
    const cfg = {
      $schema: "https://opencode.ai/tui.json",
      plugin: [PLUGIN_SPEC],
    }
    await writeFile(tuiPath, formatJSONC(cfg))
    console.log(`[opencode-sidebar-extras] Created ${tuiPath}`)
    changed = true
  }

  if (changed) {
    console.log("\nDone! Restart OpenCode to see the sidebar widget.")
  } else {
    console.log("\nAlready installed. Restart OpenCode if you haven't yet.")
  }
}

main().catch((err) => {
  console.error("Install failed:", err.message)
  process.exit(1)
})
