---
title: '我把后端杀了三次，才发现重试按钮永远不会亮'
date: 2026-11-11 22:30:00
updated: 2026-11-11 22:30:00
tags:
  - Agent
  - LangGraph
  - 可观测性
  - 架构设计
  - 工程实践
categories:
  - 项目深挖
description: '「节点挂了会重试吗」听起来是个已经做完的功能。做了三次强杀实验之后，我发现它有一条链路从来没通过：记录。'
photos:
  - 'https://wsrv.nl/?url=cdn.jsdelivr.net/gh/DragonBaby308/cdn@2.1/img/bg/bg3.jpg&w=1200&output=jpg&q=80'
---

有人问我：**「如果某个节点断了，有没有考虑重试、记录下来、再重试？」**

我第一反应是「有」——固定预算、`DiagnosePolicy` 决策表、三态落库、`/retry` 端点，都在。但我没法回答第二个问题：**进程被杀掉之后呢？**

于是我做了个破坏性实验：任务跑到一半，把后端进程 `Stop-Process -Force` 掉，再重启，看库里剩下什么。

## 第一次：实验设计得不对

confirm 发起后我等了 7 秒，然后开始敲查询——查库、查进程、再杀。等我真正 `kill` 的时候，时间已经过去 26 秒，**任务刚好跑完了**。

```
phase=report_ready | rv_rows=1 | trace DONE
```

失败，但学到一件事：**这条链路正常时只要 26 秒**。所以必须在 6 秒内动手。

## 第二次：库里只剩一个字段

改成「confirm 之后等 6 秒，立刻杀，中间不插任何查询」：

```
=== 崩溃瞬间 ===
phase=generating | failed_action=NULL | rv_rows=0
conversations=3
trace: AWAITING_CONFIRM | span_count=23
最后完成的节点: requirement_persist_draft（需求阶段）
```

三条证据摆在一起就很刺眼了：

1. **`phase=generating` 永远不会变** —— 后台任务活在进程内存的一个字典里（`infra/execution/registry`），进程死了它就不存在了，没人来改这个相位；
2. **`last_failed_action` 是 NULL** —— 前端不认为这是失败，不会显示重试按钮；
3. **`report_version` 0 行** —— 版本历史里看不出「这次跑过、但没跑成」；
4. **span 只有 23 个** —— 全是需求阶段的，`sql_plan`（最贵的那一步，8.3 秒）一个都没有。因为 span 是内存缓冲、请求结束才 flush，进程被杀就整批丢了。

最后一条最讽刺：**最需要记录现场的那一刻，记录刚好没有。**

## 关键发现：重试按钮的触发条件是死的

我顺手查了下前端到底怎么决定显示「重试」：

```ts
export function canRetryFailedAction(state) {
  const action = state.error?.failed_action
  return state.phase === 'error' && state.error !== null &&
         state.error.recoverable === true && (action === 'confirm' || ...)
}
```

它要求 `state.error` 非空 —— 而 `state.error` 只由 SSE 的 `error` 事件写入。崩溃场景**根本没有 error 事件**（进程都死了，谁发？），相位又卡在 `generating`（不是 `error`）。两个条件同时不满足。

更糟的是：我翻遍前端，`snap.last_failed_action`（后端快照里明明有这个字段）**没有任何消费方**——它只在类型定义里躺着。也就是说，哪怕后端标了「可恢复」，**刷新页面之后按钮也永远不会亮**。

这条链路是三个零件各做对了一半，装在一起不转。

## 三层盘点：哪一层断的

| 能力 | 现状 | 断在哪 |
|---|---|---|
| **重试** | `RETRY_BUDGETS`（SQL 2 / MCP 2 / LLM 2 / 重规划 1）+ `DiagnosePolicy` 纯函数决策表 | 只在**进程活着**时有效 |
| **记录** | 每节点 span、`report_version` 三态、`session.last_failed_action` | 崩溃时三者**全空**；span 还是缓冲的 |
| **再重试** | `POST /sessions/{sid}/retry` | 实测**能救**——我把被杀的会话调了一次，45 秒后 `phase=report_ready`、落了一行 `done`。但没人能触发它 |

结论：整套设计默认**进程不会死**。

## 四刀

按「从 0 分到 60 分」的顺序补，每一刀都有明确的验收条件。

### P0 启动时收敛孤儿任务

启动钩子扫 `parsing / generating / adjusting` 的会话，**二分处理**，而不是一刀切：

| 判定 | 动作 | 为什么 |
|---|---|---|
| 该 draft 已有 `status='done'` 的版本 | 只把 phase 修回 `report_ready` | 任务其实跑完了，只是「写完版本行」和「更新相位」之间被杀 |
| 没有 | 落一行 `status=error` + `kind=interrupted`，会话置 `phase=error` + `last_failed_action=confirm` | 确实没跑成 |

新增错误 kind `interrupted`，表里两个位置很讲究：

