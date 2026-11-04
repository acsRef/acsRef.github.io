# 星屑ノート

acsRef 的个人博客：Hexo + Butterfly（二次元风格），托管在 GitHub Pages，由 GitHub Actions 自动构建。

- 线上地址：<https://acsref.github.io>
- 源码仓库：<https://github.com/acsRef/acsRef.github.io>

## 换一台电脑怎么改

**不需要装 Node、Hexo 或任何环境。** 仓库里放的就是完整的博客源文件，构建交给 GitHub Actions。

### 方式一：在 GitHub 网页上直接改（最快，手机也行）

1. 打开 <https://github.com/acsRef/acsRef.github.io>
2. 想发新文章：进入 `source/_posts/` → 右上角 **Add file → Create new file**
3. 文件名用英文，例如 `my-new-post.md`
4. 第一段写 front-matter：

```markdown
---
title: 文章标题
date: 2026-11-05 20:00:00
tags:
  - 标签
categories:
  - 分类
description: 首页卡片上显示的一句话
---
```

5. 往下写正文，然后 **Commit changes**
6. 等 1~2 分钟，Actions 跑完，网站自动更新

### 方式二：在另一台电脑上用 git

```powershell
git clone git@github.com:acsRef/acsRef.github.io.git
cd acsRef.github.io
```

改完 `source/_posts/` 里的 Markdown 后：

```powershell
git add .
git commit -m "新文章：xxx"
git push
```

> 那台电脑要有你的 GitHub 账号权限（SSH key 或登录过的凭据）。仓库只存源文件，`node_modules/`、`public/` 都已忽略，不会把依赖提交进去。

### 想在本机预览效果

需要 Node.js 20+，然后：

```powershell
npm install
npx hexo server
```

打开 <http://localhost:4000> 看效果，改文件会自动刷新。预览完 `Ctrl+C` 退出。

只想生成静态文件、不上传：

```powershell
npx hexo clean
npx hexo generate
```

生成结果在 `public/` 里，双击 `public/index.html` 也能看（部分资源用绝对路径，最好还是用 `hexo server`）。

## 发一篇新文章

```powershell
npx hexo new "文章标题"
```

会在 `source/_posts/` 下生成 `年-月-日-文章标题.md`，填好 front-matter 就能写。

首页只显示 `<!-- more -->` 之前的内容；不想截断就不写这一行。

## 目录结构

```
.
├── .github/workflows/deploy.yml   # 自动构建 + 发布
├── _config.yml                    # 站点配置（标题、网址、菜单、搜索）
├── _config.butterfly.yml          # 主题配置（配色、样式、侧边栏、注入）
├── package.json                   # 依赖清单
├── source/
│   ├── _posts/                    # 文章（Markdown）
│   ├── about/                     # 关于页
│   ├── tags/  categories/         # 标签页、分类页
│   ├── css/anime.css              # 自定义二次元样式
│   ├── js/sakura.js               # 樱花瓣飘落
│   └── img/                       # 头像、横幅等图片
└── public/                        # 构建产物（不提交）
```

## 常见改动

| 想改什么 | 改哪里 |
|---|---|
| 博客名字 / 副标题 / 描述 | `_config.yml` 顶部 |
| 菜单、社交图标、头像 | `_config.butterfly.yml` |
| 主题色、背景渐变 | `_config.butterfly.yml` 的 `theme_color` 和 `background` |
| 卡片圆角、阴影、字号 | `source/css/anime.css` |
| 花瓣数量 / 速度 | `source/js/sakura.js` |
| 部署工作流 | `.github/workflows/deploy.yml` |

## 图片放哪

放在 `source/img/` 下，文章里用绝对路径引用：

```markdown
![说明](/img/xxx.png)
```

## 升级主题 / 依赖

```powershell
npm update
npx hexo clean
npx hexo generate
```

自定义样式都写在 `source/css/anime.css` 里（通过注入加载），没有动主题源码，所以升级不会覆盖你的改动。升级后如果某个选择器失效，对照新版页面结构调一下即可。

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| Actions 里 deploy 报 "Pages site not found" | 仓库 Settings → Pages → Source 选 **GitHub Actions**，再重跑 |
| 页面 404 | 仓库名必须是 `acsRef.github.io`，且 Pages 的分支/来源设置正确 |
| 样式没生效 | 浏览器缓存，`Ctrl+F5` 强刷；或本地 `npx hexo clean` 重新生成 |
| 中文标签链接变成 `%E5%85%AC...` | 正常，URL 编码而已 |
| 构建失败 | 看 Actions 日志里的报错行，通常是 Markdown 的 front-matter 写错（比如 `date:` 格式） |

## License

文章内容版权归作者所有；主题 Butterfly 遵循其自身开源协议。
