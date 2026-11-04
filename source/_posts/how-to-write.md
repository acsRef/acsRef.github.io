---
title: 写文章其实只要三步
date: 2026-11-04 20:10:00
tags:
  - Hexo
  - 教程
categories:
  - 折腾记录
description: 新建一篇文章、写 Markdown、push —— 没了。
photos:
  - /img/cover-bamboo.svg
---

这篇是给你的「操作备忘」，忘了怎么发文章的时候点开看。

<!-- more -->

## 第一步：新建一篇文章

在博客目录里执行：

```bash
npx hexo new "文章标题"
```

或者更省事——直接在 GitHub 仓库里打开 `source/_posts/`，点 **Add file → Create new file**，名字起成 `my-post.md`，然后把下面这段贴在开头：

```markdown
---
title: 文章标题
date: 2026-11-04 20:10:00
tags:
  - 标签一
  - 标签二
categories:
  - 分类名
description: 一句话简介，会显示在首页卡片上
---
```

正文从下一行开始写就行。

## 第二步：写 Markdown

常用语法就这么几个：

| 想写 | 写法 |
|---|---|
| 大标题 | `## 标题` |
| **加粗** | `**加粗**` |
| 链接 | `[文字](https://example.com)` |
| 图片 | `![说明](/images/pic.jpg)` |
| 代码块 | 三个反引号包起来，后面写语言名 |
| 引用 | `> 一句话` |

想插入「阅读全文」的分界点，在正文里单独写一行：

```markdown
<!-- more -->
```

首页卡片就只会显示这一行之前的内容。

## 第三步：push

```bash
git add .
git commit -m "新文章：文章标题"
git push
```

GitHub Actions 会自动构建，通常一两分钟后 `https://acsref.github.io` 上就能看到。

## 几个小提醒

- 文件名用英文、短横线分隔，比如 `my-first-anime.md`，中文标题写在 `title:` 里就行
- `date:` 的格式是 `YYYY-MM-DD HH:mm:ss`，写错了文章会跑到很奇怪的位置
- 图片放在 `source/images/` 下，用 `/images/xxx.jpg` 引用
