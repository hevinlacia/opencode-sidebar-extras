# opencode-sidebar-extras

OpenCode TUI sidebar 杂物箱：一组互相独立的小 widget，可以按需启用。

参考实现：[opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache)（缓存命中率面板，技术形态完全一致）。

## 当前包含的 widget

| Widget | 显示内容 | 实现位置 |
|---|---|---|
| `SessionIdWidget` | 当前 session_id（截断 + 点击 toast 显示完整 id） | `src/index.tsx` |

后续计划放进来的（设计为各自一个组件 + 共享 slot order）：

- HandoffStatusWidget — `/tmp/opencode/handoff/auto-summary/<sid>.sanitized.json` 是否存在
- ExperienceCandidateWidget — `experience-summary-reminder-state.json` 中当前 session 是否被识别为高价值
- SyncStateWidget — `opencode-sync-reminder-state.json` 最近同步状态

## 工作原理

OpenCode TUI 端插件机制（不是 server-side plugin）：

| 关键点 | 做法 |
|---|---|
| 入口 | `package.json` 的 `exports["./tui"]` 指向 `src/index.tsx` |
| 注册 | `tui.jsonc` 的 `plugin` 数组里加 `"opencode-sidebar-extras"` |
| 渲染 | `@opentui/solid`，在 sidebar 渲染 |
| 槽位 | `api.slots.register({ slots: { sidebar_content(ctx, input) {...} } })` |
| 数据 | `api.state.session.*` / `api.state.part(msgId)` / `api.route.current`，全是响应式 |
| 命令 | `api.command.register(() => [...])` — 注册 slash 命令 + Dialog UI |
| 持久化 | `api.kv.get/set` |

## 安装（本地开发）

```bash
cd ~/GitHub/opencode-sidebar-extras
npm install
npm run build      # 可选：tsc 编译，运行时直接读 src/index.tsx 也能跑
node install.mjs   # 写入 ~/.config/opencode/tui.jsonc
```

然后在 `~/.config/opencode/package.json`（或 OpenCode 的 plugin 缓存目录）里把这个本地路径作为依赖装上。最简单的办法：

```bash
cd ~/.config/opencode
npm install /home/hevin/GitHub/opencode-sidebar-extras
```

重启 OpenCode TUI 即可看到 sidebar 多出 "Session" 区块。

## 使用

- sidebar 上会出现一个 `Session` 区块，显示截断后的 session id
- 点击截断 id 行 → toast 弹出完整 id（15s）
- slash 命令 `/session-id` → toast 弹出完整 id（30s）
- 完整 id 可用于 `opencode export <sid>` 等命令

## 加新 widget 的套路

1. 在 `src/widgets/` 下加一个组件（参考 `SessionIdWidget`）
2. 在 `index.tsx` 的 `sidebar_content` 槽位里把它挂上 — 多个 widget 用 `<box flexDirection="column">` 串起来
3. 共享 `pal()`、`shortenId()` 等工具函数抽到 `src/lib/`
4. 需要持久状态用 `api.kv`；需要监听消息用 `api.event.on("message.updated", ...)`