- **加进 `USER_RECOVERABLE_KINDS`**（用户点重试就能重跑）；
- **不加进 `AGENT_RECOVERABLE_KINDS`**（同一条 SQL 重跑还是错，需要的是整轮重来，不是 repair）。

前端同步补一刀：`loadSessionSnapshot` 现在会把 `last_failed_action` 还原成错误态 —— 那个「只在类型里躺着」的字段终于有人用了。

### P1 重试计数搬进数据库

`retry_counters` 原先只活在图的 State 里（dev 是 `MemorySaver`）。进程一重启就归零 → **预算可被无限绕过**：同一份需求反复失败，每次都是「第 1 次重试」。

新建 `agent.retry_attempt`，一行一次重试（预算维度 / action / error_kind / reason）。写由 `_diagnose` 负责（`best-effort`），读在进 SQL 子图前按 `(session, draft)` 数一遍播种回 State。

为什么是 `fire-and-forget`：`_diagnose` 是同步节点（还被多条单测同步直调），改成 async 会波及所有调用点；审计丢一行不影响结论（State 里照常递增，DB 只是跨重启副本）。

### P2 自动重试

可恢复失败落 flag 后，自动排一次带退避的重试（默认 1 次、3 秒翻倍）。三个细节是关键：

- **先记账再跑** —— 重试途中崩了，这次不会被漏记、也不会重复计数；
- **延迟不在 runner 里睡** —— runner 返回前 task 仍算「在跑」，睡在那里会把自己锁成 `SESSION_BUSY`；
- **触发前再查一次占用** —— 你三秒内自己点了重试，自动的让位。

### P3 span 增量落盘

`TraceRepository.save_span` 是**纯 INSERT**（没有 `ON CONFLICT`），所以增量不能「重写全量」——必须自己记游标。Tracer 加三个字段（`_persisted_spans` / `_persisted_llm_calls` / `_trace_saved`），每攒够 `TRACE_FLUSH_EVERY`（默认 10）个 span 就在节点边界落一次，终态 flush 只补尾巴。

只挂在**异步**节点上：同步节点没有 await 点，硬塞会把主链变慢；而贵的那几个（`turn_understand` / `sql_plan` / `report_*`）都是异步的 —— 崩在它们身上才是真会丢现场的场景。

## 复证：同一个实验，修之后

| 检查 | 修之前 | 修之后 |
|---|---|---|
| `current_phase` | `generating`（永久卡死） | 重启后 **`error`** |
| `last_failed_action` | NULL | **`confirm`** |
| 报告版本 | **0 行** | **1 行 `status=error` / `kind=interrupted`** |
| 崩溃时落库 span | **23**（只有需求阶段） | **54**（含 `sql_validate` / `sql_execute` / `sql_build_output`） |
| trace 状态 | 上一阶段的 `AWAITING_CONFIRM` | `RUNNING` —— 本身成了「这次被中断」的证据 |
| 前端 | 永远「生成中」，无按钮 | 会话 pill「生成失败」、报告 v1 标题「任务中断」、主区 **「重试当前任务」** |

全量回归：backend **1844 passed** / frontend **500 passed** + `tsc` 0 error。

## 三个必须交代的地方

**① 我为这个改动打红了四处旧契约测试，是故意的。**
`test_reliability_errors` 和 `test_diagnose_policy_sources` 用硬断言把 kind 词表钉死了（「8 个 kind，一个不多一个不少」）。加 `interrupted` 必须显式改它们 —— 这正是这类测试存在的意义：让「新增一个错误语义」变成一个需要签字确认的动作，而不是悄悄多一个分支。

**② P1 的重试记账，这一轮真机是 0 行。**
三次实验的请求都一次成功，没有触发 repair，所以 `agent.retry_attempt` 是空的。它的正确性由真 PG 的 roundtrip 测试保证（记两次 → 数出 2 → attempt 序号 1、2），不是靠这次跑通。**"写完了"和"验证过"是两件事。**

**③ 收敛逻辑建立在单实例假设上。**
启动时本进程没有任何在跑的任务，所以「忙相位 = 孤儿」成立。多实例部署时这段扫描会误杀另一个进程正在跑的任务 —— 那时需要先落「任务归属 / 租约」（owner + `lease_expires_at`），再按租约过期判定。这个假设写在模块 docstring 里，不是藏在心里。

## 如果继续做

- **断点续跑**：现在重试是整轮重跑。子图是 `.ainvoke()`、checkpoint 只存父 State，所以恢复只能从父图节点边界开始 —— 要真正续跑，得让子图成为 LangGraph 的 subgraph，或把每个节点的输入输出都落库；
- **失败样本沉淀**：`interrupted` / `repair` 这些行现在只是记录。把它们喂进评测基线（「上次失败的那个问题，现在能过吗」），比再加十条手写 case 有价值。

---

配套：[运行节点图（交互版）](/graph/) —— 第 6 个标签「故障处理」就是这次的产物，20 条故障、五类处置（自动重试 / 降级继续 / 停下来问你 / 停下来失败 / **崩了也能救**）。
