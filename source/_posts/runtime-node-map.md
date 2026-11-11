---
title: '把 41 个节点画成一张可点的图：LangGraph 全链路到底长什么样'
date: 2026-11-11 21:10:00
updated: 2026-11-11 21:10:00
tags:
  - LangGraph
  - Agent
  - 可观测性
  - 架构设计
  - 工程实践
categories:
  - Agent Runtime
description: '五张 LangGraph 图、41 个节点、46 条边，按一次真实请求的 67 个 span 回放——以及三个反直觉的耗时结论。'
photos:
  - 'https://wsrv.nl/?url=cdn.jsdelivr.net/gh/DragonBaby308/cdn@2.1/img/bg/bg1.jpg&w=1200&output=jpg&q=80'
---

**👉 [打开交互版：ReportAgent 运行节点图](/graph/)**

点任意节点能看到它的职责、输入输出、失败分支、对应代码行号和这次请求的实测耗时；点「回放真实轨迹」会按真实 span 的顺序把节点一个个点亮。

这篇文章说三件事：这张图怎么来的、从里面读出什么、以及为什么它比读代码更可信。

## 一、读代码读不出来的东西

`add_node` / `add_edge` 写在一起的时候，链路是"看得见"的。但一旦有四个地方在加边——需求图、执行图、SQL 子图、报告子图——你很难回答下面这种问题：

- 这次请求一共经过几个节点？
- 34 秒花在哪？是数据库慢还是模型慢？
- `validate` 失败之后，谁决定重来、重来几次、从哪个节点重来？

这些问题读代码能"推理"出来，但推理会错。所以这张图不是手绘的：**节点和边从代码里抄，顺序和耗时从 trace 表里查**。

## 二、五张图，各管一段

| 图 | 代码位置 | 节点 | 边 | 其中调模型 |
|---|---|---|---|---|
| ① 需求理解图 | `requirement_analysis_graph.py:842` | 14 | 17 | 5 |
| ② 确认执行图 | `confirmed_execution_graph.py:1390` | 11 | 11 | 0 |
| ③ SQL 子图 | `sql_graph.py:1649` | 8 | 11 | 2 |
| ④ 报告子图 | `report_graph.py:554` | 4 | 4 | 2 |
| ⑤ 数据准备子图 | `data_graph.py:86` | 4 | 3 | 0 |

注意 ② 号图的"调模型 = 0"：确认执行图自己一个模型都不叫，它只是个骨架，真正干活的模型都在它调用的两个子图里。**骨架是 Workflow，决策在子图里**——这就是"Agent 不是 Workflow"这句话在结构上的样子。

页面第 6 个标签是**故障处理矩阵**：20 条故障、五类处置（自动重试 / 降级继续 / 停下来问你 / 停下来失败 / 崩了也能救），每条都写清预算与用户可见结果。它的来历见 [我把后端杀了三次](/posts/deepdive-crash-recovery/)。

## 三、三个反直觉的结论

### 1. 需求阶段 96% 的时间花在一个节点上

一次真实请求（session `trace-map-1`，2026-11-11）：

| 节点 | 实测 | 占比 |
|---|---|---|
| `turn_understand` 理解这一轮 | **25.8s** | 需求阶段 26.8s 的 96% |
| `requirement_intent` 识别意图 | 563ms | 2% |
| `data_search_schema` schema 检索 | 309ms | 1% |
| 其余 11 个节点加起来 | ~25ms | 0.1% |

`turn_understand` 是唯一用"思考预算"的节点（`TURN_THINKING_BUDGET=1536`）。它的输入输出都只是一小段 JSON，但推理链很长。所以需求阶段的优化方向不是"少查几次数据库"，而是**要不要让它少想一会儿**——这也是为什么它有一套单独的预算：单次 90s、快速重试 30s、单轮总预算 120s。

### 2. 真正查库只要 43 毫秒

`sql_execute` 43ms。`sql_plan` 8.3s，`sql_generate` 5.5s，中间还夹一次 6.9s 的 embedding 召回。

也就是说这条链路里 **模型侧 ≈ 97%，数据库侧 ≈ 0.2%**。这个比例决定了所有性能工作的排序：想去掉 5 秒得动模型，想去掉 43 毫秒得动数据库——而后者没有意义。

### 3. 三条回边才是"Agent"的证据

SQL 子图里 11 条边有 3 条是往回走的：

```
diagnose --retry_sql / retry_mcp_schema_retrieval--> generate_sql
diagnose --replan--> plan
run_step --还有步骤--> run_step
```

