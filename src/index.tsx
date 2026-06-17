/** @jsxImportSource @opentui/solid */

import type { JSX } from "@opentui/solid"
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiSlotContext,
  TuiSlotPlugin,
  TuiPluginModule,
  TuiThemeCurrent,
} from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, onMount, onCleanup } from "solid-js"

// ---------------------------------------------------------------------------
// Theme palette helpers (subset of opencode-visual-cache)
// ---------------------------------------------------------------------------

const FALLBACK = {
  primary: "#8B9DAF",
  text:    "#C5C5BB",
  muted:   "#7A7A72",
  border:  "#6B6B63",
} as const

function rgb(raw: unknown): { r: number; g: number; b: number } | null {
  if (typeof raw === "string" && raw.startsWith("#")) {
    const h = raw.slice(1)
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (typeof o.r === "number" && typeof o.g === "number" && typeof o.b === "number") {
      const scale = o.r > 1 || o.g > 1 || o.b > 1 ? 1 : 255
      return {
        r: Math.round(o.r * scale),
        g: Math.round(o.g * scale),
        b: Math.round(o.b * scale),
      }
    }
  }
  return null
}

function toHex(raw: unknown, fallback: string): string {
  const c = rgb(raw)
  if (!c) return fallback
  return "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")
}

// ---------------------------------------------------------------------------
// Widget: SessionIdWidget
// ---------------------------------------------------------------------------

/**
 * Truncate a session id like "01K9XABCDEF...XYZ" -> "01K9XABC…XYZ4".
 * Designed for narrow sidebars; clicking the widget shows the full id in a toast.
 */
function shortenId(id: string): string {
  if (!id) return ""
  if (id.length <= 14) return id
  return id.slice(0, 8) + "\u2026" + id.slice(-4)
}

function SessionIdWidget(props: {
  theme: TuiThemeCurrent
  api: TuiPluginApi
  sessionId: string
}): JSX.Element {
  const pal = createMemo(() => {
    const t = props.theme as Record<string, unknown>
    return {
      primary: toHex(t.primary,   FALLBACK.primary),
      text:    toHex(t.text,      FALLBACK.text),
      muted:   toHex(t.textMuted, FALLBACK.muted),
      border:  toHex(t.border,    FALLBACK.border),
    }
  })

  const onClick = () => {
    const id = props.sessionId
    if (!id) {
      props.api.ui.toast({ message: "No active session" })
      return
    }
    // We can't write to system clipboard from inside the TUI process reliably,
    // so just surface the full id long enough to copy by hand or to feed into
    // `opencode export <sid>`.
    props.api.ui.toast({
      title: "Session ID",
      message: id,
      duration: 15000,
    })
  }

  return (
    <box
      border={true}
      borderColor={pal().border}
      paddingTop={0}
      paddingBottom={0}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
      gap={0}
    >
      <text>
        <span style={{ fg: pal().primary }}><b>Session</b></span>
      </text>
      <text onMouseUp={onClick}>
        <span style={{ fg: pal().text }}>{shortenId(props.sessionId) || "(none)"}</span>
        <span style={{ fg: pal().muted }}>  click to show</span>
      </text>
    </box>
  )
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

function createSidebarSlot(api: TuiPluginApi): TuiSlotPlugin {
  return {
    // Pick an order well above opencode-visual-cache (55) so this widget shows
    // up below the cache panel; tweak freely if multiple plugins compete.
    order: 60,
    slots: {
      sidebar_content(ctx: TuiSlotContext, input: { session_id: string }): JSX.Element {
        return (
          <SessionIdWidget
            theme={ctx.theme.current}
            api={api}
            sessionId={input.session_id}
          />
        )
      },
    },
  }
}

const tui: TuiPlugin = async (api: TuiPluginApi) => {
  api.slots.register(createSidebarSlot(api))

  api.command?.register(() => [
    {
      title: "Sidebar Extras: Show Session ID",
      value: "sidebar.session-id",
      description: "Show the current session id in a toast (long-lived, easy to copy)",
      slash: { name: "session-id" },
      onSelect: () => {
        const rt = api.route.current
        if (rt.name !== "session" || !rt.params) {
          api.ui.toast({ message: "Open a session first", variant: "warning" })
          return
        }
        const sid = String(rt.params.sessionID)
        api.ui.toast({
          title: "Session ID",
          message: sid,
          duration: 30000,
        })
      },
    },
  ])
}

const mod: TuiPluginModule & { id: string } = {
  id: "opencode-sidebar-extras",
  tui,
}

export default mod
