# opencode-sidebar-extras

OpenCode TUI sidebar 杂物箱：一组互相独立的小 widget，可以按需启用。

参考实现：[opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache)（缓存命中率面板，技术形态完全一致）。

## 当前包含的 widget

| Widget | 显示内容 | 实现位置 |
|---|---|---|
| `SessionIdWidget` | 当前 session_id（截断 + 点击 toast 显示完整 id） | `src/index.tsx` |

后续计划：HandoffStatusWidget / ExperienceCandidateWidget / SyncStateWidget。

## 工作原理

OpenCode TUI 端插件机制（不是 server-side plugin）：

| 关键点 | 做法 |
|---|---|
| 入口 | `package.json` 的 `exports["./tui"]` 指向 `src/index.tsx` |
| 注册 | `tui.jsonc` 的 `plugin` 数组里加 plugin spec |
| 渲染 | `@opentui/solid`，在 sidebar 渲染 |
| 槽位 | `api.slots.register({ slots: { sidebar_content(ctx, input) {...} } })` |
| 数据 | `api.state.session.*` / `api.state.part(msgId)` / `api.route.current` |
| 命令 | `api.command.register(() => [...])` |
| 持久化 | `api.kv.get/set` |

## 安装

> 跨设备部署的关键：TUI plugin 要被 OpenCode 找到，必须**同时**满足：
> 1. `~/.config/opencode/package.json` 把它声明为依赖并 `npm install` 出 `node_modules/opencode-sidebar-extras/`
> 2. `~/.config/opencode/tui.jsonc` 的 `plugin` 数组里包含它的 spec
>
> `tui.jsonc` 走 ai-code-config 同步，新设备拉下来的是绝对路径形式（如 `file:///home/USER/GitHub/opencode-sidebar-extras/src/index.tsx`）。如果新设备用户名/路径不同，必须改成 npm 包名或正确路径。

### 1. clone 仓库

```bash
mkdir -p ~/GitHub
git clone git@github.com:hevinlacia/opencode-sidebar-extras.git ~/GitHub/opencode-sidebar-extras
```

### 2. 在仓库里准备依赖（可选，运行时直接读 src/ 也能跑）

```bash
cd ~/GitHub/opencode-sidebar-extras
npm install
npm run build      # 可选：tsc 编译
```

### 3. 在 `~/.config/opencode/` 把它装成本地依赖

`~/.config/opencode/package.json` 必须包含：

```json
{
  "dependencies": {
    "opencode-sidebar-extras": "file:../../GitHub/opencode-sidebar-extras"
  }
}
```

然后：

```bash
cd ~/.config/opencode
npm install
```

注意：
- 路径用 **相对路径** `file:../../GitHub/opencode-sidebar-extras`，不要写绝对路径，跨设备 / 多用户名才不会炸
- 装完会出现 `~/.config/opencode/node_modules/opencode-sidebar-extras/`

### 4. 注册到 `tui.jsonc`

推荐用 npm 包名形式（跨设备友好）：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "opencode-sidebar-extras"
  ]
}
```

也可以用一行命令自动写入：

```bash
node ~/GitHub/opencode-sidebar-extras/install.mjs
```

> 不推荐用 `file:///home/USER/GitHub/...` 绝对路径写到 `tui.jsonc`，因为 `tui.jsonc` 会同步到 ai-code-config，绝对路径在新设备上会失效。

### 5. 重启 OpenCode TUI

sidebar 应出现 `Session` 区块。

## 跨设备部署 checklist

新设备从 ai-code-config 恢复 OpenCode 配置后，**还需要**：

```bash
# 1. clone 本仓库
git clone git@github.com:hevinlacia/opencode-sidebar-extras.git ~/GitHub/opencode-sidebar-extras

# 2. 在 OpenCode 配置目录 npm install
cd ~/.config/opencode
npm install

# 3. 确认 tui.jsonc 里 plugin spec 是 "opencode-sidebar-extras"（不是绝对路径）

# 4. 重启 OpenCode
```

## 使用

- sidebar 上会出现 `Session` 区块，显示截断后的 session id
- 点击截断 id 行 → toast 弹出完整 id（15s）
- slash 命令 `/session-id` → toast 弹出完整 id（30s）
- 完整 id 可用于 `opencode export <sid>` 等命令

## 加新 widget 的套路

1. 在 `src/widgets/` 下加一个组件（参考 `SessionIdWidget`）
2. 在 `index.tsx` 的 `sidebar_content` 槽位里挂上 — 多个 widget 用 `<box flexDirection="column">` 串起来
3. 共享 `pal()`、`shortenId()` 等工具函数抽到 `src/lib/`
4. 需要持久状态用 `api.kv`；需要监听消息用 `api.event.on("message.updated", ...)`
