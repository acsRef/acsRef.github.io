---
title: 关于这个博客
date: 2026-11-10 22:20:00
updated: 2026-11-10 22:20:00
type: about
comments: false
---

## 你好，我是 acsRef 👋

这里是我的个人博客 **星屑ノート**，主要用来存放**两个 AI 系统项目的完整技术档案**——不是 demo 介绍，而是把架构、取舍、踩过的坑和量化结果都写清楚。

## 两个项目

| 项目 | 定位 | 一句话 |
|---|---|---|
| **RAGent**（`ragent-py`） | 检索运行时 | 多格式摄入 → 表格感知切分 → 三路混合召回 → 精排去冗 → 带引用的流式回答 |
| **ReportAgent** | Agent 运行时 | 中文自然语言 → 需求卡 → SQL 规划/生成/校验/执行/诊断 → 带数字的报告 |

两者不是一个大项目，而是两个可独立运行、独立评测的 Runtime，中间只走 **MCP** 一条边界。

## 文章索引

### RAG Runtime（RAGent）

- RAGent 全解（一）：摄入管线决定检索上限
- RAGent 全解（二）：检索链路，与一次把花哨策略全关掉的消融
- RAGent 全解（三）：评测、安全与那些「看起来能跑」的工程细节

### Agent Runtime（ReportAgent）

- ReportAgent 全解（一）：两张图、一份契约、三态落库
- ReportAgent 全解（二）：记忆系统——先测，再设计
- ReportAgent 全解（三）：跑通率 1.0，答案错了 3.4 倍
- [把 41 个节点画成一张可点的图：LangGraph 全链路到底长什么样](/posts/runtime-node-map/)
  - 配套交互页：[运行节点图](/graph/)（节点可点、真实轨迹可回放）

### 架构笔记

- 两个 Runtime 的边界：RAG 不自建 Agent，Agent 不重建索引

### 项目深挖

- 项目深挖（一）：记忆冲突与归并——为什么我放弃了余弦相似度
- 项目深挖（二）：确定性裁决——把模型漏掉的「字面事实」补回来

### 面试

- Agent 面试题库精讲（教学版）：22 题，每题讲透 + 项目证据

## 关于这个网站

| 项目 | 用的是 |
|---|---|
| 生成器 | Hexo 7 |
| 主题 | [Sakura](https://github.com/honjun/hexo-theme-sakura)（改过配色和背景） |
| 托管 | GitHub Pages |
| 构建 | GitHub Actions |
| 图示 | 手写 SVG（不依赖任何 Markdown 渲染插件） |

源码在 <https://github.com/acsRef/acsRef.github.io>，欢迎来玩。

## 联系我

- GitHub：[@acsRef](https://github.com/acsRef)
- 邮箱：1803887234@qq.com