如果只有 `plan → generate → validate → execute → report`，那它是一个流水线，出了问题只能整体失败。加回边之后，"失败"变成了一个**可以决策的状态**：是重写 SQL、还是重新取 schema、还是重新规划、还是干脆停。

关键在于回边的**入口是确定性的**：`DiagnosePolicy` 是一张纯函数决策表，不是模型在判断"要不要重试"。预算也写死（SQL repair 2 次、MCP 2 次），用尽就 `FAILED`，不伪造成功。

## 四、怎么读一张图：以 SQL 子图为例

`validate` 有两个出口，这是整张图最值得看的地方：

```
validate --valid--> execute --> evaluate --> diagnose
validate --invalid--> evaluate --> diagnose
```

**为什么 `invalid` 不直接失败？** 因为"SQL 不合法"和"SQL 结果不对"应该走同一条诊断路径——都需要知道错在哪、要不要重试、还剩几次预算。所以 `invalid` 也流进 `evaluate`，只是 `evaluate` 会把它标成 `VALIDATION_FAILED`，再交给 `diagnose` 决定去哪个回边。

这条分支今天刚被我用上一次。真机报告出现过「其中 **None月** 最高」——那次 SQL 是**合法的**（能执行、能返回数据），只是把范围过滤写进了 `LEFT JOIN ... ON`，于是全国数据冒充了华南月度。`validate` 当时给了 `valid`，因为它只查"能不能安全执行"。

修法不是加一条 prompt，而是在 `validate` 里加两道确定性契约：

- **C1**：plan 要求了时间范围/范围过滤，SQL 里就必须真的出现对应谓词；
- **C2**：这个过滤不许写进外连接（`LEFT/RIGHT/FULL JOIN`）的 `ON`——那里等于没过滤。

违规就 `valid: false` → 走 `invalid` 那条边 → `diagnose` → `retry_sql` 重写。图上一个节点的两个出口，最后落成了一条真实的修复路径。

## 五、这张图是怎么查出来的

耗时不是猜的，是 `observability.agent_trace_span` 里查出来的：

```sql
select span_type, span_name, duration_ms, start_time
from observability.agent_trace_span
where trace_id in (
  select trace_id from observability.agent_trace
  where session_id = 'trace-map-1'
)
order by start_time;
```

一次请求 67 个 span，其中 `span_type='NODE'` 的 33 个就是回放用的序列（`DATA` 是节点输出、`TOOL` 是工具调用）。

**这一步比读代码重要。** 代码告诉你"可能有这条路"，trace 告诉你"这次真的走了哪条路、花了多久"。比如这次 `data_search_schema` 在需求阶段是 309ms，在确认阶段是 0ms（schema 命中缓存）——代码里两个调用点长得一模一样，只有 trace 能区分。

顺带说一个面试常被问的点：**"你怎么知道你的链路是这样跑的？"** 如果答案是"我读代码读出来的"，那是推断；如果答案是"查 trace 表，67 个 span，按 start_time 排"，那是观测。

## 六、两个诚实的边界

**① 子图不是 LangGraph 的 subgraph。** `sql_agent` 和 `report_agent` 是父图的一个节点，内部用 `.ainvoke()` 调另一张编译好的图。结果是 checkpoint 只存父 State——子图跑到一半崩了，恢复时会从父图的节点边界重来，而不是从子图中间继续。

**② 0ms 的节点是真的 0ms。** `evaluate`、`diagnose`、`build_output` 都是纯函数，不碰网络不碰库，所以它们耗时 0 不代表没跑。图上把三个 `sql_` 阶段画在一起，就是为了让"哪些节点在花时间、哪些只是在做判断"一眼能看出来。

## 七、入口

**[→ 打开交互版运行节点图](/graph/)**

建议的看顺序：先看「总览」里的耗时表，再进「图 ③ SQL 子图」看那三条回边，然后「故障处理」看一眼五类处置，最后回「图 ① 需求理解图」点一下 `turn_understand`——看看一个 25.8 秒的节点在整条链路上是什么位置。

相关阅读：同一条链路的正确性是怎么被钉住的，见 [执行准确率那篇](/posts/reportagent-03-execution-accuracy/)；两张图之间靠什么交接，见 [ReportAgent 全解（一）](/posts/reportagent-01-graph/)；节点崩了之后系统怎么收场，见 [我把后端杀了三次](/posts/deepdive-crash-recovery/)。
